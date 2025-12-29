#!/usr/bin/env node
// Letta Coding Assistant - Intelligent File Watcher
// Live dashboard with theme support
import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";
import { fileURLToPath } from "url";
import chalk from "chalk";
import logUpdate from "log-update";
import {
  detectProjectType,
  scanProjectStructure,
  buildAnalysisContext,
} from "./analyzer.js";

// Load environment variables FIRST before using them
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

// CLI Arguments
const PROJECT_PATH = process.argv[2] ? path.resolve(process.argv[2]) : null;
const AUTO_FIX = process.argv.includes("--auto-fix");
const DEBUG = process.argv.includes("--debug") || process.env.DEBUG === "true";
const WATCH_ALL = process.argv.includes("--all") || process.env.WATCH_ALL === "true";

// Theme from env or default
const THEME_NAME = process.env.LETTA_THEME || "ocean";

// ═══════════════════════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════════════════════

const THEMES = {
  ocean: {
    name: "Ocean",
    header: chalk.cyan,
    headerBg: chalk.bgCyan.black,
    box1: chalk.cyan,        // Project Info
    box2: chalk.blue,        // Watching
    box3: chalk.green,       // Stats
    box4: chalk.yellow,      // Issues
    box5: chalk.red,         // Severity
    box6: chalk.magenta,     // Recent
    accent: chalk.cyan,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    dim: chalk.dim,
    bold: chalk.bold,
  },
  forest: {
    name: "Forest",
    header: chalk.green,
    headerBg: chalk.bgGreen.black,
    box1: chalk.green,
    box2: chalk.hex("#90EE90"),
    box3: chalk.hex("#32CD32"),
    box4: chalk.yellow,
    box5: chalk.hex("#FF6347"),
    box6: chalk.hex("#98FB98"),
    accent: chalk.green,
    success: chalk.hex("#32CD32"),
    warning: chalk.yellow,
    error: chalk.red,
    dim: chalk.dim,
    bold: chalk.bold,
  },
  sunset: {
    name: "Sunset",
    header: chalk.hex("#FF6B6B"),
    headerBg: chalk.bgHex("#FF6B6B").black,
    box1: chalk.hex("#FF6B6B"),
    box2: chalk.hex("#FFA07A"),
    box3: chalk.hex("#FFD93D"),
    box4: chalk.hex("#FF8C00"),
    box5: chalk.hex("#DC143C"),
    box6: chalk.hex("#FF69B4"),
    accent: chalk.hex("#FF6B6B"),
    success: chalk.hex("#98FB98"),
    warning: chalk.hex("#FFD93D"),
    error: chalk.hex("#DC143C"),
    dim: chalk.dim,
    bold: chalk.bold,
  },
  midnight: {
    name: "Midnight",
    header: chalk.hex("#9D4EDD"),
    headerBg: chalk.bgHex("#9D4EDD").white,
    box1: chalk.hex("#9D4EDD"),
    box2: chalk.hex("#7B68EE"),
    box3: chalk.hex("#00CED1"),
    box4: chalk.hex("#FFD700"),
    box5: chalk.hex("#FF4500"),
    box6: chalk.hex("#DA70D6"),
    accent: chalk.hex("#9D4EDD"),
    success: chalk.hex("#00FA9A"),
    warning: chalk.hex("#FFD700"),
    error: chalk.hex("#FF4500"),
    dim: chalk.dim,
    bold: chalk.bold,
  },
  mono: {
    name: "Monochrome",
    header: chalk.white,
    headerBg: chalk.bgWhite.black,
    box1: chalk.white,
    box2: chalk.gray,
    box3: chalk.white,
    box4: chalk.gray,
    box5: chalk.white,
    box6: chalk.gray,
    accent: chalk.white,
    success: chalk.white,
    warning: chalk.gray,
    error: chalk.white,
    dim: chalk.dim,
    bold: chalk.bold,
  },
};

const T = THEMES[THEME_NAME] || THEMES.ocean;


// ═══════════════════════════════════════════════════════════════════════════
// Help Display
// ═══════════════════════════════════════════════════════════════════════════

