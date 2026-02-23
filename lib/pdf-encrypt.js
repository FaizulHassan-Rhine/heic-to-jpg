/**
 * Pure JavaScript PDF Encryption
 * Implements PDF Standard Security Handler (V2, R3) with RC4-128
 * Following ISO 32000-1:2008 (PDF 1.7)
 *
 * This replaces the need for external qpdf binary.
 */
const crypto = require("crypto");

// Standard padding string from PDF Reference Table 3.19
const PDF_PADDING = Buffer.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4b, 0x49,
  0x43, 0x4b, 0x53, 0x20, 0x48, 0x6f, 0x6e, 0x65, 0x79, 0x62, 0x65, 0x72,
  0x72, 0x79, 0x20, 0x43, 0x72, 0x65, 0x61, 0x6d,
]);

/**
 * RC4 stream cipher
 */
function rc4(key, data) {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const result = Buffer.alloc(data.length);
  let a = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    a = (a + 1) & 0xff;
    j = (j + s[a]) & 0xff;
    [s[a], s[j]] = [s[j], s[a]];
    result[k] = data[k] ^ s[(s[a] + s[j]) & 0xff];
  }
  return result;
}

/**
 * Pad or truncate password to 32 bytes using standard padding
 */
function padPassword(password) {
  const pwd = Buffer.from(password || "", "latin1");
  const result = Buffer.alloc(32);
  const len = Math.min(pwd.length, 32);
  pwd.copy(result, 0, 0, len);
  if (len < 32) {
    PDF_PADDING.copy(result, len, 0, 32 - len);
  }
  return result;
}

/**
 * Algorithm 3: Computing the O (owner password) value
 */
function computeOwnerHash(ownerPwd, userPwd) {
  const paddedOwner = padPassword(ownerPwd);
  let hash = crypto.createHash("md5").update(paddedOwner).digest();
  // Revision 3: 50 rounds of MD5
  for (let i = 0; i < 50; i++) {
    hash = crypto.createHash("md5").update(hash).digest();
  }
  const key = hash.subarray(0, 16); // 128-bit
  let result = rc4(key, padPassword(userPwd));
  // Revision 3: 19 additional RC4 passes
  for (let i = 1; i <= 19; i++) {
    const modKey = Buffer.alloc(16);
    for (let j = 0; j < 16; j++) modKey[j] = key[j] ^ i;
    result = rc4(modKey, result);
  }
  return result;
}

/**
 * Algorithm 2: Computing the encryption key
 */
function computeEncryptionKey(userPwd, O, P, fileId) {
  const md5 = crypto.createHash("md5");
  md5.update(padPassword(userPwd));
  md5.update(O);
  const pBuf = Buffer.alloc(4);
  pBuf.writeInt32LE(P);
  md5.update(pBuf);
  md5.update(fileId);
  // EncryptMetadata = false → append 0xFFFFFFFF
  md5.update(Buffer.from([0xff, 0xff, 0xff, 0xff]));
  let hash = md5.digest();
  // Revision 3: 50 rounds of MD5
  for (let i = 0; i < 50; i++) {
    hash = crypto.createHash("md5").update(hash.subarray(0, 16)).digest();
  }
  return hash.subarray(0, 16);
}

/**
 * Algorithm 5: Computing the U (user password) value for Revision 3
 */
function computeUserHash(encKey, fileId) {
  const md5 = crypto.createHash("md5");
  md5.update(PDF_PADDING);
  md5.update(fileId);
  let hash = md5.digest();
  let result = rc4(encKey, hash);
  for (let i = 1; i <= 19; i++) {
    const modKey = Buffer.alloc(16);
    for (let j = 0; j < 16; j++) modKey[j] = encKey[j] ^ i;
    result = rc4(modKey, result);
  }
  // Pad to 32 bytes
  const padded = Buffer.alloc(32);
  result.copy(padded, 0, 0, Math.min(result.length, 16));
  return padded;
}

/**
 * Compute object-specific encryption key (Algorithm 1)
 */
function computeObjectKey(encKey, objNum, genNum) {
  const md5 = crypto.createHash("md5");
  md5.update(encKey);
  const numBuf = Buffer.alloc(5);
  numBuf[0] = objNum & 0xff;
  numBuf[1] = (objNum >> 8) & 0xff;
  numBuf[2] = (objNum >> 16) & 0xff;
  numBuf[3] = genNum & 0xff;
  numBuf[4] = (genNum >> 8) & 0xff;
  md5.update(numBuf);
  const hash = md5.digest();
  return hash.subarray(0, Math.min(encKey.length + 5, 16));
}

