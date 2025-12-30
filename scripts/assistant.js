#!/usr/bin/env node
// Letta Coding Assistant - File Watcher v2
// Simple scrolling log - NO in-place updates (Windows compatible)
import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";
import { fileURLToPath } from "url";
import chalk from "chalk";
import readline from "readline";
import {
  detectProjectType,
  scanProjectStructure,
  buildAnalysisContext,
} from "./analyzer.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

// CLI Arguments
const PROJECT_PATH = process.argv[2] ? path.resolve(process.argv[2]) : null;
const AUTO_FIX = process.argv.includes("--auto-fix") || process.env.AUTO_APPLY === "true";
const DEBUG = process.argv.includes("--debug") || process.env.DEBUG === "true";
const RETURN_TO_MENU = process.argv.includes("--return-to-menu");

// Settings from .env
const THEME_NAME = process.env.LETTA_THEME || "ocean";
const SHOW_TIMESTAMPS = process.env.SHOW_TIMESTAMPS !== "false";
const VERBOSE_OUTPUT = process.env.VERBOSE_OUTPUT === "true";
const WATCHER_DEBOUNCE = parseInt(process.env.WATCHER_DEBOUNCE || "1500", 10);
const WATCHER_DEPTH = parseInt(process.env.WATCHER_DEPTH || "20", 10);
const WATCH_EXTENSIONS = (process.env.WATCH_EXTENSIONS || ".js,.jsx,.ts,.tsx,.json,.css,.scss,.md").split(",");
const MIN_CONFIDENCE = parseFloat(process.env.MIN_CONFIDENCE || "0.7");
const BACKUP_BEFORE_FIX = process.env.BACKUP_BEFORE_FIX !== "false";
const FIX_TYPES = (process.env.FIX_TYPES || "bug,security,performance").split(",");

const THEMES = {
  ocean: { accent: chalk.cyan, success: chalk.green, warning: chalk.yellow, error: chalk.red, dim: chalk.dim },
  forest: { accent: chalk.green, success: chalk.hex("#32CD32"), warning: chalk.yellow, error: chalk.red, dim: chalk.dim },
  sunset: { accent: chalk.hex("#FF6B6B"), success: chalk.hex("#98FB98"), warning: chalk.hex("#FFD93D"), error: chalk.hex("#DC143C"), dim: chalk.dim },
  midnight: { accent: chalk.hex("#9D4EDD"), success: chalk.hex("#00FA9A"), warning: chalk.hex("#FFD700"), error: chalk.hex("#FF4500"), dim: chalk.dim },
  mono: { accent: chalk.white, success: chalk.white, warning: chalk.gray, error: chalk.white, dim: chalk.dim },
};

const T = THEMES[THEME_NAME] || THEMES.ocean;

// ═══════════════════════════════════════════════════════════════════════════
// Help
// ═══════════════════════════════════════════════════════════════════════════

if (!PROJECT_PATH) {
  console.log(T.accent(`
┌─────────────────────────────────────────────────────────────┐
│         🤖 Letta Coding Assistant - File Watcher            │
└─────────────────────────────────────────────────────────────┘
`));
  console.log(`  ${chalk.white("Usage:")} ${T.accent("npm run watch")} ${chalk.yellow("<project-path>")} ${T.dim("[options]")}

  ${chalk.white("Options:")}
    ${T.success("--auto-fix")}   Automatically apply safe fixes
    ${T.success("--debug")}      Enable debug logging

  ${chalk.white("Themes:")} Set ${T.accent("LETTA_THEME")} in .env (ocean, forest, sunset, midnight, mono)
`);
  process.exit(0);
}

// Validate
if (!process.env.LETTA_API_KEY || process.env.LETTA_API_KEY === "sk-let-your-api-key-here") {
  console.error(T.error("✗ LETTA_API_KEY not configured. Run: npm start → Quick Setup"));
  process.exit(1);
}

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
const analysisResults = []; // Store detailed results
let isReady = false;
let watcher = null;

