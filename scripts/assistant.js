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
import { execSync } from "child_process";
import {
  detectProjectType,
  scanProjectStructure,
  buildAnalysisContext,
} from "./analyzer.js";
import {
  detectIDE,
  isAgenticIDE,
  getCollaborationSettings,
} from "../src/core/ideDetector.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

// CLI Arguments
const PROJECT_PATH = process.argv[2] ? path.resolve(process.argv[2]) : null;
const AUTO_FIX = process.argv.includes("--auto-fix") || process.env.AUTO_APPLY === "true";
const DEBUG = process.argv.includes("--debug") || process.env.DEBUG === "true";
const RETURN_TO_MENU = process.argv.includes("--return-to-menu");

// IDE Detection (done early for display)
let detectedIDE = null;
let collaborationSettings = null;
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
    const status = execSync("git status --porcelain", { 
      cwd: PROJECT_PATH, 
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    
    // Don't trim individual lines - the leading space is significant!
    const lines = status.split("\n").filter(l => l.length >= 3);
    
    // Parse git status codes more comprehensively
    // Format: XY filename (where X=staged status, Y=unstaged status)
    // M = modified, A = added, D = deleted, R = renamed, C = copied, U = unmerged, ? = untracked
    let modified = 0;
    let added = 0;
    let deleted = 0;
    const changedFilesList = [];
    
    for (const line of lines) {
      const staged = line[0];    // First char: staged status
      const unstaged = line[1];  // Second char: unstaged status
      const fileName = line.slice(3); // Rest is filename (after "XY ")
      
      if (DEBUG) {
        console.log(`Git status line: "${line}" -> staged="${staged}" unstaged="${unstaged}" file="${fileName}"`);
      }
      
      // Count modifications (either staged or unstaged)
      if (staged === "M" || unstaged === "M") {
        modified++;
        changedFilesList.push({ status: "M", file: fileName });
      }
      // Count additions (new files, either staged or untracked)
      else if (staged === "A" || staged === "?" || unstaged === "A") {
        added++;
        changedFilesList.push({ status: "A", file: fileName });
      }
      // Count deletions
      else if (staged === "D" || unstaged === "D") {
        deleted++;
        changedFilesList.push({ status: "D", file: fileName });
      }
      // Renamed files count as modified
      else if (staged === "R") {
        modified++;
        changedFilesList.push({ status: "R", file: fileName });
      }
      // Untracked files (both columns are ?)
      else if (staged === "?" && unstaged === "?") {
        added++;
        changedFilesList.push({ status: "?", file: fileName });
      }
      // Any other change
      else if (staged !== " " || unstaged !== " ") {
        modified++;
        changedFilesList.push({ status: staged !== " " ? staged : unstaged, file: fileName });
      }
    }
    
    if (DEBUG) {
      console.log(`Git status result: ${modified} modified, ${added} added, ${deleted} deleted, ${lines.length} total`);
    }
    
    return {
      modified,
      added,
      deleted,
      total: lines.length,
      files: changedFilesList,
    };
  } catch (err) {
    if (DEBUG) console.log("Git status error:", err.message);
    return null;
  }
}

