// scripts/dispatch-cli.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dispatch } from "./dispatcher.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error("Usage: node scripts/dispatch-cli.js <event-file-path> [repo-root]");
    process.exit(1);
  }

  const eventPath = path.resolve(args[0]);
  const repoRoot = args[1] ? path.resolve(args[1]) : process.cwd();

  if (!fs.existsSync(eventPath)) {
    console.error("Event file not found:", eventPath);
    process.exit(2);
  }

  console.log("Dispatching event:", eventPath);
  console.log("Target repo root:", repoRoot);

  try {
    const outdir = await dispatch(eventPath, repoRoot);
    console.log("Dispatch complete. Suggestion saved to:", outdir);
    process.exit(0);
  } catch (err) {
    console.error("Dispatch error:", err);
    process.exit(3);
  }
}

main();
