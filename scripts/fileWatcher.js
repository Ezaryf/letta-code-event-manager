// File Watcher - watches project and analyzes changes with Letta
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
  ".jsx": "react",
  ".ts": "typescript",
  ".tsx": "react-typescript",
  ".json": "config",
  ".css": "styles",
  ".scss": "styles",
};

// Debounce tracking
const pendingAnalysis = new Map();
let isReady = false;

async function analyzeFile(filePath) {
  const ext = path.extname(filePath);
  const analysisType = FILE_ANALYSIS[ext] || "general";
  const relativePath = path.relative(TARGET_REPO, filePath);

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.log(`   ❌ Could not read file`);
    return;
  }

  if (content.length > 10000) {
    console.log(`   ⏭️ Skipping (file too large)`);
    return;
  }

  const prompt = `Analyze this ${analysisType} file that was just modified.

File: ${relativePath}
\`\`\`${ext.slice(1)}
${content}
\`\`\`

Quick review (be brief, 2-3 sentences max):
1. Any bugs or issues?
2. Any security concerns?
3. Quick improvements?

If it looks fine, just say "✓ Looks good"`;

  console.log(`   🤖 Asking Letta...`);

  try {
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";

    console.log(`   📝 ${text.slice(0, 300)}`);

    // Save analysis
    const stamp = dayjs().format("YYYYMMDD_HHmmss");
    const analysisDir = path.join("analysis", stamp);
    fs.mkdirSync(analysisDir, { recursive: true });
    fs.writeFileSync(path.join(analysisDir, "file.txt"), relativePath, "utf8");
    fs.writeFileSync(path.join(analysisDir, "analysis.txt"), text, "utf8");

  } catch (err) {
    console.log(`   ❌ Analysis error: ${err.message}`);
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

// Build watch patterns
const targetNormalized = TARGET_REPO.replace(/\\/g, "/");
let WATCH_PATTERNS;

if (WATCH_ALL) {
  // Watch everything
  WATCH_PATTERNS = [targetNormalized];
} else {
  // Watch specific folders - use simple patterns
  WATCH_PATTERNS = [
    `${targetNormalized}/src`,
    `${targetNormalized}/app`,
    `${targetNormalized}/components`,
    `${targetNormalized}/pages`,
    `${targetNormalized}/lib`,
    `${targetNormalized}/utils`,
    `${targetNormalized}/hooks`,
    `${targetNormalized}/types`,
  ];
}

const IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/*.min.js",
];

console.log("👁️  Letta File Watcher");
console.log("=".repeat(50));
console.log(`Target: ${TARGET_REPO}`);
console.log(`Mode: ${WATCH_ALL ? "ALL files" : "Standard folders"}`);
console.log(`Debounce: ${DEBOUNCE_MS}ms`);
console.log("=".repeat(50));
console.log("");

const watcher = chokidar.watch(WATCH_PATTERNS, {
  ignored: IGNORE,
  ignoreInitial: true,
  usePolling: true,
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
});

watcher.on("ready", () => {
  if (!isReady) {
    isReady = true;
    console.log("🟢 Watcher ready. Edit files in your project to trigger analysis.");
    console.log("   Press Ctrl+C to stop.\n");
  }
});

watcher.on("change", (filePath) => {
  // Filter by extension
  const ext = path.extname(filePath);
  if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) return;
  
  const rel = path.relative(TARGET_REPO, filePath);
  console.log(`\n📝 Changed: ${rel}`);
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;
  
  // Filter by extension
  const ext = path.extname(filePath);
  if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) return;
  
  const rel = path.relative(TARGET_REPO, filePath);
  console.log(`\n➕ Added: ${rel}`);
  scheduleAnalysis(filePath);
});

watcher.on("error", (err) => {
  console.error("❌ Watcher error:", err);
});