/**
 * Compute permissions integer from options
 * PDF Reference Table 3.20
 */
function computePermissions(opts = {}) {
  // Start with bits 7,8 set and bits 13-32 set (required by spec)
  let P = -3392; // 0xFFFFF2C0

  if (opts.printing) {
    P |= 0x0004; // bit 3: Print
    P |= 0x0800; // bit 12: High quality print
  }
  if (opts.modifying) P |= 0x0008; // bit 4: Modify
  if (opts.copying) P |= 0x0010; // bit 5: Copy/Extract
  if (opts.annotating) P |= 0x0020; // bit 6: Annotations
  if (opts.fillingForms) P |= 0x0100; // bit 9: Fill forms
  if (opts.contentAccessibility) P |= 0x0200; // bit 10: Accessibility
  if (opts.assembling) P |= 0x0400; // bit 11: Assemble

  return P;
}

/**
 * Find all stream boundaries in a PDF buffer
 * Returns array of { objNum, genNum, streamStart, streamEnd }
 */
function findStreams(buf) {
  const str = buf.toString("latin1");
  const streams = [];

  // Find all objects
  const objRegex = /(\d+)\s+(\d+)\s+obj[\s\r\n]/g;
  let match;

  while ((match = objRegex.exec(str)) !== null) {
    const objNum = parseInt(match[1]);
    const genNum = parseInt(match[2]);
    const objContentStart = match.index + match[0].length;

    // Find endobj for this object
    const endObjIdx = str.indexOf("endobj", objContentStart);
    if (endObjIdx === -1) continue;

    const objContent = str.substring(objContentStart, endObjIdx);

    // Look for stream within this object
    // Stream keyword must appear after >> (end of dictionary)
    let streamStart = -1;

    // Find "stream" followed by EOL
    const streamPatterns = [
      { pattern: "stream\r\n", len: 8 },
      { pattern: "stream\n", len: 7 },
    ];

    for (const { pattern, len } of streamPatterns) {
      const idx = objContent.indexOf(pattern);
      if (idx !== -1) {
        streamStart = objContentStart + idx + len;
        break;
      }
    }

    if (streamStart === -1) continue;

    // Get stream length from /Length in the dictionary
    const dictPart = objContent.substring(
      0,
      objContent.indexOf("stream")
    );
    const lengthMatch = dictPart.match(/\/Length\s+(\d+)/);

    let streamEnd;
    if (lengthMatch) {
      streamEnd = streamStart + parseInt(lengthMatch[1]);
    } else {
      // Fallback: search for endstream
      const endStreamIdx = str.indexOf("endstream", streamStart);
      if (endStreamIdx === -1) continue;
      streamEnd = endStreamIdx;
      // Trim trailing EOL
      if (buf[streamEnd - 1] === 0x0a) streamEnd--;
      if (buf[streamEnd - 1] === 0x0d) streamEnd--;
    }

    streams.push({ objNum, genNum, streamStart, streamEnd });
  }

  return streams;
}

/**
 * Find string literals in PDF dictionaries and encrypt them
 * This handles (string) format - not hex <string> format
 */
