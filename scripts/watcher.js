import chokidar from "chokidar";
import path from "path";
import { dispatch } from "./dispatcher.js";
import dotenv from "dotenv";

dotenv.config();

// Use TARGET_REPO env var to watch another repo (otherwise defaults to current CodeMind repo)
const TARGET_REPO = process.env.TARGET_REPO || process.cwd();

// Patterns relative to TARGET_REPO to watch for events
const WATCH_PATHS = [
  path.join(TARGET_REPO, "tests", "*.test.js"),
  path.join(TARGET_REPO, "src", "**", "*.js"),
  path.join(TARGET_REPO, "src", "**", "*.jsx"),
  path.join(TARGET_REPO, "ci", "*.json"),
  path.join(TARGET_REPO, "logs", "errors.log"),
  "events/*.log",  // Also watch local events folder
  "signals/*.json"
];

console.log("CodeMind watcher starting...");
console.log("Target repo:", TARGET_REPO);
console.log("Watching paths:");
WATCH_PATHS.forEach(p => console.log("  ", p));

const watcher = chokidar.watch(WATCH_PATHS, { 
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
});

watcher.on("change", async (filePath) => {
  console.log("Detected change:", filePath);
  try {
    const suggestionDir = await dispatch(filePath, TARGET_REPO);
    if (suggestionDir) {
      console.log(
        "Suggestion placed at:",
        suggestionDir,
        "— review before applying."
      );
    }
  } catch (e) {
    console.error("Watcher error:", e);
  }
});

watcher.on("add", async (filePath) => {
  console.log("New event file:", filePath);
  try {
    await dispatch(filePath, TARGET_REPO);
  } catch (e) {
    console.error("Watcher add error:", e);
  }
});

console.log("");
console.log("Watcher running. Press Ctrl+C to stop.");
console.log("Now edit files in your project or drop .log files into events/ folder.");
