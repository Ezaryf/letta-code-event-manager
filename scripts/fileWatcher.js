#!/usr/bin/env node
// Enhanced File Watcher - Rich Dashboard for Letta Coding Assistant
// Provides real-time insights during development

import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";
import chalk from "chalk";
import boxen from "boxen";
import figures from "figures";
import logUpdate from "log-update";
import Table from "cli-table3";
import gradient from "gradient-string";

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// Configuration & State
// ═══════════════════════════════════════════════════════════════════════════

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

const agentId = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;

const TARGET_REPO = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.env.TARGET_REPO || process.cwd();

const DEBOUNCE_MS = parseInt(process.env.WATCHER_DEBOUNCE || "2000", 10);
const WATCH_ALL = process.argv.includes("--all") || process.env.WATCH_ALL === "true";
const AUTO_FIX = process.argv.includes("--fix") || process.env.AUTO_FIX === "true";

// Session statistics
const stats = {
  filesAnalyzed: 0,
  issuesFound: 0,
  autoFixes: 0,
  startTime: Date.now(),
  lastAnalysis: null,
  recentFiles: [],
  issuesByType: { bugs: 0, security: 0, performance: 0, style: 0 },
  analysisHistory: [],
};

// File type configuration
const FILE_CONFIG = {
  ".js": { type: "JavaScript", icon: "📜", color: chalk.yellow },
  ".jsx": { type: "React Component", icon: "⚛️", color: chalk.cyan },
  ".ts": { type: "TypeScript", icon: "📘", color: chalk.blue },
  ".tsx": { type: "React TSX", icon: "⚛️", color: chalk.magenta },
  ".json": { type: "JSON Config", icon: "⚙️", color: chalk.gray },
  ".css": { type: "Stylesheet", icon: "🎨", color: chalk.green },
  ".scss": { type: "SASS", icon: "🎨", color: chalk.hex("#CC6699") },
};

const VALID_EXTENSIONS = Object.keys(FILE_CONFIG);
const pendingAnalysis = new Map();
let isReady = false;
let currentActivity = "Initializing...";

// ═══════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════

if (!agentId) {
  console.error(chalk.red(`${figures.cross} No agent ID found. Run: npm run setup`));
  process.exit(1);
}

if (!fs.existsSync(TARGET_REPO)) {
  console.error(chalk.red(`${figures.cross} Target not found: ${TARGET_REPO}`));
  process.exit(1);
}


// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Rendering
// ═══════════════════════════════════════════════════════════════════════════

function getUptime() {
  const seconds = Math.floor((Date.now() - stats.startTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getProjectInfo() {
  const pkgPath = path.join(TARGET_REPO, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return { name: pkg.name || "Unknown", version: pkg.version || "0.0.0" };
    } catch { return { name: path.basename(TARGET_REPO), version: "-" }; }
  }
  return { name: path.basename(TARGET_REPO), version: "-" };
}

function countProjectFiles() {
  let count = 0;
  const countDir = (dir) => {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.startsWith(".") || item === "node_modules") continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) countDir(full);
        else if (VALID_EXTENSIONS.includes(path.extname(item))) count++;
      }
    } catch {}
  };
  countDir(TARGET_REPO);
  return count;
}

function renderHeader() {
  const title = gradient.pastel.multiline(`
╔═══════════════════════════════════════════════════════════════════════════╗
║     🤖 Letta Coding Assistant - Intelligent Watcher                       ║
╚═══════════════════════════════════════════════════════════════════════════╝`);
  return title;
}

function renderProjectInfo() {
  const proj = getProjectInfo();
  const fileCount = countProjectFiles();
  
  const info = [
    `${chalk.dim("Project:")}    ${chalk.white.bold(proj.name)} ${chalk.dim(`v${proj.version}`)}`,
    `${chalk.dim("Path:")}       ${chalk.cyan(TARGET_REPO)}`,
    `${chalk.dim("Framework:")}  ${chalk.yellow(detectFramework())}`,
    `${chalk.dim("Language:")}   ${chalk.blue(detectLanguage())}`,
    `${chalk.dim("Files:")}      ${chalk.green(fileCount)} ${chalk.dim("watchable")}`,
    `${chalk.dim("Auto-fix:")}   ${AUTO_FIX ? chalk.green("ON") : chalk.red("OFF")}`,
  ].join("\n");

  return boxen(info, {
    title: chalk.bold(" Project Info "),
    titleAlignment: "left",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: "cyan",
    borderStyle: "round",
  });
}

