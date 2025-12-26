// E. File Watcher Automation - DYNAMIC VERSION
// Usage: node scripts/fileWatcher.js <path-to-project>
// Example: node scripts/fileWatcher.js ../my-project
import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";

dotenv.config();

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

const agentId = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;

// Get target from CLI argument, env var, or default to current directory
const TARGET_ARG = process.argv[2];
const TARGET_REPO = TARGET_ARG 
  ? path.resolve(TARGET_ARG)
  : (process.env.TARGET_REPO || process.cwd());

const DEBOUNCE_MS = parseInt(process.env.WATCHER_DEBOUNCE || "2000", 10);

if (!agentId) {
  console.error("No agent ID found. Run: npm run create-agent");
  process.exit(1);
}

if (!fs.existsSync(TARGET_REPO)) {
  console.error(`Target directory not found: ${TARGET_REPO}`);
  console.error("Usage: node scripts/fileWatcher.js <path-to-project>");
  process.exit(1);
}

// File type to analysis type mapping
const FILE_ANALYSIS = {
  ".js": "javascript",
  ".jsx": "react",
  ".ts": "typescript",
  ".tsx": "react-typescript",
  ".json": "config",
  ".css": "styles",
  ".scss": "styles",
  ".md": "documentation",
};

// Debounce tracking
const pendingAnalysis = new Map();

async function analyzeFile(filePath) {
  const ext = path.extname(filePath);
  const analysisType = FILE_ANALYSIS[ext] || "general";
  const relativePath = path.relative(TARGET_REPO, filePath);

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.log(`Could not read ${filePath}`);
    return;
  }

  // Skip large files
  if (content.length > 10000) {
    console.log(`Skipping ${relativePath} (too large)`);
    return;
  }

  const prompt = `You are watching a ${analysisType} file that was just modified.
File: ${relativePath}
Content:
\`\`\`${ext.slice(1)}
${content}
\`\`\`

Quick analysis (be brief):
1. Any obvious bugs or issues?
2. Any security concerns?
3. Any quick improvements?

If everything looks fine, just say "Looks good ✓"`;

  console.log(`\n🔍 Analyzing: ${relativePath}`);

  try {
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";

    console.log(`📝 ${text.slice(0, 500)}`);

    // Save analysis
    const stamp = dayjs().format("YYYYMMDD_HHmmss");
    const analysisDir = path.join("analysis", stamp);
    fs.mkdirSync(analysisDir, { recursive: true });
    fs.writeFileSync(path.join(analysisDir, "file.txt"), relativePath, "utf8");
    fs.writeFileSync(path.join(analysisDir, "analysis.txt"), text, "utf8");

  } catch (err) {
    console.error(`Analysis error: ${err.message}`);
  }
}

function scheduleAnalysis(filePath) {
  if (pendingAnalysis.has(filePath)) {
    clearTimeout(pendingAnalysis.get(filePath));
  }

  const timeout = setTimeout(() => {
    pendingAnalysis.delete(filePath);
    analyzeFile(filePath);
  }, DEBOUNCE_MS);

  pendingAnalysis.set(filePath, timeout);
}

// Build watch patterns dynamically based on target
const targetNormalized = TARGET_REPO.replace(/\\/g, "/");
const COMMON_FOLDERS = ["src", "app", "components", "pages", "lib", "utils", "hooks", "types"];
const EXTENSIONS = ["js", "jsx", "ts", "tsx"];

const WATCH_PATTERNS = [];
for (const folder of COMMON_FOLDERS) {
  for (const ext of EXTENSIONS) {
    WATCH_PATTERNS.push(`${targetNormalized}/${folder}/**/*.${ext}`);
  }
}

// Ignore patterns
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/*.min.js",
  "**/*.bundle.js",
];

console.log("👁️  Letta File Watcher");
console.log("=".repeat(50));
console.log(`Target Project: ${TARGET_REPO}`);
console.log(`Debounce: ${DEBOUNCE_MS}ms`);
console.log(`Watching: ${COMMON_FOLDERS.join(", ")}`);
console.log(`Extensions: ${EXTENSIONS.join(", ")}`);
console.log("=".repeat(50));
console.log("");

const watcher = chokidar.watch(WATCH_PATTERNS, {
  ignored: IGNORE_PATTERNS,
  ignoreInitial: true,
  usePolling: true,
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
});

watcher.on("ready", () => {
  console.log("🟢 Watcher ready. Edit files in your project to trigger analysis.");
  console.log("   Press Ctrl+C to stop.\n");
});

watcher.on("change", (filePath) => {
  console.log(`📁 Changed: ${path.relative(TARGET_REPO, filePath)}`);
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  console.log(`➕ Added: ${path.relative(TARGET_REPO, filePath)}`);
  scheduleAnalysis(filePath);
});

watcher.on("error", (err) => {
  console.error("Watcher error:", err);
});
