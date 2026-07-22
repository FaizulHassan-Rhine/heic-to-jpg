/** Format byte limit as MB string without rounding fractions away (e.g. 4.5 stays "4.5"). */
export function formatMaxMb(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "0";
  const mb = Number(bytes) / (1024 * 1024);
  return Number.parseFloat(mb.toFixed(1)).toString();
}

/** Build dropzone footer text: formats + max files + max size. */
export function buildUploadLimitsText({ formats, maxSizeBytes, maxFiles, each = true } = {}) {
  const parts = [];
  if (formats) parts.push(formats);
  if (maxFiles != null && maxFiles !== "") {
    const n = Number(maxFiles);
    parts.push(`Max ${n} file${n === 1 ? "" : "s"}`);
  }
  if (maxSizeBytes != null && maxSizeBytes !== "") {
    parts.push(`Max ${formatMaxMb(maxSizeBytes)}MB${each ? " each" : ""}`);
  }
  return parts.join(" • ");
}