if (!PROJECT_PATH) {
  console.log(T.header(`
┌─────────────────────────────────────────────────────────────┐
│         🤖 Letta Coding Assistant - Intelligent Watcher     │
└─────────────────────────────────────────────────────────────┘
`));
  console.log(`  ${chalk.white("Usage:")} ${T.accent("npm run watch")} ${chalk.yellow("<project-path>")} ${T.dim("[options]")}

  ${chalk.white("Options:")}
    ${T.success("--auto-fix")}   Automatically apply safe fixes
    ${T.success("--all")}        Watch ALL files (not just standard folders)
    ${T.success("--debug")}      Enable debug logging

  ${chalk.white("Themes:")} Set ${T.accent("LETTA_THEME")} in .env (ocean, forest, sunset, midnight, mono)

  ${chalk.white("Examples:")}
    npm run watch ../my-project
    npm run watch . --all --auto-fix
`);
  process.exit(0);
}

// Validate API key before creating client
if (!process.env.LETTA_API_KEY || process.env.LETTA_API_KEY === "sk-let-your-api-key-here") {
  console.error(T.error("✗ LETTA_API_KEY not configured. Run: npm start → Quick Setup"));
  process.exit(1);
}

// Now create the client with loaded env vars
const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

const agentId = fs.existsSync(path.join(ROOT, ".letta_agent_id"))
  ? fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim()
  : null;

if (!agentId) {
  console.error(T.error(`✗ No agent. Run: npm run setup`));
  process.exit(1);
}

if (!fs.existsSync(PROJECT_PATH)) {
  console.error(T.error(`✗ Project not found: ${PROJECT_PATH}`));
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const pendingAnalysis = new Map();
const analysisCache = new Map();
const changedFiles = new Set();
let isReady = false;
let projectType = null;
let projectStructure = null;
let currentStatus = "Initializing...";
let dashboardInterval = null;

const stats = {
  analyzed: 0,
  issues: 0,
  fixed: 0,
  skipped: 0,
  startTime: Date.now(),
  issuesByType: { bugs: 0, security: 0, performance: 0, style: 0 },
  recentFiles: [],
  severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
  logs: [], // Activity log
};

const VALID_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".scss", ".md"];


// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Rendering (Live Update)
// ═══════════════════════════════════════════════════════════════════════════

const LINE = "─";

