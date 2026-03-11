const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDst = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standaloneDir, "public");

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

if (!fs.existsSync(standaloneDir)) {
  console.error("Run 'npm run build' first. .next/standalone not found.");
  process.exit(1);
}

copyRecursive(staticSrc, staticDst);
copyRecursive(publicSrc, publicDst);
console.log("Standalone prepared: .next/static and public copied.");