function detectFramework() {
  const pkgPath = path.join(TARGET_REPO, "package.json");
  if (!fs.existsSync(pkgPath)) return "node";
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "Next.js";
    if (deps.react) return "React";
    if (deps.vue) return "Vue.js";
    if (deps.express) return "Express";
    if (deps["@nestjs/core"]) return "NestJS";
    return "node";
  } catch { return "node"; }
}

function detectLanguage() {
  const tsConfig = path.join(TARGET_REPO, "tsconfig.json");
  return fs.existsSync(tsConfig) ? "typescript" : "javascript";
}

function renderStats() {
  const table = new Table({
    chars: { mid: "", "left-mid": "", "mid-mid": "", "right-mid": "" },
    style: { head: ["cyan"], border: ["dim"] },
  });

  table.push(
    [chalk.dim("Analyzed"), chalk.green.bold(stats.filesAnalyzed)],
    [chalk.dim("Issues"), chalk.yellow.bold(stats.issuesFound)],
    [chalk.dim("Auto-fixes"), chalk.blue.bold(stats.autoFixes)],
    [chalk.dim("Uptime"), chalk.magenta(getUptime())]
  );

  return boxen(table.toString(), {
    title: chalk.bold(" Session Stats "),
    titleAlignment: "left",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: "green",
    borderStyle: "round",
  });
}

function renderIssueBreakdown() {
  const { bugs, security, performance, style } = stats.issuesByType;
  const bars = [
    `${chalk.red(figures.circleFilled)} Bugs:        ${renderBar(bugs, 10)} ${bugs}`,
    `${chalk.yellow(figures.warning)} Security:    ${renderBar(security, 10)} ${security}`,
    `${chalk.blue(figures.info)} Performance: ${renderBar(performance, 10)} ${performance}`,
    `${chalk.gray(figures.bullet)} Style:       ${renderBar(style, 10)} ${style}`,
  ].join("\n");

  return boxen(bars, {
    title: chalk.bold(" Issue Breakdown "),
    titleAlignment: "left",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: "yellow",
    borderStyle: "round",
  });
}

function renderBar(value, max) {
  const filled = Math.min(value, max);
  const empty = max - filled;
  return chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(empty));
}


function renderRecentFiles() {
  if (stats.recentFiles.length === 0) {
    return boxen(chalk.dim("No files analyzed yet..."), {
      title: chalk.bold(" Recent Activity "),
      titleAlignment: "left",
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderColor: "magenta",
      borderStyle: "round",
    });
  }

  const recent = stats.recentFiles.slice(-5).reverse().map((f, i) => {
    const config = FILE_CONFIG[f.ext] || { icon: "📄", color: chalk.white };
    const status = f.hasIssues ? chalk.red(figures.cross) : chalk.green(figures.tick);
    const time = dayjs(f.time).format("HH:mm:ss");
    return `${status} ${config.icon} ${config.color(f.name.padEnd(30))} ${chalk.dim(time)} ${chalk.dim(`${f.duration}s`)}`;
  }).join("\n");

  return boxen(recent, {
    title: chalk.bold(" Recent Activity "),
    titleAlignment: "left",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: "magenta",
    borderStyle: "round",
  });
}

function renderWatchedFolders(patterns) {
  const folders = patterns.map(p => {
    const rel = path.relative(TARGET_REPO, p) || ".";
    return `${chalk.cyan(figures.pointer)} ${rel}`;
  }).join("\n");

  return boxen(folders, {
    title: chalk.bold(" Watching "),
    titleAlignment: "left",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderColor: "blue",
    borderStyle: "round",
  });
}