function getUptime() {
  const seconds = Math.floor((Date.now() - stats.startTime) / 1000);
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function box(title, lines, width, color) {
  const inner = width - 4;
  let out = color(`  ┌─ `) + T.bold(title) + color(` ${LINE.repeat(Math.max(0, inner - title.length - 1))}┐\n`);
  for (const line of lines) {
    const clean = stripAnsi(String(line));
    const padding = Math.max(0, inner - clean.length);
    out += color(`  │ `) + line + " ".repeat(padding) + color(` │\n`);
  }
  out += color(`  └${LINE.repeat(width - 2)}┘`);
  return out;
}

function bar(val, max = 10, w = 10) {
  const f = Math.min(val, max);
  return T.success("█".repeat(f)) + T.dim("░".repeat(w - f));
}

function renderDashboard() {
  const W = Math.min(process.stdout.columns || 80, 75);
  
  // Get fresh project info
  const fw = projectType?.framework || projectType?.type || "node";
  const lang = projectType?.language || "javascript";
  const total = typeof projectStructure?.totalFiles === 'number' ? projectStructure.totalFiles : 0;
  const comps = Array.isArray(projectStructure?.components) ? projectStructure.components.length : 0;
  const utils = Array.isArray(projectStructure?.utils) ? projectStructure.utils.length : 0;
  const tests = Array.isArray(projectStructure?.testFiles) ? projectStructure.testFiles.length : 0;
  const shortPath = PROJECT_PATH.length > 45 ? "..." + PROJECT_PATH.slice(-42) : PROJECT_PATH;

  let output = "";
  
  // Header
  output += T.header(`
  ┌${LINE.repeat(W - 4)}┐
  │  🤖 Letta Coding Assistant              Theme: ${T.bold(T.name || THEME_NAME)}  │
  └${LINE.repeat(W - 4)}┘
`);

  // Project Info (box1 - cyan/primary)
  output += box("Project Info", [
    `${T.dim("Project:")}   ${T.bold(path.basename(PROJECT_PATH))}`,
    `${T.dim("Path:")}      ${T.accent(shortPath)}`,
    `${T.dim("Framework:")} ${chalk.yellow(fw)}`,
    `${T.dim("Language:")}  ${chalk.blue(lang)}`,
    `${T.dim("Files:")}     ${T.success(total)} total (${comps} comps, ${utils} utils, ${tests} tests)`,
    `${T.dim("Auto-fix:")}  ${AUTO_FIX ? T.success("ON") : T.error("OFF")}`,
  ], W, T.box1);

  output += "\n\n";

  // Watching (box2 - blue)
  const watchInfo = WATCH_ALL ? "All directories" : "Project directory";
  output += box("Watching", [
    `${T.accent("›")} ${watchInfo}`,
    `${T.dim("Extensions:")} ${VALID_EXTENSIONS.slice(0, 4).join(", ")}...`,
  ], 35, T.box2);

  output += "\n\n";

  // Stats (box3 - green)
  output += box("Stats", [
    `Analyzed  ${T.success(String(stats.analyzed).padStart(3))}`,
    `Issues    ${T.warning(String(stats.issues).padStart(3))}`,
    `Fixed     ${T.accent(String(stats.fixed).padStart(3))}`,
    `Skipped   ${T.dim(String(stats.skipped).padStart(3))}`,
    `Uptime    ${chalk.magenta(getUptime())}`,
  ], 24, T.box3);

  output += "\n\n";

  // Issues breakdown (box4 - yellow)
  const { bugs, security, performance, style } = stats.issuesByType;
  output += box("Issues", [
    `${T.error("●")} Bugs     ${bar(bugs)} ${String(bugs).padStart(2)}`,
    `${T.warning("!")} Security ${bar(security)} ${String(security).padStart(2)}`,
    `${T.accent("⚡")} Perf     ${bar(performance)} ${String(performance).padStart(2)}`,
    `${T.dim("○")} Style    ${bar(style)} ${String(style).padStart(2)}`,
  ], 34, T.box4);

  output += "\n\n";

  // Severity (box5 - red)
  const { critical, high, medium, low } = stats.severityCounts;
  output += box("Severity", [
    `${T.error("●")} Critical ${T.error(String(critical).padStart(2))}`,
    `${T.warning("●")} High     ${T.warning(String(high).padStart(2))}`,
    `${chalk.white("●")} Medium   ${String(medium).padStart(2)}`,
    `${T.dim("●")} Low      ${T.dim(String(low).padStart(2))}`,
  ], 22, T.box5);

  output += "\n\n";

  // Recent Activity (box6 - magenta)
  let recentLines;
  if (stats.recentFiles.length === 0) {
    recentLines = [T.dim("No files analyzed yet...")];
  } else {
    recentLines = stats.recentFiles.slice(-5).reverse().map((f) => {
      const icon = f.hasIssues ? T.error("×") : T.success("✓");
      const name = f.name.length > 20 ? f.name.slice(0, 17) + "..." : f.name.padEnd(20);
      const time = dayjs(f.time).format("HH:mm:ss");
      const fixed = f.wasFixed ? T.accent(" [fix]") : "";
      return `${icon} ${name} ${T.dim(time)}${fixed}`;
    });
  }
  output += box("Recent Activity", recentLines, 42, T.box6);

  output += "\n\n";

  // Activity Log (last 3 events)
  output += T.dim(`  ─── Activity Log ${"─".repeat(40)}\n`);
  const logs = stats.logs.slice(-3);
  if (logs.length === 0) {
    output += T.dim("  Waiting for file changes...\n");
  } else {
    for (const log of logs) {
      output += `  ${log}\n`;
    }
  }

  output += "\n";

  // Status bar
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const frame = spinner[Math.floor(Date.now() / 100) % spinner.length];
  output += T.accent(`  ${frame} ${currentStatus}\n`);
  output += T.dim(`\n  ${LINE.repeat(W - 4)}`);
  output += T.dim(`\n  Press ${T.accent("Ctrl+C")} to stop  |  Theme: ${T.accent(THEME_NAME)}  |  ${T.dim("LETTA_THEME=<name> to change")}\n`);

  return output;
}

function updateDashboard() {
  logUpdate(renderDashboard());
}

function addLog(message) {
  const time = dayjs().format("HH:mm:ss");
  stats.logs.push(`${T.dim(time)} ${message}`);
  if (stats.logs.length > 50) stats.logs.shift();
  updateDashboard();
}


// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeWithContext(filePath) {
  const context = buildAnalysisContext(filePath, PROJECT_PATH, { includeGit: true });
  const prompt = buildAnalysisPrompt(context);
  
  if (DEBUG) {
    console.log(`   [DEBUG] Analyzing with context...`);
  }
  
  try {
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
    
    if (DEBUG) {
      console.log(`   [DEBUG] Raw response length: ${text.length}`);
    }
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return { ...JSON.parse(jsonMatch[0]), raw: text };
      } catch (e) {
        if (DEBUG) console.log(`   [DEBUG] JSON parse failed: ${e.message}`);
      }
    }
    
    return {
      status: text.includes("✓") || text.toLowerCase().includes("looks good") ? "ok" : "review",
      summary: text.slice(0, 200),
      issues: [],
      suggestions: [],
      fix_available: false,
      raw: text,
    };
  } catch (err) {
    addLog(T.error(`✗ Analysis error: ${err.message}`));
    
    // Helpful error messages
    if (err.message.includes("401") || err.message.includes("unauthorized")) {
      addLog(T.warning(`💡 Check your LETTA_API_KEY in .env`));
    } else if (err.message.includes("404") || err.message.includes("not found")) {
      addLog(T.warning(`💡 Agent may have been deleted. Run: npm run setup`));
    } else if (err.message.includes("timeout") || err.message.includes("ETIMEDOUT")) {
      addLog(T.warning(`💡 Request timed out. Will retry on next change.`));
    }
    
    return null;
  }
}

