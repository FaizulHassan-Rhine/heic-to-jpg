const fs = require("fs");
const path = require("path");

const pagesDir = path.join(__dirname, "..", "pages");
const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".js") && !f.startsWith("_"));
let count = 0;

for (const file of files) {
  const fp = path.join(pagesDir, file);
  let content = fs.readFileSync(fp, "utf8");
  if (!content.includes("import SEO from")) continue;

  content = content.replace(/^import SEO from ["']\.\.\/components\/SEO["'];?\r?\n/m, "");
  content = content.replace(/\s*<SEO[\s\S]*?\/>\r?\n/, "\n");

  fs.writeFileSync(fp, content);
  count++;
  console.log("Updated:", file);
}

console.log("Total:", count);
