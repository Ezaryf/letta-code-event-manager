// File Watcher - watches project and analyzes changes with Letta
// Uses EchoHarbor agent for all analysis
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

// Get target from CLI or env
const TARGET_REPO = process.argv[2] 
  ? path.resolve(process.argv[2])
  : (process.env.TARGET_REPO || process.cwd());

const DEBOUNCE_MS = parseInt(process.env.WATCHER_DEBOUNCE || "2000", 10);
const WATCH_ALL = process.argv.includes("--all") || process.env.WATCH_ALL === "true";

if (!agentId) {
  console.error("❌ No agent ID found. Run: npm run create-agent");
  process.exit(1);
}

if (!fs.existsSync(TARGET_REPO)) {
  console.error(`❌ Target not found: ${TARGET_REPO}`);
  process.exit(1);
}

// File type mapping
const FILE_ANALYSIS = {
  ".js": "javascript",
  ".jsx": "react component",
  ".ts": "typescript",
  ".tsx": "react typescript component",
  ".json": "configuration",
  ".css": "stylesheet",
  ".scss": "sass stylesheet",
};

// Debounce tracking
const pendingAnalysis = new Map();
let isReady = false;
let analysisCount = 0;

async function analyzeFile(filePath) {
  const ext = path.extname(filePath);
  const analysisType = FILE_ANALYSIS[ext] || "code";
  const relativePath = path.relative(TARGET_REPO, filePath);

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.log(`   ❌ Could not read file`);
    return;
  }

  if (content.length > 8000) {
    console.log(`   ⏭️ Skipping (file too large: ${content.length} chars)`);
    return;
  }

  // Optimized prompt for quick analysis
  const prompt = `Analyze this ${analysisType} file. Be brief (2-3 sentences max).

File: ${relativePath}
\`\`\`${ext.slice(1)}
${content}
\`\`\`

Check for:
1. Bugs or issues
2. Security concerns  
3. Quick improvements

If fine, say "✓ Looks good"`;

  console.log(`   🤖 Analyzing with EchoHarbor...`);

  try {
    const startTime = Date.now();
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
    const shortText = text.length > 300 ? text.slice(0, 300) + "..." : text;

    console.log(`   📝 [${duration}s] ${shortText}`);

    // Save analysis
    analysisCount++;
    const stamp = dayjs().format("YYYYMMDD_HHmmss");
    const analysisDir = path.join("analysis", stamp);
    fs.mkdirSync(analysisDir, { recursive: true });
    fs.writeFileSync(path.join(analysisDir, "file.txt"), relativePath, "utf8");
    fs.writeFileSync(path.join(analysisDir, "analysis.txt"), text, "utf8");
    fs.writeFileSync(path.join(analysisDir, "content.txt"), content, "utf8");

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
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

// Build watch patterns - check which folders actually exist
const targetNormalized = TARGET_REPO.replace(/\\/g, "/");
const POSSIBLE_FOLDERS = ["src", "app", "components", "pages", "lib", "utils", "hooks", "types"];
let WATCH_PATTERNS = [];

if (WATCH_ALL) {
  WATCH_PATTERNS = [targetNormalized];
} else {
  for (const folder of POSSIBLE_FOLDERS) {
    const fullPath = path.join(TARGET_REPO, folder);
    if (fs.existsSync(fullPath)) {
      WATCH_PATTERNS.push(fullPath.replace(/\\/g, "/"));
    }
  }
  // If no standard folders found, watch the project root
  if (WATCH_PATTERNS.length === 0) {
    WATCH_PATTERNS = [targetNormalized];
  }
}

const IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/*.min.js",
];

const VALID_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

console.log("👁️  Letta File Watcher (EchoHarbor)");
console.log("=".repeat(50));
console.log(`Target: ${TARGET_REPO}`);
console.log(`Agent: EchoHarbor (${agentId.slice(0, 20)}...)`);
console.log(`Mode: ${WATCH_ALL ? "ALL files" : "Standard folders"}`);
console.log(`Watching: ${WATCH_PATTERNS.length} folder(s)`);
console.log(`Debounce: ${DEBOUNCE_MS}ms`);
console.log("=".repeat(50));
console.log("");

// Show watched folders
console.log("📁 Watched folders:");
WATCH_PATTERNS.forEach(p => console.log(`   - ${path.relative(TARGET_REPO, p) || "."}`));
console.log("");

const watcher = chokidar.watch(WATCH_PATTERNS, {
  ignored: IGNORE,
  ignoreInitial: true,
  persistent: true,
  usePolling: true,
  interval: 300,
  binaryInterval: 300,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  depth: 10,
});

watcher.on("ready", () => {
  if (!isReady) {
    isReady = true;
    console.log("🟢 Watcher ready. Edit files to trigger analysis.");
    console.log("   Press Ctrl+C to stop.\n");
  }
});

watcher.on("change", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(TARGET_REPO, filePath);
  console.log(`\n📝 Changed: ${rel}`);
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;
  
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(TARGET_REPO, filePath);
  console.log(`\n➕ Added: ${rel}`);
  scheduleAnalysis(filePath);
});

watcher.on("error", (err) => {
  console.error("❌ Watcher error:", err);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n\n📊 Session stats: ${analysisCount} files analyzed`);
  console.log("👋 Watcher stopped.");
  process.exit(0);
});