function buildAnalysisPrompt(context) {
  const { file, project, structure } = context;
  
  return `You are an expert code reviewer. Analyze this file briefly.

PROJECT: ${project.framework || project.type} / ${project.language}
FILE: ${file.path} (${file.lineCount} lines)

\`\`\`${file.path.split(".").pop()}
${file.content}
\`\`\`

Check for: BUGS, SECURITY, PERFORMANCE issues.

Respond with ONLY valid JSON:
{
  "status": "ok" | "issues_found",
  "summary": "1 sentence",
  "issues": [{"type": "bug|security|performance|style", "severity": "critical|high|medium|low", "description": "what's wrong", "suggestion": "fix"}],
  "fix_available": false
}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE FIX APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

function applyFixes(fixes, confidence) {
  const MIN_CONFIDENCE = parseFloat(process.env.MIN_CONFIDENCE || "0.7");
  if (confidence < MIN_CONFIDENCE) return false;
  
  let allApplied = true;
  for (const fix of fixes) {
    const filePath = path.join(PROJECT_PATH, fix.file);
    if (!fs.existsSync(filePath)) { allApplied = false; continue; }
    
    const content = fs.readFileSync(filePath, "utf8");
    if (fix.action === "replace" && content.includes(fix.search)) {
      createBackup(filePath);
      const newContent = content.replace(fix.search, fix.replace);
      if (validateSyntax(newContent, fix.file)) {
        fs.writeFileSync(filePath, newContent, "utf8");
        stats.fixed++;
        addLog(T.success(`✓ Auto-fixed: ${path.basename(fix.file)}`));
      } else {
        allApplied = false;
      }
    } else {
      allApplied = false;
    }
  }
  return allApplied;
}

function createBackup(filePath) {
  const relativePath = path.relative(PROJECT_PATH, filePath);
  const backupDir = path.join(PROJECT_PATH, ".letta-backups", path.dirname(relativePath));
  const timestamp = dayjs().format("YYYYMMDD_HHmmss");
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.${timestamp}.backup`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  ensureGitignore();
}

