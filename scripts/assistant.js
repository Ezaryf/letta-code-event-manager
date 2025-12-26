// Letta Coding Assistant - All-in-one helper for developers
// Watches code → Analyzes → Suggests fixes → Auto-fixes → Generates commits
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

// Get project path from CLI
const PROJECT_PATH = process.argv[2] ? path.resolve(process.argv[2]) : null;
const AUTO_FIX = process.argv.includes("--auto-fix");
const AUTO_COMMIT = process.argv.includes("--auto-commit");

if (!agentId) {
  console.error("❌ No agent. Run: npm run setup");
  process.exit(1);
}

if (!PROJECT_PATH) {
  console.log(`
🤖 Letta Coding Assistant
==========================

Usage:
  npm run assist <project-path> [options]

Options:
  --auto-fix     Automatically apply suggested fixes
  --auto-commit  Auto-generate commit messages after fixes

Examples:
  npm run assist ../my-project
  npm run assist "C:\\Projects\\my-app" --auto-fix
  npm run assist . --auto-fix --auto-commit
`);
  process.exit(0);
}

if (!fs.existsSync(PROJECT_PATH)) {
  console.error(`❌ Project not found: ${PROJECT_PATH}`);
  process.exit(1);
}

// State tracking
const pendingAnalysis = new Map();
const changedFiles = new Set();
let isReady = false;
let sessionStats = { analyzed: 0, issues: 0, fixed: 0 };

// Ask Letta for analysis
async function analyzeCode(filePath, content, truncated = false) {
  const ext = path.extname(filePath);
  const relativePath = path.relative(PROJECT_PATH, filePath);

  const truncateNote = truncated ? "\n(Note: File was truncated for analysis - showing first portion only)" : "";

  const prompt = `Analyze this code file for a developer.

File: ${relativePath}${truncateNote}
\`\`\`${ext.slice(1)}
${content.slice(0, 12000)}
\`\`\`

Respond with JSON only:
{
  "status": "ok" or "issues_found",
  "issues": [{"type": "bug|security|style|performance", "line": 0, "description": "..."}],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "fix_available": true/false,
  "fix_code": "corrected code if fix_available is true, otherwise empty string"
}`;

  const response = await client.agents.messages.create(agentId, { input: prompt });
  const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {}
  
  return { status: "ok", issues: [], suggestions: [], fix_available: false };
}

// Generate commit message
async function generateCommitMessage(files) {
  const fileList = Array.from(files).join(", ");
  const date = dayjs().format("DDMMYY");
  
  const prompt = `Generate a git commit message for these changed files: ${fileList}

Rules:
- Format: ${date} - <short description>
- Keep it under 50 characters
- Be specific about what changed

Respond with ONLY the commit message, nothing else.`;

  const response = await client.agents.messages.create(agentId, { input: prompt });
  const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
  
  // Ensure format
  let message = text.trim().split("\n")[0];
  if (!message.startsWith(date)) {
    message = `${date} - ${message}`;
  }
  
  return message;
}

// Apply fix to file
function applyFix(filePath, fixCode) {
  try {
    // Create backup in .letta-backups folder
    const relativePath = path.relative(PROJECT_PATH, filePath);
    const backupDir = path.join(PROJECT_PATH, ".letta-backups", path.dirname(relativePath));
    const timestamp = dayjs().format("YYYYMMDD_HHmmss");
    const backupName = `${path.basename(filePath)}.${timestamp}.backup`;
    const backupPath = path.join(backupDir, backupName);
    
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(filePath, backupPath);
    
    // Ensure .letta-backups is gitignored
    const gitignorePath = path.join(PROJECT_PATH, ".gitignore");
    let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
    if (!gitignore.includes(".letta-backups")) {
      fs.appendFileSync(gitignorePath, "\n# Letta assistant backups\n.letta-backups/\n");
      console.log(`   📝 Added .letta-backups to .gitignore`);
    }
    
    // Apply fix
    fs.writeFileSync(filePath, fixCode, "utf8");
    
    console.log(`   ✅ Fix applied (backup: .letta-backups/${relativePath})`);
    return true;
  } catch (err) {
    console.log(`   ❌ Could not apply fix: ${err.message}`);
    return false;
  }
}