function encryptStringsInObject(buf, start, end, objKey) {
  // We only encrypt string literals: (text) and hex strings: <hex>
  // Names (/Name) are NOT encrypted
  // We need to be careful not to encrypt inside streams
  // This function works on the dictionary part only (before 'stream' keyword)

  const str = buf.toString("latin1", start, end);

  // Find the end of dictionary (>>) or start of stream
  const streamIdx = str.indexOf("stream");
  const dictEnd = streamIdx !== -1 ? streamIdx : str.length;
  const dictStr = str.substring(0, dictEnd);

  // Find and encrypt parenthesized strings
  let i = 0;
  while (i < dictStr.length) {
    if (dictStr[i] === "(") {
      // Found start of string literal
      const strStart = i;
      let depth = 1;
      i++;
      while (i < dictStr.length && depth > 0) {
        if (dictStr[i] === "\\") {
          i += 2; // skip escaped character
          continue;
        }
        if (dictStr[i] === "(") depth++;
        if (dictStr[i] === ")") depth--;
        i++;
      }
      const strEnd = i;

      // Extract string content (without parentheses)
      const strContent = buf.subarray(start + strStart + 1, start + strEnd - 1);
      if (strContent.length > 0) {
        const encrypted = rc4(objKey, strContent);
        encrypted.copy(buf, start + strStart + 1);
      }
    } else if (dictStr[i] === "<" && dictStr[i + 1] !== "<") {
      // Hex string <...>
      const hexStart = i + 1;
      const hexEnd = dictStr.indexOf(">", hexStart);
      if (hexEnd !== -1) {
        const hexStr = dictStr.substring(hexStart, hexEnd);
        if (hexStr.length > 0 && /^[0-9A-Fa-f\s]+$/.test(hexStr)) {
          const hexClean = hexStr.replace(/\s/g, "");
          if (hexClean.length > 0) {
            const strBytes = Buffer.from(hexClean, "hex");
            const encrypted = rc4(objKey, strBytes);
            const newHex = encrypted.toString("hex").toUpperCase();
            // Write back - hex strings maintain same byte length when encrypted
            const newHexBuf = Buffer.from(newHex, "latin1");
            if (newHexBuf.length === hexClean.length) {
              newHexBuf.copy(buf, start + hexStart);
            }
          }
        }
        i = hexEnd + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
}

/**
 * Main function: Encrypt a PDF buffer with password protection
 *
 * @param {Buffer} pdfBuffer - Unencrypted PDF bytes
 * @param {object} options - Encryption options
 * @param {string} options.userPassword - Password to open PDF (can be empty for owner-only)
 * @param {string} options.ownerPassword - Owner password for full access
 * @param {object} options.permissions - Permission flags
 * @returns {Buffer} Encrypted PDF bytes
 */
function encryptPDF(pdfBuffer, options = {}) {
  const {
    userPassword = "",
    ownerPassword = "",
    permissions = {},
  } = options;

  const effectiveOwnerPwd = ownerPassword || userPassword;

  // Work with a copy
  const buf = Buffer.from(pdfBuffer);
  const pdfStr = buf.toString("latin1");

  // 1. Extract or generate file ID
  let fileId;
  const idMatch = pdfStr.match(/\/ID\s*\[\s*<([0-9A-Fa-f]+)>/);
  if (idMatch) {
    fileId = Buffer.from(idMatch[1], "hex");
  } else {
    fileId = crypto.randomBytes(16);
  }

  // 2. Compute encryption parameters
  const P = computePermissions(permissions);
  const O = computeOwnerHash(effectiveOwnerPwd, userPassword);
  const encKey = computeEncryptionKey(userPassword, O, P, fileId);
  const U = computeUserHash(encKey, fileId);

  // 3. Find and encrypt all streams
  const streams = findStreams(buf);
  for (const { objNum, genNum, streamStart, streamEnd } of streams) {
    const objKey = computeObjectKey(encKey, objNum, genNum);
    const streamData = buf.subarray(streamStart, streamEnd);
    const encrypted = rc4(objKey, streamData);
    encrypted.copy(buf, streamStart);
  }

  // 4. Find and encrypt string literals in dictionaries
  const objRegex = /(\d+)\s+(\d+)\s+obj[\s\r\n]/g;
  let objMatch;
  while ((objMatch = objRegex.exec(pdfStr)) !== null) {
    const objNum = parseInt(objMatch[1]);
    const genNum = parseInt(objMatch[2]);
    const objStart = objMatch.index + objMatch[0].length;
    const endObjIdx = pdfStr.indexOf("endobj", objStart);
    if (endObjIdx === -1) continue;

    const objKey = computeObjectKey(encKey, objNum, genNum);
    encryptStringsInObject(buf, objStart, endObjIdx, objKey);
  }

  // 5. Find the xref/trailer section to replace
  // Look for "xref" keyword or cross-reference stream
  let xrefStartPos = -1;
  const startxrefMatch = pdfStr.match(/startxref\s+(\d+)\s+%%EOF\s*$/);

  if (startxrefMatch) {
    const xrefTableOffset = parseInt(startxrefMatch[1]);
    // Check if it's a traditional xref table or xref stream
    const atOffset = pdfStr.substring(xrefTableOffset, xrefTableOffset + 10);
    if (atOffset.startsWith("xref")) {
      xrefStartPos = xrefTableOffset;
    } else {
      // Cross-reference stream - find the last xref keyword
      xrefStartPos = pdfStr.lastIndexOf("\nxref\n");
      if (xrefStartPos !== -1) {
        xrefStartPos += 1; // skip the leading \n
      } else {
        xrefStartPos = pdfStr.lastIndexOf("xref\n");
      }
    }
  }

  if (xrefStartPos === -1) {
    // Fallback: search for the last "xref" in the file
    const lastXref = pdfStr.lastIndexOf("xref");
    if (lastXref !== -1) {
      xrefStartPos = lastXref;
    } else {
      throw new Error("Cannot find xref table in PDF");
    }
  }

  // 6. Collect all object offsets from the original xref
  const objectOffsets = new Map();

  // Parse existing xref table
  const xrefSection = pdfStr.substring(xrefStartPos);
  const xrefLines = xrefSection.split(/\r?\n/);
  let currentObjNum = 0;

  for (let i = 1; i < xrefLines.length; i++) {
    const line = xrefLines[i].trim();
    if (line === "" || line.startsWith("trailer")) break;

    // Subsection header: startObj count
    const subsectionMatch = line.match(/^(\d+)\s+(\d+)$/);
    if (subsectionMatch) {
      currentObjNum = parseInt(subsectionMatch[1]);
      continue;
    }

    // Entry: offset generation f/n
    const entryMatch = line.match(/^(\d{10})\s+(\d{5})\s+([fn])\s*$/);
    if (entryMatch) {
      if (entryMatch[3] === "n") {
        objectOffsets.set(currentObjNum, parseInt(entryMatch[1]));
      }
      currentObjNum++;
    }
  }

  // 7. Determine max object number and create Encrypt object
  let maxObjNum = 0;
  for (const num of objectOffsets.keys()) {
    if (num > maxObjNum) maxObjNum = num;
  }
  const encryptObjNum = maxObjNum + 1;

  // 8. Build the replacement tail (from xrefStartPos onwards)
  const pdfBody = buf.subarray(0, xrefStartPos);

  // Create Encrypt dictionary object
  const oHex = O.toString("hex").toUpperCase();
  const uHex = U.toString("hex").toUpperCase();
  const fileIdHex = fileId.toString("hex").toUpperCase();

  const encryptObjStr = [
    `${encryptObjNum} 0 obj`,
    `<<`,
    `/Type /Encrypt`,
    `/Filter /Standard`,
    `/V 2`,
    `/R 3`,
    `/Length 128`,
    `/P ${P}`,
    `/O <${oHex}>`,
    `/U <${uHex}>`,
    `/EncryptMetadata false`,
    `>>`,
    `endobj`,
    "",
  ].join("\n");

  const encryptObjBuf = Buffer.from(encryptObjStr, "latin1");
  const encryptObjOffset = pdfBody.length;

  objectOffsets.set(encryptObjNum, encryptObjOffset);

  // 9. Build new xref table
  const totalObjects = encryptObjNum + 1;
  let xrefStr = `xref\n0 ${totalObjects}\n`;
  xrefStr += "0000000000 65535 f \r\n";

  for (let n = 1; n < totalObjects; n++) {
    const offset = objectOffsets.get(n);
    if (offset !== undefined) {
      xrefStr += `${String(offset).padStart(10, "0")} 00000 n \r\n`;
    } else {
      xrefStr += "0000000000 00000 f \r\n";
    }
  }

  // 10. Build trailer
  const rootMatch = pdfStr.match(/\/Root\s+(\d+\s+\d+\s+R)/);
  const infoMatch = pdfStr.match(/\/Info\s+(\d+\s+\d+\s+R)/);

  const newXrefOffset = pdfBody.length + encryptObjBuf.length;

  let trailerStr = "trailer\n<<\n";
  trailerStr += `/Size ${totalObjects}\n`;
  if (rootMatch) trailerStr += `/Root ${rootMatch[1]}\n`;
  if (infoMatch) trailerStr += `/Info ${infoMatch[1]}\n`;
  trailerStr += `/Encrypt ${encryptObjNum} 0 R\n`;
  trailerStr += `/ID [<${fileIdHex}> <${fileIdHex}>]\n`;
  trailerStr += ">>\n";
  trailerStr += `startxref\n${newXrefOffset}\n%%EOF\n`;

  const tailBuf = Buffer.from(xrefStr + trailerStr, "latin1");

  // 11. Concatenate
  return Buffer.concat([pdfBody, encryptObjBuf, tailBuf]);
}

module.exports = { encryptPDF };

