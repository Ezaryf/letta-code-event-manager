// Debug watcher - watches EVERYTHING in target folder
import chokidar from "chokidar";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TARGET = process.argv[2] || process.env.TARGET_REPO || process.cwd();

console.log("🔍 DEBUG WATCHER");
console.log("=".repeat(50));
console.log("Watching:", TARGET);
console.log("This watches ALL files (not filtered)");
console.log("=".repeat(50));
console.log("");

const watcher = chokidar.watch(TARGET, {
  ignored: /node_modules|\.git|\.next|dist|build/,
  ignoreInitial: true,
  usePolling: true,
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
});

watcher.on("ready", () => {
  console.log("🟢 Debug watcher ready. Edit any file in your project...\n");
});

watcher.on("add", (p) => {
  console.log("➕ ADDED:", path.relative(TARGET, p));
});

watcher.on("change", (p) => {
  console.log("📝 CHANGED:", path.relative(TARGET, p));
});

watcher.on("unlink", (p) => {
  console.log("🗑️ REMOVED:", path.relative(TARGET, p));
});

watcher.on("error", (e) => {
  console.error("❌ WATCH ERROR:", e);
});