function ensureGitignore() {
  const gitignorePath = path.join(PROJECT_PATH, ".gitignore");
  let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  if (!gitignore.includes(".letta-backups")) {
    fs.appendFileSync(gitignorePath, "\n# Letta backups\n.letta-backups/\n");
  }
}

function validateSyntax(content, fileName) {
  const ext = path.extname(fileName);
  if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
    const brackets = { "{": 0, "[": 0, "(": 0 };
    const pairs = { "}": "{", "]": "[", ")": "(" };
    for (const char of content) {
      if (brackets[char] !== undefined) brackets[char]++;
      if (pairs[char]) brackets[pairs[char]]--;
    }
    for (const count of Object.values(brackets)) {
      if (count !== 0) return false;
    }
  }
  return true;
}


// ═══════════════════════════════════════════════════════════════════════════
// FILE PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

async function processFile(filePath) {
  const relativePath = path.relative(PROJECT_PATH, filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  if (!fs.existsSync(filePath)) return;
  
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    addLog(T.error(`✗ Cannot read: ${fileName}`));
    return;
  }
  
  if (!content.trim()) {
    stats.skipped++;
    updateDashboard();
    return;
  }
  
  // Skip if unchanged
  const contentHash = simpleHash(content);
  if (analysisCache.get(filePath) === contentHash) {
    stats.skipped++;
    addLog(T.dim(`→ Skipped (unchanged): ${fileName}`));
    updateDashboard();
    return;
  }
  
  currentStatus = `Analyzing ${fileName}...`;
  updateDashboard();
  
  stats.analyzed++;
  const startTime = Date.now();
  const result = await analyzeWithContext(filePath);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!result) {
    currentStatus = "Ready - waiting for changes...";
    updateDashboard();
    return;
  }
  
  analysisCache.set(filePath, contentHash);
  changedFiles.add(relativePath);
  
  const hasIssues = result.status !== "ok" && result.issues?.length > 0;
  let wasFixed = false;
  
  if (result.status === "ok") {
    addLog(T.success(`✓ ${fileName} - ${result.summary || "Looks good!"} (${duration}s)`));
  } else if (hasIssues) {
    stats.issues += result.issues.length;
    
    for (const issue of result.issues) {
      // Update stats
      if (issue.type === "bug") stats.issuesByType.bugs++;
      else if (issue.type === "security") stats.issuesByType.security++;
      else if (issue.type === "performance") stats.issuesByType.performance++;
      else stats.issuesByType.style++;
      
      if (issue.severity) {
        stats.severityCounts[issue.severity] = (stats.severityCounts[issue.severity] || 0) + 1;
      }
      
      const icon = { bug: "🐛", security: "🔒", performance: "⚡", style: "💅" }[issue.type] || "⚠";
      addLog(`${icon} ${T.warning(`[${issue.severity}]`)} ${fileName}: ${issue.description.slice(0, 50)}`);
    }
    
    // Auto-fix
    if (AUTO_FIX && result.fix_available && result.fixes?.length > 0) {
      if (applyFixes(result.fixes, result.fix_confidence)) {
        wasFixed = true;
      }
    }
  }
  
  // Track recent files
  stats.recentFiles.push({ name: fileName, ext, time: Date.now(), duration, hasIssues, wasFixed });
  if (stats.recentFiles.length > 20) stats.recentFiles.shift();
  
  currentStatus = "Ready - waiting for changes...";
  updateDashboard();
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
}

function scheduleAnalysis(filePath) {
  if (pendingAnalysis.has(filePath)) {
    clearTimeout(pendingAnalysis.get(filePath));
  }
  pendingAnalysis.set(filePath, setTimeout(() => {
    pendingAnalysis.delete(filePath);
    processFile(filePath);
  }, 1000));
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT MESSAGE
// ═══════════════════════════════════════════════════════════════════════════

async function generateCommitMessage() {
  if (changedFiles.size === 0) return;
  
  const fileList = Array.from(changedFiles).slice(0, 10).join(", ");
  const date = dayjs().format("DDMMYY");
  
  try {
    const response = await client.agents.messages.create(agentId, {
      input: `Generate a git commit message for: ${fileList}. Format: ${date} - <description>. Keep under 50 chars. Reply with ONLY the message.`
    });
    let message = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    if (!message.startsWith(date)) message = `${date} - ${message}`;
    
    console.log(T.success(`\n  📝 Commit: "${message}"`));
    console.log(T.dim(`     git add -A && git commit -m "${message}"\n`));
    
    fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), message, "utf8");
  } catch (err) {
    console.log(T.error(`  ✗ Could not generate commit message`));
  }
  changedFiles.clear();
}