const stats = {
  analyzed: 0,
  issues: 0,
  fixed: 0,
  skipped: 0,
  startTime: Date.now(),
  issuesByType: { bugs: 0, security: 0, performance: 0, style: 0 },
  severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
};

const VALID_EXTENSIONS = WATCH_EXTENSIONS;

// ═══════════════════════════════════════════════════════════════════════════
// Simple Logging - NO UPDATES, just print new lines
// ═══════════════════════════════════════════════════════════════════════════

function log(message) {
  if (SHOW_TIMESTAMPS) {
    const time = dayjs().format("HH:mm:ss");
    console.log(`  ${T.dim(time)} ${message}`);
  } else {
    console.log(`  ${message}`);
  }
}

function logVerbose(message) {
  if (VERBOSE_OUTPUT) {
    log(T.dim(message));
  }
}

function logStatus(message) {
  console.log(`  ${T.accent("→")} ${message}`);
}

function getUptime() {
  const seconds = Math.floor((Date.now() - stats.startTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getGitBranch() {
  try {
    const { execSync } = require("child_process");
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { 
      cwd: PROJECT_PATH, 
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return branch;
  } catch {
    return null;
  }
}

function getGitStatus() {
  try {
    const { execSync } = require("child_process");
    const status = execSync("git status --porcelain", { 
      cwd: PROJECT_PATH, 
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    const lines = status.trim().split("\n").filter(l => l);
    return {
      modified: lines.filter(l => l.startsWith(" M") || l.startsWith("M ")).length,
      added: lines.filter(l => l.startsWith("A ") || l.startsWith("??")).length,
      deleted: lines.filter(l => l.startsWith(" D") || l.startsWith("D ")).length,
      total: lines.length
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Show Header ONCE at startup - Clean Modern Design
// ═══════════════════════════════════════════════════════════════════════════

function getLastCommitInfo() {
  try {
    const { execSync } = require("child_process");
    const log = execSync('git log -1 --format="%h|%s|%cr"', { 
      cwd: PROJECT_PATH, 
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const [hash, message, time] = log.split("|");
    return { hash, message: message?.slice(0, 40), time };
  } catch {
    return null;
  }
}

function getPackageVersion() {
  try {
    const pkgPath = path.join(PROJECT_PATH, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return pkg.version || null;
    }
  } catch {}
  return null;
}

function showHeader() {
  const projectType = detectProjectType(PROJECT_PATH);
  const projectStructure = scanProjectStructure(PROJECT_PATH);
  
  const projectName = path.basename(PROJECT_PATH);
  const version = getPackageVersion();
  const fw = projectType?.framework || projectType?.type || "node";
  const lang = projectType?.language || "javascript";
  const total = projectStructure?.totalFiles || 0;
  const comps = projectStructure?.components?.length || 0;
  const utils = projectStructure?.utils?.length || 0;
  const hooks = projectStructure?.hooks?.length || 0;
  const tests = projectStructure?.testFiles?.length || 0;
  const configs = projectStructure?.configFiles?.length || 0;
  const types = projectStructure?.types?.length || 0;
  
  const gitBranch = getGitBranch();
  const gitStatus = getGitStatus();
  const lastCommit = getLastCommitInfo();
  
  // Detect tools
  const tools = [];
  if (projectType?.hasJest) tools.push("Jest");
  if (projectType?.hasVitest) tools.push("Vitest");
  if (projectType?.hasMocha) tools.push("Mocha");
  if (projectType?.hasEslint) tools.push("ESLint");
  if (projectType?.hasPrettier) tools.push("Prettier");
  if (lang === "typescript") tools.push("TypeScript");
  
  // Available scripts
  const scripts = projectType?.scripts || {};
  const availableScripts = ["dev", "start", "build", "test", "lint"].filter(s => scripts[s]);

  console.clear();
  
  // ═══════════════════════════════════════════════════════════════════════
  // HEADER BANNER
  // ═══════════════════════════════════════════════════════════════════════
  console.log("");
  console.log(T.accent("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
  console.log(T.accent("  ┃") + chalk.bold.white("  🤖 LETTA CODE WATCHER                                        ") + T.accent("┃"));
  console.log(T.accent("  ┃") + T.dim("     Real-time AI code analysis & smart commits                ") + T.accent("┃"));
  console.log(T.accent("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // PROJECT OVERVIEW - Simple clean layout
  // ═══════════════════════════════════════════════════════════════════════
  const versionStr = version ? T.dim(` v${version}`) : "";
  const frameworkBadge = fw !== "node" ? chalk.bgBlue.white(` ${fw} `) : chalk.bgGray.white(" Node.js ");
  const langBadge = lang === "typescript" ? chalk.bgBlue.white(" TS ") : chalk.bgYellow.black(" JS ");
  
  console.log(T.dim("  ─── Project ───────────────────────────────────────────────────────"));
  console.log(`  📁 ${chalk.bold.white(projectName)}${versionStr}`);
  console.log(`     ${frameworkBadge} ${langBadge}`);
  console.log("");
  
  // File stats with visual bar
  const barLength = Math.min(10, Math.ceil(total / 20));
  const fileBar = `${T.success("■".repeat(barLength))}${T.dim("□".repeat(10 - barLength))}`;
  console.log(`  ${T.dim("Files")}     ${chalk.white(total)} ${fileBar}`);
  
  // Structure breakdown
  const structParts = [];
  if (comps > 0) structParts.push(`${chalk.magenta(comps)} components`);
  if (utils > 0) structParts.push(`${chalk.blue(utils)} utils`);
  if (hooks > 0) structParts.push(`${chalk.cyan(hooks)} hooks`);
  if (tests > 0) structParts.push(`${chalk.green(tests)} tests`);
  if (types > 0) structParts.push(`${chalk.yellow(types)} types`);
  if (configs > 0) structParts.push(`${chalk.gray(configs)} configs`);
  
  if (structParts.length > 0) {
    console.log(`  ${T.dim("Structure")} ${structParts.slice(0, 5).join(" · ")}`);
  }
  
  // Tools detected
  if (tools.length > 0) {
    console.log(`  ${T.dim("Tools")}     ${tools.map(t => chalk.gray(`◆ ${t}`)).join("  ")}`);
  }
  
  // Scripts available
  if (availableScripts.length > 0) {
    console.log(`  ${T.dim("Scripts")}   ${availableScripts.map(s => T.accent(s)).join(" │ ")}`);
  }
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // GIT STATUS - Compact and informative
  // ═══════════════════════════════════════════════════════════════════════
  if (gitBranch) {
    const branchIcon = gitBranch === "main" || gitBranch === "master" ? "🌿" : "🔀";
    const statusIcon = gitStatus?.total > 0 ? T.warning("●") : T.success("●");
    const statusText = gitStatus?.total > 0 
      ? T.warning(`${gitStatus.total} changes`)
      : T.success("clean");
    
    console.log(T.dim("  ─── Git ───────────────────────────────────────────────────────────"));
    console.log(`  ${branchIcon} ${chalk.magenta(gitBranch)} ${statusIcon} ${statusText}`);
    
    if (gitStatus?.total > 0) {
      const changes = [];
      if (gitStatus.modified > 0) changes.push(`${gitStatus.modified} modified`);
      if (gitStatus.added > 0) changes.push(`${gitStatus.added} new`);
      if (gitStatus.deleted > 0) changes.push(`${gitStatus.deleted} deleted`);
      console.log(T.dim(`     ${changes.join(", ")}`));
    }
    
    if (lastCommit) {
      const msgDisplay = lastCommit.message?.length >= 40 ? lastCommit.message + "..." : lastCommit.message;
      console.log(T.dim(`     Last: ${chalk.gray(lastCommit.hash)} ${msgDisplay} (${lastCommit.time})`));
    }
    console.log("");
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // CURRENT SESSION SETTINGS - Minimal badges
  // ═══════════════════════════════════════════════════════════════════════
  const autoFixBadge = AUTO_FIX ? chalk.bgGreen.black(" AUTO-FIX ON ") : chalk.bgRed.white(" MANUAL ");
  const themeBadge = chalk.bgBlack.white(` ${THEME_NAME.toUpperCase()} `);
  
  console.log(T.dim("  ─── Session ───────────────────────────────────────────────────────"));
  console.log(`  ${autoFixBadge} ${themeBadge} ${T.dim(`Debounce: ${WATCHER_DEBOUNCE}ms`)}`);
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // QUICK HELP - Clean and minimal
  // ═══════════════════════════════════════════════════════════════════════
  console.log(T.dim("  ─── Controls ──────────────────────────────────────────────────────"));
  console.log(`  ${T.accent("q")} ${T.dim("quit + summary")}    ${T.accent("Ctrl+C")} ${T.dim("quick exit")}    ${T.accent("npm start")} ${T.dim("settings")}`);
  console.log("");
  console.log(T.dim("  ═══════════════════════════════════════════════════════════════════"));
  console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// Analysis - with READABLE output
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeWithContext(filePath) {
  const context = buildAnalysisContext(filePath, PROJECT_PATH, { includeGit: true });
  const { file, project } = context;
  
  const prompt = `You are an expert code reviewer. Analyze this file.

PROJECT: ${project.framework || project.type} / ${project.language}
FILE: ${file.path} (${file.lineCount} lines)

\`\`\`${file.path.split(".").pop()}
${file.content}
\`\`\`

Check for: BUGS, SECURITY, PERFORMANCE issues.

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "status": "ok" | "issues_found",
  "summary": "One short sentence describing the file status",
  "issues": [
    {
      "type": "bug|security|performance|style",
      "severity": "critical|high|medium|low",
      "line": 0,
      "description": "Clear description of the issue"
    }
  ]
}`;
  
  try {
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        if (DEBUG) log(T.dim(`JSON parse error: ${e.message}`));
      }
    }
    
    // Fallback
    return {
      status: text.includes("✓") || text.toLowerCase().includes("looks good") ? "ok" : "review",
      summary: "Analysis complete",
      issues: [],
    };
  } catch (err) {
    log(T.error(`✗ API error: ${err.message}`));
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// File Processing - with CLEAR feedback
// ═══════════════════════════════════════════════════════════════════════════

async function processFile(filePath) {
  const relativePath = path.relative(PROJECT_PATH, filePath);
  const fileName = path.basename(filePath);
  
  if (!fs.existsSync(filePath)) return;
  
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    log(T.error(`✗ Cannot read: ${fileName}`));
    return;
  }
  
  if (!content.trim()) {
    stats.skipped++;
    return;
  }
  
  // Skip if unchanged
  const contentHash = simpleHash(content);
  if (analysisCache.get(filePath) === contentHash) {
    stats.skipped++;
    logVerbose(`⊘ Skipped (no changes): ${fileName}`);
    return;
  }
  
  log(T.accent(`⏳ Analyzing: ${fileName}...`));
  logVerbose(`File size: ${content.length} chars, ${content.split("\n").length} lines`);
  
  stats.analyzed++;
  const startTime = Date.now();
  const result = await analyzeWithContext(filePath);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!result) {
    log(T.error(`✗ Analysis failed for ${fileName}`));
    return;
  }
  
  logVerbose(`Analysis complete in ${duration}s`);
  
  analysisCache.set(filePath, contentHash);
  changedFiles.add(relativePath);
  
  const hasIssues = result.status !== "ok" && result.issues?.length > 0;
  
  // Store result for summary
  analysisResults.push({
    file: relativePath,
    fileName,
    duration,
    hasIssues,
    issues: result.issues || [],
    summary: result.summary,
  });
  
  // CLEAR OUTPUT
  if (hasIssues) {
    stats.issues += result.issues.length;
    log(T.warning(`⚠ ${fileName} - Found ${result.issues.length} issue(s) (${duration}s)`));
    
    // Show each issue clearly
    for (const issue of result.issues) {
      if (issue.type === "bug") stats.issuesByType.bugs++;
      else if (issue.type === "security") stats.issuesByType.security++;
      else if (issue.type === "performance") stats.issuesByType.performance++;
      else stats.issuesByType.style++;
      
      if (issue.severity) {
        stats.severityCounts[issue.severity] = (stats.severityCounts[issue.severity] || 0) + 1;
      }
      
      const icon = { bug: "🐛", security: "🔒", performance: "⚡", style: "💅" }[issue.type] || "⚠";
      const sevColor = { critical: T.error, high: T.warning, medium: chalk.white, low: T.dim }[issue.severity] || T.dim;
      
      console.log(`     ${icon} ${sevColor(`[${issue.severity?.toUpperCase() || "INFO"}]`)} ${issue.description || "Issue detected"}`);
      if (issue.line) {
        console.log(T.dim(`        Line ${issue.line}`));
      }
    }
  } else {
    log(T.success(`✓ ${fileName} - ${result.summary || "No issues found"} (${duration}s)`));
  }
  
  console.log(""); // Empty line for readability
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
  }, WATCHER_DEBOUNCE));
}


// ═══════════════════════════════════════════════════════════════════════════
// Commit Message - CORRECT DATE FORMAT
// ═══════════════════════════════════════════════════════════════════════════

async function generateCommitMessage() {
  if (changedFiles.size === 0) return null;
  
  const fileList = Array.from(changedFiles).slice(0, 10).join(", ");
  
  // CORRECT DATE: DDMMYY format (e.g., 291224 for Dec 29, 2024)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;
  
  try {
    const response = await client.agents.messages.create(agentId, {
      input: `Generate a SHORT git commit message for these files: ${fileList}. 
Just describe what changed in 5-10 words. Reply with ONLY the description, nothing else.`
    });
    
    let desc = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    desc = desc.replace(/^["']|["']$/g, "").trim(); // Remove quotes
    
    if (!desc || desc.length < 3) {
      desc = `Update ${changedFiles.size} file(s)`;
    }
    
    return `${dateStr} - ${desc}`;
  } catch (err) {
    return `${dateStr} - Update ${changedFiles.size} file(s)`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Summary - DETAILED and USEFUL
// ═══════════════════════════════════════════════════════════════════════════

async function showSessionSummary() {
  console.log("");
  console.log(T.accent(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                    📊 SESSION SUMMARY                        ║
  ╚══════════════════════════════════════════════════════════════╝
`));
  
  // Stats
  console.log(`  ${T.dim("Duration:")}    ${chalk.magenta(getUptime())}`);
  console.log(`  ${T.dim("Analyzed:")}    ${T.success(stats.analyzed)} files`);
  console.log(`  ${T.dim("Issues:")}      ${stats.issues > 0 ? T.warning(stats.issues) : T.success("0")}`);
  console.log(`  ${T.dim("Fixed:")}       ${T.accent(stats.fixed)}`);
  console.log(`  ${T.dim("Skipped:")}     ${T.dim(stats.skipped)}`);
  console.log("");
  
  // Issue breakdown
  if (stats.issues > 0) {
    console.log(T.dim("  Issue Breakdown:"));
    console.log(`     🐛 Bugs: ${stats.issuesByType.bugs}  🔒 Security: ${stats.issuesByType.security}  ⚡ Perf: ${stats.issuesByType.performance}  💅 Style: ${stats.issuesByType.style}`);
    console.log(`     ${T.error("Critical:")} ${stats.severityCounts.critical}  ${T.warning("High:")} ${stats.severityCounts.high}  Medium: ${stats.severityCounts.medium}  ${T.dim("Low:")} ${stats.severityCounts.low}`);
    console.log("");
  }
  
  // Files analyzed
  if (changedFiles.size > 0) {
    console.log(T.accent(`  📁 Files Analyzed (${changedFiles.size}):`));
    
    for (const result of analysisResults.slice(-10)) {
      const icon = result.hasIssues ? T.warning("⚠") : T.success("✓");
      const issueCount = result.issues?.length || 0;
      const issueText = issueCount > 0 ? T.warning(` (${issueCount} issues)`) : "";
      console.log(`     ${icon} ${result.fileName}${issueText}`);
    }
    
    if (analysisResults.length > 10) {
      console.log(T.dim(`     ... and ${analysisResults.length - 10} more`));
    }
    console.log("");
  }
  
  // Issues found (detailed)
  const allIssues = analysisResults.flatMap(r => r.issues?.map(i => ({ ...i, file: r.fileName })) || []);
  if (allIssues.length > 0) {
    console.log(T.warning(`  ⚠ Issues Found (${allIssues.length}):`));
    for (const issue of allIssues.slice(0, 8)) {
      const icon = { bug: "🐛", security: "🔒", performance: "⚡", style: "💅" }[issue.type] || "⚠";
      console.log(`     ${icon} ${T.dim(issue.file + ":")} ${issue.description?.slice(0, 50) || "Issue"}`);
    }
    if (allIssues.length > 8) {
      console.log(T.dim(`     ... and ${allIssues.length - 8} more issues`));
    }
    console.log("");
  }
}

async function showCommitOptions() {
  console.log(T.dim("  " + "─".repeat(60)));
  console.log("");
  
  if (changedFiles.size === 0) {
    console.log(T.dim("  No files were analyzed during this session."));
    console.log(T.dim("  No commit message needed."));
    console.log("");
    return;
  }
  
  // Show git status
  const gitBranch = getGitBranch();
  const gitStatus = getGitStatus();
  
  if (gitBranch) {
    console.log(T.accent("  📊 Git Status:"));
    console.log(`     Branch: ${chalk.magenta(gitBranch)}`);
    if (gitStatus && gitStatus.total > 0) {
      console.log(`     ${T.warning(`${gitStatus.total} uncommitted changes`)}`);
    } else {
      console.log(`     ${T.success("Working tree clean")}`);
    }
    console.log("");
  }
  
  // Generate commit message
  console.log(T.accent("  📝 Generating commit message..."));
  const commitMsg = await generateCommitMessage();
  
  if (commitMsg) {
    console.log("");
    console.log(T.success("  ✓ Suggested commit message:"));
    console.log("");
    console.log(chalk.bgBlack.white(`     ${commitMsg}     `));
    console.log("");
    
    // Save to file
    fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), commitMsg, "utf8");
    console.log(T.dim(`  (Saved to .commit_msg)`));
    console.log("");
    
    console.log(T.accent("  📋 Quick Commands:"));
    console.log("");
    console.log(T.dim("  Stage all & commit:"));
    console.log(T.accent(`     git add -A && git commit -m "${commitMsg}"`));
    console.log("");
    console.log(T.dim("  Stage, commit & push:"));
    console.log(T.accent(`     git add -A && git commit -m "${commitMsg}" && git push`));
    console.log("");
  }
}

async function promptNextAction() {
  // Small delay to ensure stdin is ready for input
  await new Promise(r => setTimeout(r, 50));
  
  console.log(T.dim("  " + "─".repeat(60)));
  console.log("");
  console.log(T.accent("  What would you like to do next?"));
  console.log("");
  console.log(`  ${T.accent("[1]")} Return to main menu`);
  console.log(`  ${T.accent("[2]")} Run git commit now (opens prompt)`);
  console.log(`  ${T.accent("[3]")} Exit`);
  console.log("");
  
  return new Promise((resolve) => {
    // Ensure stdin is in line mode
    if (process.stdin.isTTY) {
      try { process.stdin.setRawMode(false); } catch (e) {}
    }
    process.stdin.resume();
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(T.accent("  Your choice (1-3): "), async (answer) => {
      rl.close();
      const choice = answer.trim();
      
      if (choice === "2") {
        // Run git commit
        await runGitCommit();
        resolve("menu");
      } else if (choice === "1") {
        resolve("menu");
      } else {
        resolve("exit");
      }
    });
  });
}

async function runGitCommit() {
  const commitMsgPath = path.join(PROJECT_PATH, ".commit_msg");
  let commitMsg = "";
  
  if (fs.existsSync(commitMsgPath)) {
    commitMsg = fs.readFileSync(commitMsgPath, "utf8").trim();
  }
  
  console.log("");
  console.log(T.accent("  🚀 Running Git Commit..."));
  console.log("");
  
  try {
    const { execSync } = await import("child_process");
    
    // Stage all changes
    console.log(T.dim("  Staging all changes..."));
    execSync("git add -A", { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(T.success("  ✓ Changes staged"));
    
    // Commit
    console.log(T.dim(`  Committing with message: "${commitMsg}"`));
    execSync(`git commit -m "${commitMsg}"`, { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(T.success("  ✓ Commit successful!"));
    
    // Ask about push
    console.log("");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    await new Promise((resolve) => {
      rl.question(T.accent("  Push to remote? (y/n): "), async (answer) => {
        rl.close();
        if (answer.trim().toLowerCase() === "y") {
          console.log(T.dim("  Pushing..."));
          try {
            execSync("git push", { cwd: PROJECT_PATH, stdio: "pipe" });
            console.log(T.success("  ✓ Pushed successfully!"));
          } catch (e) {
            console.log(T.error(`  ✗ Push failed: ${e.message}`));
          }
        }
        resolve();
      });
    });
    
  } catch (err) {
    console.log(T.error(`  ✗ Git error: ${err.message}`));
    console.log(T.dim("  You can run the commands manually."));
  }
  
  console.log("");
  await new Promise(r => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(T.dim("  Press Enter to continue..."), () => { rl.close(); r(); });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Watcher Setup
// ═══════════════════════════════════════════════════════════════════════════

const IGNORE = [
  "**/node_modules/**", "**/.git/**", "**/.next/**", "**/dist/**",
  "**/build/**", "**/coverage/**", "**/.letta-backups/**",
  "**/*.min.js", "**/*.map", "**/.kiro/**", "**/package-lock.json", "**/.env*",
];

// ═══════════════════════════════════════════════════════════════════════════
// Start - Show header ONCE, then just log events
// ═══════════════════════════════════════════════════════════════════════════

showHeader();
log(T.accent("Starting file watcher..."));

watcher = chokidar.watch(PROJECT_PATH.replace(/\\/g, "/"), {
  ignored: IGNORE,
  ignoreInitial: true,
  persistent: true,
  usePolling: process.platform === "win32",
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  depth: WATCHER_DEPTH,
});

watcher.on("ready", () => {
  isReady = true;
  const watchedPaths = watcher.getWatched();
  const totalWatched = Object.values(watchedPaths).flat().length;
  log(T.success(`✓ Watcher ready! Monitoring ${totalWatched} files`));
  log(T.dim("Waiting for file changes... (edit a file to trigger analysis)"));
  console.log("");
  
  // Start keyboard listener after watcher is ready
  setTimeout(setupKeyboardListener, 100);
});

watcher.on("change", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  log(T.accent(`📝 File changed: ${rel}`));
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  log(T.success(`➕ File added: ${rel}`));
  scheduleAnalysis(filePath);
});

watcher.on("unlink", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const rel = path.relative(PROJECT_PATH, filePath);
  log(T.error(`➖ File deleted: ${rel}`));
  analysisCache.delete(filePath);
});

watcher.on("error", (err) => {
  log(T.error(`✗ Watcher error: ${err.message}`));
});

// ═══════════════════════════════════════════════════════════════════════════
// Shutdown - Show FULL summary and commit options
// ═══════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;
let shutdownComplete = false;

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  // Disable raw mode so readline prompts work
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch (e) {}
  }
  process.stdin.removeAllListeners("data");
  process.stdin.pause();
  
  console.log("");
  log(T.dim("Stopping watcher..."));
  
  if (watcher) {
    try {
      await watcher.close();
    } catch (e) {
      // Ignore close errors
    }
  }
  
  await showSessionSummary();
  await showCommitOptions();
  
  const action = await promptNextAction();
  
  shutdownComplete = true;
  
  if (action === "menu") {
    if (RETURN_TO_MENU) {
      process.exit(100);
    } else {
      console.log(T.accent("\n  Returning to main menu...\n"));
      const { spawn } = await import("child_process");
      spawn("node", [path.join(ROOT, "scripts/cli.js")], {
        stdio: "inherit",
        cwd: ROOT,
        shell: true,
      });
      process.exit(0);
    }
  } else {
    console.log(T.accent("\n  ♥ Thanks for using Letta! Happy coding!\n"));
    process.exit(0);
  }
}

// Synchronous shutdown for when async isn't possible (Windows Ctrl+C)
function syncShutdown() {
  if (shutdownComplete) return;
  
  console.log("");
  console.log(T.dim("  " + dayjs().format("HH:mm:ss") + " Stopping watcher..."));
  
  // Show quick summary synchronously
  console.log("");
  console.log(T.accent(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                    📊 SESSION SUMMARY                        ║
  ╚══════════════════════════════════════════════════════════════╝
`));
  console.log(`  ${T.dim("Duration:")}    ${chalk.magenta(getUptime())}`);
  console.log(`  ${T.dim("Analyzed:")}    ${T.success(stats.analyzed)} files`);
  console.log(`  ${T.dim("Issues:")}      ${stats.issues > 0 ? T.warning(stats.issues) : T.success("0")}`);
  console.log(`  ${T.dim("Fixed:")}       ${T.accent(stats.fixed)}`);
  console.log("");
  
  if (changedFiles.size > 0) {
    // Generate commit message synchronously
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;
    const commitMsg = `${dateStr} - Update ${changedFiles.size} file(s)`;
    
    console.log(T.dim("  " + "─".repeat(60)));
    console.log("");
    console.log(T.success("  📝 Quick commit command:"));
    console.log("");
    console.log(chalk.bgBlack.white(`     ${commitMsg}     `));
    console.log("");
    console.log(T.accent(`     git add -A && git commit -m "${commitMsg}"`));
    console.log("");
  }
  
  console.log(T.dim("  " + "─".repeat(60)));
  console.log(T.accent("\n  ♥ Thanks for using Letta! Happy coding!\n"));
  console.log(T.dim("  To see full options, press 'q' instead of Ctrl+C next time.\n"));
}

// Handle various termination signals
process.on("SIGINT", () => {
  // On Windows, SIGINT from Ctrl+C may not allow async operations
  // Try async first, but have sync fallback ready
  if (process.platform === "win32") {
    // Windows: Show sync summary immediately, then try async
    syncShutdown();
    process.exit(0);
  } else {
    shutdown();
  }
});

process.on("SIGTERM", shutdown);

// Fallback for Windows - runs when process is about to exit
process.on("exit", (code) => {
  if (!shutdownComplete && !isShuttingDown && stats.analyzed > 0) {
    syncShutdown();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Keyboard Input - Press 'q' or 'Q' to quit gracefully
// ═══════════════════════════════════════════════════════════════════════════

function setupKeyboardListener() {
  // Set up raw mode to capture individual keypresses
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    
    process.stdin.on("data", (key) => {
      // Ctrl+C - on Windows this shows quick summary
      if (key === "\u0003") {
        if (process.platform === "win32") {
          syncShutdown();
          process.exit(0);
        } else {
          shutdown();
        }
        return;
      }
      
      // 'q' or 'Q' to quit - FULL interactive shutdown
      if (key === "q" || key === "Q") {
        shutdown();
        return;
      }
      
      // Escape key
      if (key === "\u001B") {
        shutdown();
        return;
      }
    });
    
    if (process.platform === "win32") {
      log(T.success("Press 'q' for full summary + commit options (recommended)"));
    } else {
      log(T.dim("Press 'q' or Ctrl+C to stop and see session summary"));
    }
    console.log("");
  } else {
    // Non-TTY fallback (e.g., piped input)
    const rlShutdown = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rlShutdown.on("SIGINT", () => {
      shutdown();
    });
    
    rlShutdown.on("line", (line) => {
      if (line.trim().toLowerCase() === "q" || line.trim().toLowerCase() === "quit") {
        shutdown();
      }
    });
  }
}