function renderCurrentActivity() {
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const frame = spinner[Math.floor(Date.now() / 100) % spinner.length];
  return `\n${chalk.cyan(frame)} ${currentActivity}`;
}

function renderFooter() {
  return chalk.dim(`\n${"─".repeat(75)}\n${figures.info} Press ${chalk.cyan("Ctrl+C")} to stop and see commit options.\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Analysis Engine
// ═══════════════════════════════════════════════════════════════════════════

function categorizeIssues(text) {
  const lower = text.toLowerCase();
  const issues = { bugs: 0, security: 0, performance: 0, style: 0 };
  
  if (lower.includes("bug") || lower.includes("error") || lower.includes("fix")) issues.bugs++;
  if (lower.includes("security") || lower.includes("vulnerab") || lower.includes("xss") || lower.includes("injection")) issues.security++;
  if (lower.includes("performance") || lower.includes("slow") || lower.includes("optimize") || lower.includes("memory")) issues.performance++;
  if (lower.includes("style") || lower.includes("naming") || lower.includes("convention") || lower.includes("format")) issues.style++;
  
  return issues;
}

async function analyzeFile(filePath) {
  const ext = path.extname(filePath);
  const config = FILE_CONFIG[ext] || { type: "code", icon: "📄", color: chalk.white };
  const relativePath = path.relative(TARGET_REPO, filePath);
  const fileName = path.basename(filePath);

  currentActivity = `Analyzing ${config.icon} ${config.color(fileName)}...`;

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.log(chalk.red(`   ${figures.cross} Could not read file`));
    return;
  }

  if (content.length > 8000) {
    console.log(chalk.yellow(`   ${figures.warning} Skipping (file too large: ${content.length} chars)`));
    return;
  }

  const lineCount = content.split("\n").length;
  const prompt = `Analyze this ${config.type} file. Be brief (2-3 sentences max).

File: ${relativePath}
Lines: ${lineCount}
\`\`\`${ext.slice(1)}
${content}
\`\`\`

Check for:
1. Bugs or issues
2. Security concerns  
3. Quick improvements

If fine, say "✓ Looks good"`;

  try {
    const startTime = Date.now();
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
    const hasIssues = !text.toLowerCase().includes("looks good") && !text.includes("✓");
    
    // Update stats
    stats.filesAnalyzed++;
    stats.lastAnalysis = Date.now();
    
    if (hasIssues) {
      stats.issuesFound++;
      const issueTypes = categorizeIssues(text);
      stats.issuesByType.bugs += issueTypes.bugs;
      stats.issuesByType.security += issueTypes.security;
      stats.issuesByType.performance += issueTypes.performance;
      stats.issuesByType.style += issueTypes.style;
    }

    stats.recentFiles.push({
      name: fileName,
      ext,
      time: Date.now(),
      duration,
      hasIssues,
    });

    // Keep only last 20 files
    if (stats.recentFiles.length > 20) stats.recentFiles.shift();

    // Display result
    const statusIcon = hasIssues ? chalk.yellow(figures.warning) : chalk.green(figures.tick);
    console.log(`\n${statusIcon} ${config.icon} ${config.color.bold(fileName)} ${chalk.dim(`(${lineCount} lines, ${duration}s)`)}`);
    
    const shortText = text.length > 400 ? text.slice(0, 400) + "..." : text;
    console.log(boxen(shortText, {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderColor: hasIssues ? "yellow" : "green",
      borderStyle: "round",
      dimBorder: true,
    }));

    // Save analysis
    const stamp = dayjs().format("YYYYMMDD_HHmmss");
    const analysisDir = path.join("analysis", stamp);
    fs.mkdirSync(analysisDir, { recursive: true });
    fs.writeFileSync(path.join(analysisDir, "file.txt"), relativePath, "utf8");
    fs.writeFileSync(path.join(analysisDir, "analysis.txt"), text, "utf8");
    fs.writeFileSync(path.join(analysisDir, "content.txt"), content, "utf8");
    fs.writeFileSync(path.join(analysisDir, "meta.json"), JSON.stringify({
      file: relativePath,
      type: config.type,
      lines: lineCount,
      duration,
      hasIssues,
      timestamp: new Date().toISOString(),
    }, null, 2), "utf8");

    currentActivity = "Ready - waiting for changes...";

  } catch (err) {
    console.log(chalk.red(`   ${figures.cross} Error: ${err.message}`));
    currentActivity = "Ready - waiting for changes...";
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


// ═══════════════════════════════════════════════════════════════════════════
// Watcher Setup
// ═══════════════════════════════════════════════════════════════════════════

const targetNormalized = TARGET_REPO.replace(/\\/g, "/");
const POSSIBLE_FOLDERS = ["src", "app", "components", "pages", "lib", "utils", "hooks", "types", "scripts"];
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
  "**/coverage/**",
  "**/.kiro/**",
];

// ═══════════════════════════════════════════════════════════════════════════
// Initial Display
// ═══════════════════════════════════════════════════════════════════════════

console.clear();
console.log(renderHeader());
console.log(renderProjectInfo());
console.log(renderWatchedFolders(WATCH_PATTERNS));
console.log(renderStats());
console.log(renderIssueBreakdown());
console.log(renderRecentFiles());
console.log(chalk.green(`\n${figures.tick} Ready! Edit your code - I'll analyze it with full context.`));
console.log(renderFooter());

// ═══════════════════════════════════════════════════════════════════════════
// Watcher Events
// ═══════════════════════════════════════════════════════════════════════════

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
    currentActivity = "Ready - waiting for changes...";
  }
});

