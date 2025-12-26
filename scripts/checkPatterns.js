// Check which files match the watcher patterns
import fs from "fs";
import path from "path";

const TARGET = process.argv[2] || process.env.TARGET_REPO || process.cwd();
const COMMON_FOLDERS = ["src", "app", "components", "pages", "lib", "utils", "hooks", "types"];
const EXTENSIONS = ["js", "jsx", "ts", "tsx"];

console.log("🔍 Pattern Check");
console.log("=".repeat(50));
console.log("Target:", TARGET);
console.log("Looking in folders:", COMMON_FOLDERS.join(", "));
console.log("Extensions:", EXTENSIONS.join(", "));
console.log("=".repeat(50));
console.log("");

let total = 0;

function walkDir(dir, depth = 0) {
  const files = [];
  if (depth > 5) return files;
  
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === "node_modules" || item === ".git" || item === ".next") continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath, depth + 1));
      } else {
        files.push(fullPath);
      }
    }
  } catch (e) {}
  
  return files;
}

for (const folder of COMMON_FOLDERS) {
  const folderPath = path.join(TARGET, folder);
  
  if (!fs.existsSync(folderPath)) {
    console.log(`❌ ${folder}/ - NOT FOUND`);
    continue;
  }
  
  const allFiles = walkDir(folderPath);
  const matchedFiles = allFiles.filter(f => {
    const ext = path.extname(f).slice(1);
    return EXTENSIONS.includes(ext);
  });
  
  if (matchedFiles.length > 0) {
    console.log(`✅ ${folder}/ - ${matchedFiles.length} files`);
    matchedFiles.slice(0, 5).forEach(f => {
      console.log(`   ${path.relative(TARGET, f)}`);
    });
    if (matchedFiles.length > 5) {
      console.log(`   ... and ${matchedFiles.length - 5} more`);
    }
    total += matchedFiles.length;
  } else {
    console.log(`⚠️ ${folder}/ - exists but no matching files`);
  }
}

console.log("");
console.log("=".repeat(50));
console.log(`Total matched files: ${total}`);

if (total === 0) {
  console.log("");
  console.log("⚠️ No files match! The watcher won't see any changes.");
  console.log("   Either your files are in different folders, or use debugWatcher.js");
}
