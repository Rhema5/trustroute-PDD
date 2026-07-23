import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const shellPath = path.join(__dirname, "dist", "client", "_shell.html");
const indexPath = path.join(__dirname, "dist", "client", "index.html");
const redirectsPath = path.join(__dirname, "dist", "client", "_redirects");

try {
  // 1. Copy _shell.html to index.html
  if (fs.existsSync(shellPath)) {
    fs.copyFileSync(shellPath, indexPath);
    console.log("Successfully copied _shell.html to index.html");
  } else {
    console.warn("Warning: _shell.html not found!");
  }

  // 2. Create _redirects file for SPA client-side routing fallback
  fs.writeFileSync(redirectsPath, "/* /index.html 200\n");
  console.log("Successfully created _redirects file");
} catch (err) {
  console.error("Error in post-build script:", err);
  process.exit(1);
}