watcher.on("change", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;

  const rel = path.relative(TARGET_REPO, filePath);
  const config = FILE_CONFIG[ext] || { icon: "📄", color: chalk.white };
  
  console.log(`\n${chalk.blue(figures.pointer)} ${chalk.bold("Changed:")} ${config.icon} ${config.color(rel)}`);
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;

  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;

  const rel = path.relative(TARGET_REPO, filePath);
  const config = FILE_CONFIG[ext] || { icon: "📄", color: chalk.white };
  
  console.log(`\n${chalk.green(figures.plus)} ${chalk.bold("Added:")} ${config.icon} ${config.color(rel)}`);
  scheduleAnalysis(filePath);
});

watcher.on("unlink", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;

  const rel = path.relative(TARGET_REPO, filePath);
  console.log(`\n${chalk.red(figures.cross)} ${chalk.bold("Deleted:")} ${rel}`);
});

watcher.on("error", (err) => {
  console.error(chalk.red(`${figures.cross} Watcher error: ${err.message}`));
});

// ═══════════════════════════════════════════════════════════════════════════
// Graceful Shutdown with Summary
// ═══════════════════════════════════════════════════════════════════════════

process.on("SIGINT", () => {
  console.log("\n");
  
  const summaryTable = new Table({
    head: [chalk.cyan("Metric"), chalk.cyan("Value")],
    style: { head: [], border: ["dim"] },
  });

  summaryTable.push(
    ["Files Analyzed", chalk.green.bold(stats.filesAnalyzed)],
    ["Issues Found", chalk.yellow.bold(stats.issuesFound)],
    ["Auto-fixes Applied", chalk.blue.bold(stats.autoFixes)],
    ["Session Duration", chalk.magenta(getUptime())],
    ["", ""],
    [chalk.red("Bugs"), stats.issuesByType.bugs],
    [chalk.yellow("Security"), stats.issuesByType.security],
    [chalk.blue("Performance"), stats.issuesByType.performance],
    [chalk.gray("Style"), stats.issuesByType.style]
  );

  console.log(boxen(summaryTable.toString(), {
    title: chalk.bold(" 📊 Session Summary "),
    titleAlignment: "center",
    padding: 1,
    borderColor: "cyan",
    borderStyle: "double",
  }));

  if (stats.filesAnalyzed > 0) {
    console.log(chalk.dim("\nAnalysis files saved in ./analysis/"));
  }

  console.log(chalk.cyan(`\n${figures.heart} Thanks for using Letta! Happy coding!\n`));
  process.exit(0);
});