// Get detailed git diff for better commit messages
function getGitDiffSummary() {
  try {
    // Get diff stat for staged and unstaged changes
    let diffStat = "";
    try {
      // Staged changes
      diffStat += execSync("git diff --cached --stat", { 
        cwd: PROJECT_PATH, 
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch {}
    
    try {
      // Unstaged changes
      diffStat += execSync("git diff --stat", { 
        cwd: PROJECT_PATH, 
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch {}
    
    // Get list of changed files with their types
    const status = getGitStatus();
    if (!status) return null;
    
    // Categorize files
    const categories = {
      components: [],
      utils: [],
      tests: [],
      styles: [],
      configs: [],
      docs: [],
      other: [],
    };
    
    for (const { file, status: fileStatus } of status.files || []) {
      const fileName = path.basename(file);
      const ext = path.extname(file);
      
      if (file.includes("test") || file.includes("spec")) {
        categories.tests.push(fileName);
      } else if (file.includes("component") || fileName.match(/^[A-Z].*\.(jsx|tsx)$/)) {
        categories.components.push(fileName);
      } else if (file.includes("util") || file.includes("helper") || file.includes("lib")) {
        categories.utils.push(fileName);
      } else if ([".css", ".scss", ".less", ".sass"].includes(ext)) {
        categories.styles.push(fileName);
      } else if (fileName.includes("config") || fileName.endsWith(".json") || fileName.startsWith(".")) {
        categories.configs.push(fileName);
      } else if ([".md", ".txt", ".rst"].includes(ext)) {
        categories.docs.push(fileName);
      } else {
        categories.other.push(fileName);
      }
    }
    
    return {
      diffStat,
      categories,
      totalFiles: status.total,
      modified: status.modified,
      added: status.added,
      deleted: status.deleted,
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
  const totalDirs = projectStructure?.totalDirs || 0;
  const totalSize = projectStructure?.totalSize || 0;
  const comps = projectStructure?.components?.length || 0;
  const utils = projectStructure?.utils?.length || 0;
  const hooks = projectStructure?.hooks?.length || 0;
  const tests = projectStructure?.testFiles?.length || 0;
  const configs = projectStructure?.configFiles?.length || 0;
  const types = projectStructure?.types?.length || 0;
  const scripts = projectStructure?.scripts?.length || 0;
  const core = projectStructure?.core?.length || 0;
  const api = projectStructure?.api?.length || 0;
  const models = projectStructure?.models?.length || 0;
  const services = projectStructure?.services?.length || 0;
  const templates = projectStructure?.templates?.length || 0;
  const styles = projectStructure?.styles?.length || 0;
  const docs = projectStructure?.docs?.length || 0;
  const recentlyModified = projectStructure?.recentlyModified || [];
  
  const gitBranch = getGitBranch();
  const gitStatus = getGitStatus();
  const lastCommit = getLastCommitInfo();
  
  // Get package.json info
  const pkg = projectType?.packageJson || {};
  const description = pkg.description || null;
  const deps = Object.keys(pkg.dependencies || {}).length;
  const devDeps = Object.keys(pkg.devDependencies || {}).length;
  
  // Detect tools
  const tools = [];
  if (projectType?.hasJest) tools.push("Jest");
  if (projectType?.hasVitest) tools.push("Vitest");
  if (projectType?.hasMocha) tools.push("Mocha");
  if (projectType?.hasEslint) tools.push("ESLint");
  if (projectType?.hasPrettier) tools.push("Prettier");
  if (lang === "typescript") tools.push("TypeScript");
  
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (allDeps.webpack) tools.push("Webpack");
  if (allDeps.vite) tools.push("Vite");
  if (allDeps.nodemon) tools.push("Nodemon");
  
  // Available scripts
  const npmScripts = projectType?.scripts || {};
  const availableScripts = ["dev", "start", "build", "test", "lint", "watch"].filter(s => npmScripts[s]);

  console.clear();
  
  // ═══════════════════════════════════════════════════════════════════════
  // CLEAN HEADER - Minimal and elegant
  // ═══════════════════════════════════════════════════════════════════════
  console.log("");
  console.log(T.accent("  ╭─────────────────────────────────────────────────────────────────╮"));
  console.log(T.accent("  │") + chalk.bold.white("  🤖 LETTA CODE WATCHER                                         ") + T.accent("│"));
  console.log(T.accent("  ╰─────────────────────────────────────────────────────────────────╯"));
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // PROJECT CARD - Clean two-column layout
  // ═══════════════════════════════════════════════════════════════════════
  const versionStr = version ? chalk.dim(`v${version}`) : "";
  const langIcon = lang === "typescript" ? chalk.blue("TS") : chalk.yellow("JS");
  const fwIcon = fw === "node" ? "⬢" : fw === "react" ? "⚛" : fw === "vue" ? "🟢" : fw === "next" ? "▲" : "◆";
  
  // Size formatting
  const sizeStr = totalSize > 1024 * 1024 
    ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB` 
    : `${Math.round(totalSize / 1024)}KB`;
  
  console.log(`  ${chalk.bold.white(projectName)} ${versionStr}`);
  if (description) {
    const shortDesc = description.length > 50 ? description.slice(0, 47) + "..." : description;
    console.log(T.dim(`  ${shortDesc}`));
  }
  console.log("");
  
  // Stats row - compact and visual
  console.log(`  ${fwIcon} ${chalk.white(fw)} ${langIcon}  ${T.dim("│")}  ${chalk.white(total)} files  ${T.dim("│")}  ${chalk.cyan(deps)}+${chalk.yellow(devDeps)} deps  ${T.dim("│")}  ${sizeStr}`);
  console.log("");
  
  // Structure - smart grouping (only show what exists)
  const structItems = [];
  if (core > 0) structItems.push(`${chalk.magenta(core)} core`);
  if (scripts > 0) structItems.push(`${chalk.blue(scripts)} scripts`);
  if (api > 0) structItems.push(`${chalk.cyan(api)} api`);
  if (services > 0) structItems.push(`${chalk.green(services)} services`);
  if (comps > 0) structItems.push(`${chalk.magenta(comps)} components`);
  if (utils > 0) structItems.push(`${chalk.blue(utils)} utils`);
  if (templates > 0) structItems.push(`${chalk.green(templates)} templates`);
  if (tests > 0) structItems.push(`${chalk.green(tests)} tests`);
  if (configs > 0) structItems.push(`${chalk.gray(configs)} configs`);
  
  if (structItems.length > 0) {
    // Show in rows of 4
    const row1 = structItems.slice(0, 4).join(T.dim(" · "));
    const row2 = structItems.slice(4, 8).join(T.dim(" · "));
    console.log(`  ${row1}`);
    if (row2) console.log(`  ${row2}`);
    console.log("");
  }
  
  // Tools & Scripts - single line each
  if (tools.length > 0) {
    console.log(`  ${T.dim("Tools")} ${tools.slice(0, 6).map(t => T.accent(t)).join(T.dim(" · "))}`);
  }
  if (availableScripts.length > 0) {
    console.log(`  ${T.dim("npm")}   ${availableScripts.map(s => chalk.white(s)).join(T.dim(" │ "))}`);
  }
  
  console.log("");
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // GIT & IDE - Side by side info
  // ═══════════════════════════════════════════════════════════════════════
  
  // Git status
  if (gitBranch) {
    const branchIcon = gitBranch === "main" || gitBranch === "master" ? "●" : "○";
    const statusDot = gitStatus?.total > 0 ? T.warning("◆") : T.success("◆");
    const statusText = gitStatus?.total > 0 
      ? T.warning(`${gitStatus.total} uncommitted`)
      : T.success("clean");
    
    console.log(`  ${T.dim("git")} ${branchIcon} ${chalk.magenta(gitBranch)} ${statusDot} ${statusText}`);
    
    if (lastCommit) {
      const shortMsg = lastCommit.message?.length > 35 ? lastCommit.message.slice(0, 32) + "..." : lastCommit.message;
      console.log(T.dim(`      ${lastCommit.hash} ${shortMsg}`));
    }
    console.log("");
  }
  
  // IDE Detection
  detectedIDE = detectIDE(PROJECT_PATH);
  collaborationSettings = getCollaborationSettings(PROJECT_PATH);
  
  const ide = detectedIDE.primary;
  const ideIcon = ide.type === "agentic" ? "🤖" : ide.type === "modern" ? "⚡" : "📝";
  
  if (ide.type === "agentic") {
    console.log(`  ${ideIcon} ${chalk.bold.white(ide.name)} ${chalk.bgMagenta.white(" AI ")} ${T.success("collaboration enabled")}`);
  } else {
    console.log(`  ${ideIcon} ${chalk.white(ide.name)}`);
  }
  
  console.log("");
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // SESSION STATUS - Clean badges
  // ═══════════════════════════════════════════════════════════════════════
  const modeBadge = AUTO_FIX 
    ? chalk.bgGreen.black(" AUTO-FIX ") 
    : chalk.bgBlue.white(" WATCH ");
  
  console.log(`  ${modeBadge} ${T.dim("Theme:")} ${T.accent(THEME_NAME)} ${T.dim("│")} ${T.dim("Debounce:")} ${chalk.white(WATCHER_DEBOUNCE + "ms")}`);
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════════════
  // CONTROLS - Clear and helpful
  // ═══════════════════════════════════════════════════════════════════════
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log(`  ${T.accent("q")} quit & commit  ${T.dim("│")}  ${T.accent("Ctrl+C")} quick exit  ${T.dim("│")}  ${T.accent("npm start")} menu`);
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
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
  
  // Check for @letta-ignore comment - skip analysis for demo/test files
  if (content.includes("@letta-ignore")) {
    stats.skipped++;
    logVerbose(`⊘ Skipped (@letta-ignore): ${fileName}`);
    return;
  }
  
  // Skip if unchanged
  const contentHash = simpleHash(content);
  if (analysisCache.get(filePath) === contentHash) {
    stats.skipped++;
    logVerbose(`⊘ Skipped (no changes): ${fileName}`);
    return;
  }
  
  log(`${T.accent("●")} ${fileName}...`);
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
  
  // Clean output
  if (hasIssues) {
    stats.issues += result.issues.length;
    log(`${T.warning("⚠")} ${fileName} ${T.dim(`(${result.issues.length} issues, ${duration}s)`)}`);
    
    // Show issues compactly
    for (const issue of result.issues) {
      if (issue.type === "bug") stats.issuesByType.bugs++;
      else if (issue.type === "security") stats.issuesByType.security++;
      else if (issue.type === "performance") stats.issuesByType.performance++;
      else stats.issuesByType.style++;
      
      if (issue.severity) {
        stats.severityCounts[issue.severity] = (stats.severityCounts[issue.severity] || 0) + 1;
      }
      
      const sevIcon = { critical: "!", high: "!", medium: "·", low: "·" }[issue.severity] || "·";
      const sevColor = { critical: T.error, high: T.warning, medium: chalk.white, low: T.dim }[issue.severity] || T.dim;
      const lineInfo = issue.line ? T.dim(` L${issue.line}`) : "";
      
      console.log(`       ${sevColor(sevIcon)} ${issue.description || "Issue detected"}${lineInfo}`);
    }
  } else {
    log(`${T.success("✓")} ${fileName} ${T.dim(`(${duration}s)`)}`);
  }
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
// Commit Message - Intelligent Generation
// ═══════════════════════════════════════════════════════════════════════════

function getDateStr() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

async function generateCommitMessage() {
  const dateStr = getDateStr();
  const gitStatus = getGitStatus();
  const diffSummary = getGitDiffSummary();
  
  // If no changes detected, return null
  if (!gitStatus || gitStatus.total === 0) {
    return null;
  }
  
  // Build context for AI
  const fileList = gitStatus.files?.map(f => f.file).slice(0, 15) || [];
  const categories = diffSummary?.categories || {};
  
  // Build a detailed context string
  let contextParts = [];
  
  if (categories.components?.length > 0) {
    contextParts.push(`Components: ${categories.components.slice(0, 5).join(", ")}`);
  }
  if (categories.utils?.length > 0) {
    contextParts.push(`Utils: ${categories.utils.slice(0, 5).join(", ")}`);
  }
  if (categories.tests?.length > 0) {
    contextParts.push(`Tests: ${categories.tests.slice(0, 5).join(", ")}`);
  }
  if (categories.styles?.length > 0) {
    contextParts.push(`Styles: ${categories.styles.slice(0, 3).join(", ")}`);
  }
  if (categories.configs?.length > 0) {
    contextParts.push(`Configs: ${categories.configs.slice(0, 3).join(", ")}`);
  }
  if (categories.docs?.length > 0) {
    contextParts.push(`Docs: ${categories.docs.slice(0, 3).join(", ")}`);
  }
  if (categories.other?.length > 0) {
    contextParts.push(`Other: ${categories.other.slice(0, 5).join(", ")}`);
  }
  
  // Build change summary
  const changeSummary = [];
  if (gitStatus.modified > 0) changeSummary.push(`${gitStatus.modified} modified`);
  if (gitStatus.added > 0) changeSummary.push(`${gitStatus.added} added`);
  if (gitStatus.deleted > 0) changeSummary.push(`${gitStatus.deleted} deleted`);
  
  // Also include analysis results if available
  let analysisContext = "";
  if (analysisResults.length > 0) {
    const issueFiles = analysisResults.filter(r => r.hasIssues);
    const cleanFiles = analysisResults.filter(r => !r.hasIssues);
    
    if (issueFiles.length > 0) {
      const issueTypes = new Set();
      issueFiles.forEach(r => r.issues?.forEach(i => issueTypes.add(i.type)));
      analysisContext = `\nAnalysis found issues in ${issueFiles.length} file(s): ${Array.from(issueTypes).join(", ")} issues.`;
    }
    if (cleanFiles.length > 0) {
      analysisContext += `\n${cleanFiles.length} file(s) passed analysis with no issues.`;
    }
  }
  
  try {
    const prompt = `Generate a professional git commit message for these changes:

FILES CHANGED (${gitStatus.total} total - ${changeSummary.join(", ")}):
${contextParts.length > 0 ? contextParts.join("\n") : fileList.join(", ")}
${analysisContext}

REQUIREMENTS:
1. Start with a type prefix: feat:, fix:, refactor:, style:, docs:, test:, chore:
2. Be specific about WHAT changed (not just file names)
3. Keep it under 72 characters
4. Use present tense ("Add" not "Added")
5. Be descriptive but concise

Examples of GOOD commit messages:
- "feat: Add IDE detection for agentic collaboration"
- "fix: Resolve git status parsing for untracked files"
- "refactor: Improve commit message generation with AI context"
- "style: Update dashboard theme colors and layout"
- "docs: Add configuration options to README"

Reply with ONLY the commit message (without the date prefix), nothing else.`;

    const response = await client.agents.messages.create(agentId, { input: prompt });
    
    let desc = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    desc = desc.replace(/^["']|["']$/g, "").trim();
    
    // Clean up the message
    desc = desc.replace(/^(commit:?\s*)/i, "");
    
    // Ensure it has a type prefix, add one if missing
    if (!desc.match(/^(feat|fix|refactor|style|docs|test|chore|perf|build|ci):/i)) {
      // Determine type based on changes
      if (categories.tests?.length > 0 && categories.tests.length >= gitStatus.total / 2) {
        desc = `test: ${desc}`;
      } else if (categories.docs?.length > 0 && categories.docs.length >= gitStatus.total / 2) {
        desc = `docs: ${desc}`;
      } else if (categories.styles?.length > 0 && categories.styles.length >= gitStatus.total / 2) {
        desc = `style: ${desc}`;
      } else if (categories.configs?.length > 0 && categories.configs.length >= gitStatus.total / 2) {
        desc = `chore: ${desc}`;
      } else if (gitStatus.added > gitStatus.modified) {
        desc = `feat: ${desc}`;
      } else {
        desc = `refactor: ${desc}`;
      }
    }
    
    // Truncate if too long
    if (desc.length > 70) {
      desc = desc.slice(0, 67) + "...";
    }
    
    if (!desc || desc.length < 5) {
      desc = generateFallbackMessage(gitStatus, categories);
    }
    
    return `${dateStr} - ${desc}`;
  } catch (err) {
    if (DEBUG) console.log("Commit message generation error:", err.message);
    return `${dateStr} - ${generateFallbackMessage(gitStatus, categories)}`;
  }
}

function generateFallbackMessage(gitStatus, categories) {
  // Generate a smart fallback message based on file categories
  const parts = [];
  
  if (categories?.components?.length > 0) {
    parts.push(`update ${categories.components[0]}`);
  } else if (categories?.utils?.length > 0) {
    parts.push(`update ${categories.utils[0]}`);
  } else if (categories?.tests?.length > 0) {
    return `test: Update ${categories.tests.length} test file(s)`;
  } else if (categories?.docs?.length > 0) {
    return `docs: Update documentation`;
  } else if (categories?.configs?.length > 0) {
    return `chore: Update configuration`;
  } else if (categories?.styles?.length > 0) {
    return `style: Update styles`;
  }
  
  if (parts.length > 0) {
    return `refactor: ${parts[0]}${gitStatus?.total > 1 ? ` and ${gitStatus.total - 1} more` : ""}`;
  }
  
  return `chore: Update ${gitStatus?.total || "multiple"} file(s)`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Summary - Clean and informative
// ═══════════════════════════════════════════════════════════════════════════

async function showSessionSummary() {
  console.log("");
  console.log(T.accent("  ╭─────────────────────────────────────────────────────────────────╮"));
  console.log(T.accent("  │") + chalk.bold.white("  📊 SESSION SUMMARY                                            ") + T.accent("│"));
  console.log(T.accent("  ╰─────────────────────────────────────────────────────────────────╯"));
  console.log("");
  
  // Stats row - clean and visual
  const uptimeStr = chalk.white(getUptime());
  const analyzedStr = stats.analyzed > 0 ? T.success(`${stats.analyzed} analyzed`) : T.dim("0 analyzed");
  const issuesStr = stats.issues > 0 ? T.warning(`${stats.issues} issues`) : T.success("no issues");
  
  console.log(`  ⏱ ${uptimeStr}  │  ${analyzedStr}  │  ${issuesStr}`);
  console.log("");
  
  // Issue breakdown (if any)
  if (stats.issues > 0) {
    const issueParts = [];
    if (stats.issuesByType.bugs > 0) issueParts.push(`${stats.issuesByType.bugs} bugs`);
    if (stats.issuesByType.security > 0) issueParts.push(`${stats.issuesByType.security} security`);
    if (stats.issuesByType.performance > 0) issueParts.push(`${stats.issuesByType.performance} perf`);
    if (stats.issuesByType.style > 0) issueParts.push(`${stats.issuesByType.style} style`);
    console.log(T.dim(`  Found: ${issueParts.join(", ")}`));
    console.log("");
  }
  
  // Files analyzed - compact list
  if (analysisResults.length > 0) {
    const withIssues = analysisResults.filter(r => r.hasIssues);
    const clean = analysisResults.filter(r => !r.hasIssues);
    
    if (withIssues.length > 0) {
      console.log(`  ${T.warning("⚠")} ${withIssues.length} file(s) with issues:`);
      for (const result of withIssues.slice(0, 5)) {
        console.log(T.dim(`    ${result.fileName}`));
      }
      if (withIssues.length > 5) {
        console.log(T.dim(`    +${withIssues.length - 5} more`));
      }
      console.log("");
    }
    
    if (clean.length > 0) {
      console.log(`  ${T.success("✓")} ${clean.length} file(s) passed`);
      console.log("");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT ASSISTANT - Enhanced UX
// ═══════════════════════════════════════════════════════════════════════════

async function rlQuestion(prompt) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      try { process.stdin.setRawMode(false); } catch (e) {}
    }
    process.stdin.resume();
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function showCommitAssistant() {
  const gitBranch = getGitBranch();
  const gitStatus = getGitStatus();
  
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log("");
  console.log(T.accent("  ╭─────────────────────────────────────────────────────────────────╮"));
  console.log(T.accent("  │") + chalk.bold.white("  📝 COMMIT ASSISTANT                                           ") + T.accent("│"));
  console.log(T.accent("  ╰─────────────────────────────────────────────────────────────────╯"));
  console.log("");
  
  // Check if there are changes to commit
  if (!gitStatus || gitStatus.total === 0) {
    console.log(`  ${T.success("✓")} Working tree is clean`);
    console.log("");
    return "skip";
  }
  
  // Show git status - compact
  console.log(`  ${T.dim("git")} ● ${chalk.magenta(gitBranch || "unknown")}`);
  console.log("");
  
  // Changes summary
  const changeTypes = [];
  if (gitStatus.modified > 0) changeTypes.push(`${gitStatus.modified} modified`);
  if (gitStatus.added > 0) changeTypes.push(`${gitStatus.added} new`);
  if (gitStatus.deleted > 0) changeTypes.push(`${gitStatus.deleted} deleted`);
  
  console.log(`  ${chalk.white(gitStatus.total)} uncommitted changes ${T.dim(`(${changeTypes.join(", ")})`)}`);
  console.log("");
  
  // Show changed files - compact
  if (gitStatus.files && gitStatus.files.length > 0) {
    const filesToShow = gitStatus.files.slice(0, 6);
    for (const { status, file } of filesToShow) {
      const icon = status === "M" ? chalk.yellow("~") : status === "A" || status === "?" ? chalk.green("+") : status === "D" ? chalk.red("-") : chalk.gray("?");
      const fileName = path.basename(file);
      console.log(`  ${icon} ${fileName}`);
    }
    if (gitStatus.files.length > 6) {
      console.log(T.dim(`  +${gitStatus.files.length - 6} more`));
    }
    console.log("");
  }
  
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log("");
  
  // Options - cleaner presentation
  console.log(`  ${T.accent("1")}  Guided commit ${T.dim("— step by step")}`);
  console.log(`  ${T.accent("2")}  Auto commit ${T.dim("— stage, commit, push")}`);
  console.log(`  ${T.accent("3")}  Skip ${T.dim("— commit later")}`);
  console.log("");
  
  const choice = await rlQuestion(`  ${T.accent("→")} `);
  
  if (choice === "1") {
    return await runGuidedCommit();
  } else if (choice === "2") {
    return await runAutoCommit();
  } else {
    console.log("");
    console.log(T.dim("  Skipped. Run 'git commit' when ready."));
    return "skip";
  }
}

async function runGuidedCommit() {
  console.log("");
  
  // Generate commit message
  console.log(`  ${T.accent("●")} Generating commit message...`);
  const aiMessage = await generateCommitMessage();
  
  console.log("");
  console.log(`  ${T.dim("Message:")} ${chalk.white(aiMessage)}`);
  console.log("");
  
  // Options
  console.log(`  ${T.accent("1")}  Use this message`);
  console.log(`  ${T.accent("2")}  Edit message`);
  console.log(`  ${T.accent("3")}  Cancel`);
  console.log("");
  
  const msgChoice = await rlQuestion(`  ${T.accent("→")} `);
  
  let finalMessage = aiMessage;
  
  if (msgChoice === "2") {
    console.log("");
    const customMsg = await rlQuestion(`  ${T.dim("New message:")} `);
    if (customMsg) {
      finalMessage = customMsg;
    }
  } else if (msgChoice === "3") {
    console.log(T.dim("  Cancelled."));
    return "cancel";
  }
  
  // Save message
  fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), finalMessage, "utf8");
  
  // Stage files
  console.log("");
  console.log(`  ${T.accent("1")}  Stage all ${T.dim("(git add -A)")}`);
  console.log(`  ${T.accent("2")}  Stage tracked only ${T.dim("(git add -u)")}`);
  console.log(`  ${T.accent("3")}  Cancel`);
  console.log("");
  
  const stageChoice = await rlQuestion(`  ${T.accent("→")} `);
  
  if (stageChoice === "3") {
    console.log(T.dim("  Cancelled."));
    return "cancel";
  }
  
  try {
    const stageCmd = stageChoice === "2" ? "git add -u" : "git add -A";
    execSync(stageCmd, { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(`  ${T.success("✓")} Staged`);
    
    // Commit
    execSync(`git commit -m "${finalMessage.replace(/"/g, '\\"')}"`, { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(`  ${T.success("✓")} Committed`);
    
    // Ask about push
    console.log("");
    console.log(`  ${T.accent("1")}  Push now`);
    console.log(`  ${T.accent("2")}  Push later`);
    console.log("");
    
    const pushChoice = await rlQuestion(`  ${T.accent("→")} `);
    
    if (pushChoice === "1") {
      try {
        execSync("git push", { cwd: PROJECT_PATH, stdio: "pipe" });
        console.log(`  ${T.success("✓")} Pushed`);
      } catch (pushErr) {
        console.log(`  ${T.warning("⚠")} Push failed — try: git push -u origin ${getGitBranch() || "main"}`);
      }
    }
    
    console.log("");
    console.log(`  ${T.success("✓")} Done!`);
    return "committed";
    
  } catch (err) {
    console.log(`  ${T.error("✗")} ${err.message?.split("\n")[0] || "Git error"}`);
    console.log(T.dim(`  Manual: git add -A && git commit -m "${finalMessage}"`));
    return "error";
  }
}

async function runAutoCommit() {
  console.log("");
  console.log(`  ${T.accent("●")} Auto commit starting...`);
  
  // Generate commit message
  const commitMsg = await generateCommitMessage();
  console.log(`  ${T.dim("Message:")} ${chalk.white(commitMsg)}`);
  
  // Save message
  fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), commitMsg, "utf8");
  
  try {
    // Stage
    execSync("git add -A", { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(`  ${T.success("✓")} Staged`);
    
    // Commit
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(`  ${T.success("✓")} Committed`);
    
    // Push
    try {
      execSync("git push", { cwd: PROJECT_PATH, stdio: "pipe" });
      console.log(`  ${T.success("✓")} Pushed`);
    } catch (pushErr) {
      const branch = getGitBranch() || "main";
      try {
        execSync(`git push -u origin ${branch}`, { cwd: PROJECT_PATH, stdio: "pipe" });
        console.log(`  ${T.success("✓")} Pushed (upstream set)`);
      } catch (e) {
        console.log(`  ${T.warning("⚠")} Push failed — try: git push -u origin ${branch}`);
      }
    }
    
    console.log("");
    console.log(`  ${T.success("✓")} Auto commit complete!`);
    
    return "committed";
    
  } catch (err) {
    console.log(`  ${T.error("✗")} ${err.message?.split("\n")[0] || "Error"}`);
    console.log(T.dim(`  Manual: git add -A && git commit -m "${commitMsg}" && git push`));
    return "error";
  }
}

async function promptNextAction() {
  await new Promise(r => setTimeout(r, 50));
  
  console.log("");
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log("");
  console.log(`  ${T.accent("1")}  Return to menu`);
  console.log(`  ${T.accent("2")}  Exit`);
  console.log("");
  
  const choice = await rlQuestion(`  ${T.accent("→")} `);
  
  return choice === "1" ? "menu" : "exit";
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
log(T.dim("Starting watcher..."));

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
  log(T.success(`✓ Ready — watching ${totalWatched} files`));
  console.log("");
  
  // Start keyboard listener after watcher is ready
  setTimeout(setupKeyboardListener, 100);
});

watcher.on("change", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const fileName = path.basename(filePath);
  log(`${T.accent("~")} ${fileName}`);
  scheduleAnalysis(filePath);
});

watcher.on("add", (filePath) => {
  if (!isReady) return;
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const fileName = path.basename(filePath);
  log(`${T.success("+")} ${fileName}`);
  scheduleAnalysis(filePath);
});

watcher.on("unlink", (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;
  
  const fileName = path.basename(filePath);
  log(`${T.error("-")} ${fileName}`);
  analysisCache.delete(filePath);
});

watcher.on("error", (err) => {
  log(`${T.error("✗")} ${err.message}`);
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
  
  // Show session summary
  await showSessionSummary();
  
  // Show commit assistant (the new enhanced flow)
  await showCommitAssistant();
  
  // Ask what to do next
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
  console.log(T.dim(`  ${dayjs().format("HH:mm:ss")} Stopping...`));
  console.log("");
  
  // Quick summary
  console.log(T.accent("  ╭─────────────────────────────────────────────────────────────────╮"));
  console.log(T.accent("  │") + chalk.bold.white("  📊 QUICK SUMMARY                                              ") + T.accent("│"));
  console.log(T.accent("  ╰─────────────────────────────────────────────────────────────────╯"));
  console.log("");
  
  const uptimeStr = chalk.white(getUptime());
  const analyzedStr = stats.analyzed > 0 ? T.success(`${stats.analyzed} analyzed`) : T.dim("0 analyzed");
  const issuesStr = stats.issues > 0 ? T.warning(`${stats.issues} issues`) : T.success("no issues");
  
  console.log(`  ⏱ ${uptimeStr}  │  ${analyzedStr}  │  ${issuesStr}`);
  console.log("");
  
  // Check git status
  const gitStatus = getGitStatus();
  
  if (gitStatus && gitStatus.total > 0) {
    const dateStr = getDateStr();
    const diffSummary = getGitDiffSummary();
    const categories = diffSummary?.categories || {};
    const commitMsg = `${dateStr} - ${generateFallbackMessage(gitStatus, categories)}`;
    
    try {
      fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), commitMsg, "utf8");
    } catch (e) {}
    
    console.log(`  ${T.warning("●")} ${gitStatus.total} uncommitted changes`);
    console.log("");
    console.log(T.dim(`  Commit: ${commitMsg}`));
    console.log("");
    console.log(T.dim(`  git add -A && git commit -m "${commitMsg}"`));
    console.log("");
  } else {
    console.log(`  ${T.success("●")} Working tree clean`);
    console.log("");
  }
  
  console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
  console.log(`  ${T.accent("♥")} Thanks for using Letta!`);
  console.log(T.dim("  Tip: Press 'q' for full commit assistant"));
  console.log("");
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