// Process a file change
async function processFile(filePath) {
  const relativePath = path.relative(PROJECT_PATH, filePath);
  
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return;
  }

  // For large files, truncate but still analyze
  const MAX_CONTENT = 15000;
  let truncated = false;
  if (content.length > MAX_CONTENT) {
    content = content.slice(0, MAX_CONTENT);
    truncated = true;
    console.log(`   📄 Large file (${Math.round(content.length/1000)}k chars) - analyzing first portion...`);
  }

  console.log(`   🔍 Analyzing...`);
  sessionStats.analyzed++;

  try {
    const result = await analyzeCode(filePath, content, truncated);
    
    if (result.status === "ok" && result.issues.length === 0) {
      console.log(`   ✓ Looks good!`);
    } else {
      sessionStats.issues += result.issues.length;
      
      // Show issues
      for (const issue of result.issues) {
        const icon = issue.type === "bug" ? "🐛" : 
                     issue.type === "security" ? "🔒" : 
                     issue.type === "performance" ? "⚡" : "💡";
        console.log(`   ${icon} ${issue.type}: ${issue.description}`);
      }
      
      // Show suggestions
      if (result.suggestions.length > 0) {
        console.log(`   💡 Suggestions:`);
        result.suggestions.slice(0, 2).forEach(s => console.log(`      - ${s}`));
      }
      
      // Auto-fix if enabled
      if (AUTO_FIX && result.fix_available && result.fix_code) {
        console.log(`   🔧 Auto-fixing...`);
        if (applyFix(filePath, result.fix_code)) {
          sessionStats.fixed++;
          changedFiles.add(relativePath);
        }
      } else if (result.fix_available) {
        console.log(`   💡 Fix available. Run with --auto-fix to apply.`);
      }
    }
    
    changedFiles.add(relativePath);
    
  } catch (err) {
    console.log(`   ❌ Analysis error: ${err.message}`);
  }
}

// Schedule analysis with debounce
function scheduleAnalysis(filePath) {
  if (pendingAnalysis.has(filePath)) {
    clearTimeout(pendingAnalysis.get(filePath));
  }

  const timeout = setTimeout(() => {
    pendingAnalysis.delete(filePath);
    processFile(filePath);
  }, 1500);

  pendingAnalysis.set(filePath, timeout);
}

// Generate commit when user presses 'c'
async function handleCommit() {
  if (changedFiles.size === 0) {
    console.log("\n📝 No changes to commit.");
    return;
  }
  
  console.log(`\n📝 Generating commit message for ${changedFiles.size} file(s)...`);
  const message = await generateCommitMessage(changedFiles);
  
  console.log(`\n   Commit message: "${message}"`);
  console.log(`\n   To commit, run:`);
  console.log(`   git add -A && git commit -m "${message}"`);
  
  // Save for easy use
  fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), message, "utf8");
  console.log(`   Or: git commit -F .commit_msg`);
  
  changedFiles.clear();
}

// Watch patterns - watch folders directly for better Windows compatibility
const targetNormalized = PROJECT_PATH.replace(/\\/g, "/");

// Check which folders exist
const POSSIBLE_FOLDERS = ["src", "app", "components", "pages", "lib", "utils", "hooks", "types", "__tests__"];
const WATCH_PATTERNS = [];

for (const folder of POSSIBLE_FOLDERS) {
  const fullPath = path.join(PROJECT_PATH, folder);
  if (fs.existsSync(fullPath)) {
    WATCH_PATTERNS.push(fullPath.replace(/\\/g, "/"));
  }
}

// If no standard folders found, watch the project root
if (WATCH_PATTERNS.length === 0) {
  WATCH_PATTERNS.push(targetNormalized);
}

const IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/*.min.js",
  "**/*.backup",
];

// Valid extensions
const VALID_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

// Start
console.log(`
🤖 Letta Coding Assistant
==========================
Project: ${PROJECT_PATH}
Auto-fix: ${AUTO_FIX ? "ON" : "OFF"}
Auto-commit: ${AUTO_COMMIT ? "ON" : "OFF"}
Watching: ${WATCH_PATTERNS.length} folder(s)
==========================
`);

// Show watched folders
console.log("📁 Watched folders:");
WATCH_PATTERNS.forEach(p => console.log(`   - ${path.relative(PROJECT_PATH, p) || "."}`));
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
    console.log("🟢 Watching for changes...");
    console.log("   Edit your code - I'll analyze it automatically.");
    console.log("   Press Ctrl+C to stop and see commit options.\n");
  }
});

watcher.on("change", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  console.log(`\n📝 ${rel}`);
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;
  
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  console.log(`\n➕ ${rel}`);
  scheduleAnalysis(filePath);
});

watcher.on("error", (err) => {
  console.error("❌ Watcher error:", err);
});

// Debug: log all events if DEBUG env is set
if (process.env.DEBUG === "true") {
  watcher.on("all", (event, filePath) => {
    console.log(`[DEBUG] ${event}: ${filePath}`);
  });
}

// Handle exit
process.on("SIGINT", async () => {
  console.log(`\n
📊 Session Summary
==================
Files analyzed: ${sessionStats.analyzed}
Issues found: ${sessionStats.issues}
Auto-fixed: ${sessionStats.fixed}
`);

  if (changedFiles.size > 0) {
    await handleCommit();
  }
  
  console.log("\n👋 Goodbye!");
  process.exit(0);
});
