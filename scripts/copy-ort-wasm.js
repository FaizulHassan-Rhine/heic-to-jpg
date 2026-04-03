/**
 * Copy ONNX Runtime WASM / worker chunks into /public so the non-bundled
 * onnxruntime-web build (see onnxruntime-web-use-extern-wasm) can fetch them at runtime.
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "node_modules", "onnxruntime-web", "dist");
const destDir = path.join(__dirname, "..", "public", "onnxruntime-web");

if (!fs.existsSync(srcDir)) {
  console.warn("[copy-ort-wasm] onnxruntime-web dist not found, skip.");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter(
  (f) => f.startsWith("ort-wasm") && (f.endsWith(".wasm") || f.endsWith(".mjs"))
);

for (const f of files) {
  fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
}

console.log(`[copy-ort-wasm] Copied ${files.length} file(s) to public/onnxruntime-web/`);