// ═══════════════════════════════════════════════════════════════════════════
// WATCHER SETUP - WATCH ALL FILES
// ═══════════════════════════════════════════════════════════════════════════

projectType = detectProjectType(PROJECT_PATH);
projectStructure = scanProjectStructure(PROJECT_PATH);

// Watch the entire project directory
let WATCH_PATTERNS = [PROJECT_PATH.replace(/\\/g, "/")];

const IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.letta-backups/**",
  "**/*.min.js",
  "**/*.map",
  "**/.kiro/**",
  "**/package-lock.json",
  "**/.env*",
];

// ═══════════════════════════════════════════════════════════════════════════
// START - LIVE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

console.clear();
currentStatus = "Starting watcher...";
updateDashboard();

const watcher = chokidar.watch(WATCH_PATTERNS, {
  ignored: IGNORE,
  ignoreInitial: true,
  persistent: true,
  usePolling: process.platform === "win32", // Use polling on Windows for reliability
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  depth: 20, // Watch deeply nested folders
});

watcher.on("ready", () => {
  isReady = true;
  const watchedPaths = watcher.getWatched();
  const totalWatched = Object.values(watchedPaths).flat().length;
  currentStatus = `Ready - watching ${totalWatched} files for changes...`;
  addLog(T.success(`✓ Watcher ready - monitoring ${totalWatched} files`));
  
  // Start live dashboard refresh (every second for uptime)
  dashboardInterval = setInterval(() => {
    updateDashboard();
  }, 1000);
});

watcher.on("change", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  addLog(T.accent(`› Changed: ${rel}`));
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  addLog(T.success(`+ Added: ${rel}`));
  scheduleAnalysis(filePath);
});

watcher.on("unlink", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  addLog(T.error(`- Deleted: ${rel}`));
  // Clear from cache
  analysisCache.delete(filePath);
  updateDashboard();
});

watcher.on("error", (err) => {
  addLog(T.error(`✗ Watcher error: ${err.message}`));
  if (DEBUG) {
    console.error(err.stack);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════

process.on("SIGINT", async () => {
  if (dashboardInterval) clearInterval(dashboardInterval);
  logUpdate.clear();
  
  console.log(T.header(`
  ┌─────────────────────────────────────────────────────────────┐
  │                    📊 Session Summary                       │
  └─────────────────────────────────────────────────────────────┘
`));
  
  console.log(`  ${T.dim("Analyzed:")}  ${T.success(stats.analyzed)}    ${T.dim("Issues:")} ${T.warning(stats.issues)}    ${T.dim("Fixed:")} ${T.accent(stats.fixed)}`);
  console.log(`  ${T.dim("Skipped:")}   ${T.dim(stats.skipped)}    ${T.dim("Duration:")} ${chalk.magenta(getUptime())}`);
  console.log("");
  console.log(`  ${T.error("●")} Bugs: ${stats.issuesByType.bugs}  ${T.warning("●")} Security: ${stats.issuesByType.security}  ${T.accent("●")} Perf: ${stats.issuesByType.performance}  ${T.dim("●")} Style: ${stats.issuesByType.style}`);
  console.log(`  ${T.error("Critical:")} ${stats.severityCounts.critical}  ${T.warning("High:")} ${stats.severityCounts.high}  ${chalk.white("Medium:")} ${stats.severityCounts.medium}  ${T.dim("Low:")} ${stats.severityCounts.low}`);
  
  if (changedFiles.size > 0) {
    await generateCommitMessage();
  }

  console.log(T.accent(`\n  ♥ Thanks for using Letta! Happy coding!\n`));
  process.exit(0);
});
