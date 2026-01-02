#!/usr/bin/env node
// CodeMind Coding Assistant - File Watcher v2
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
import {
  CognitiveEngine,
  FLOW_STATES,
  INTENTS,
} from "../src/cognitive/index.js";

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
const THEME_NAME = process.env.CODEMIND_THEME || "ocean";
const SHOW_TIMESTAMPS = process.env.SHOW_TIMESTAMPS !== "false";
const VERBOSE_OUTPUT = process.env.VERBOSE_OUTPUT === "true";
const WATCHER_DEBOUNCE = parseInt(process.env.WATCHER_DEBOUNCE || "1500", 10);
const WATCHER_DEPTH = parseInt(process.env.WATCHER_DEPTH || "20", 10);
const WATCH_EXTENSIONS = (process.env.WATCH_EXTENSIONS || ".js,.jsx,.ts,.tsx,.json,.css,.scss,.md").split(",");
const MIN_CONFIDENCE = parseFloat(process.env.MIN_CONFIDENCE || "0.7");
const BACKUP_BEFORE_FIX = process.env.BACKUP_BEFORE_FIX !== "false";
const FIX_TYPES = (process.env.FIX_TYPES || "bug,security,performance").split(",");

// Cognitive Engine settings
const ENABLE_COGNITIVE = process.env.COGNITIVE_ENGINE !== "false";
const ENABLE_FLOW_PROTECTION = process.env.FLOW_PROTECTION !== "false";
const ENABLE_INTENT_DETECTION = process.env.INTENT_DETECTION !== "false";
const ENABLE_PREDICTION = process.env.PREDICTIVE_ANALYSIS !== "false";

// Initialize Cognitive Engine with security features
let cognitiveEngine = null;
if (ENABLE_COGNITIVE) {
  cognitiveEngine = new CognitiveEngine({
    enableIntentDetection: ENABLE_INTENT_DETECTION,
    enablePrediction: ENABLE_PREDICTION,
    enableFlowProtection: ENABLE_FLOW_PROTECTION,
    enableLearning: true,
    enableSecurity: true,
    enableAdaptiveUI: true,
    enableHybridAnalysis: true,
    projectPath: PROJECT_PATH,
    autonomyLevel: AUTO_FIX ? 2 : 1, // PARTNER level if auto-fix, ASSISTANT otherwise
    cloudConsent: process.env.CLOUD_ANALYSIS_CONSENT === "true",
    offlineMode: process.env.OFFLINE_MODE === "true"
  });
}
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
│         🧠 CodeMind Coding Assistant - File Watcher         │
└─────────────────────────────────────────────────────────────┘
`));
  console.log(`  ${chalk.white("Usage:")} ${T.accent("npm run watch")} ${chalk.yellow("<project-path>")} ${T.dim("[options]")}

  ${chalk.white("Options:")}
    ${T.success("--auto-fix")}   Automatically apply safe fixes
    ${T.success("--debug")}      Enable debug logging

  ${chalk.white("Themes:")} Set ${T.accent("CODEMIND_THEME")} in .env (ocean, forest, sunset, midnight, mono)
`);
  process.exit(0);
}

// Validate
if (!process.env.CODEMIND_API_KEY || process.env.CODEMIND_API_KEY === "sk-let-your-api-key-here") {
  console.error(T.error("✗ CODEMIND_API_KEY not configured. Run: npm start → Quick Setup"));
  process.exit(1);
}

const client = new Letta({
  apiKey: process.env.CODEMIND_API_KEY,
  projectID: process.env.CODEMIND_PROJECT_ID,
});

const agentId = fs.existsSync(path.join(ROOT, ".codemind_agent_id"))
  ? fs.readFileSync(path.join(ROOT, ".codemind_agent_id"), "utf8").trim()
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

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND ANALYSIS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const backgroundAnalysis = {
  isRunning: false,
  isPaused: false,
  currentIndex: 0,
  projectFiles: [],
  idleTimer: null,
  analysisTimer: null,
  lastActivity: Date.now(),
  
  // Configuration
  IDLE_THRESHOLD: 5000, // 5 seconds of inactivity before starting background analysis
  ANALYSIS_BATCH_SIZE: 3, // Analyze 3 files per idle period
  ANALYSIS_INTERVAL: 2000, // 2 seconds between each file analysis
  MAX_FILES_PER_SESSION: 50, // Limit to prevent overwhelming
  
  stats: {
    totalFiles: 0,
    analyzed: 0,
    remaining: 0,
    currentSession: 0,
    completedSessions: 0
  }
};

// Discover all analyzable files in the project
function discoverProjectFiles() {
  const files = [];
  const IGNORE_PATTERNS = [
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
    '.codemind-backups', '.kiro', 'package-lock.json', '.env'
  ];
  
  function scanDirectory(dir, depth = 0) {
    if (depth > WATCHER_DEPTH) return;
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        // Skip ignored patterns
        if (IGNORE_PATTERNS.some(pattern => item.includes(pattern))) continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, depth + 1);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (VALID_EXTENSIONS.includes(ext) && stat.size < 1024 * 1024) { // Skip files > 1MB
            files.push(fullPath);
          }
        }
      }
    } catch (err) {
      if (DEBUG) log(T.dim(`Scan error in ${dir}: ${err.message}`));
    }
  }
  
  scanDirectory(PROJECT_PATH);
  return files.sort(); // Consistent order
}

// Initialize background analysis system
function initializeBackgroundAnalysis() {
  backgroundAnalysis.projectFiles = discoverProjectFiles();
  backgroundAnalysis.stats.totalFiles = backgroundAnalysis.projectFiles.length;
  backgroundAnalysis.stats.remaining = backgroundAnalysis.projectFiles.length;
  
  logVerbose(`🔍 Discovered ${backgroundAnalysis.stats.totalFiles} files for background analysis`);
  
  // Start idle detection
  resetIdleTimer();
}

// Reset the idle timer (called whenever there's file activity)
function resetIdleTimer() {
  backgroundAnalysis.lastActivity = Date.now();
  
  // Clear existing timer
  if (backgroundAnalysis.idleTimer) {
    clearTimeout(backgroundAnalysis.idleTimer);
  }
  
  // Pause background analysis if running
  if (backgroundAnalysis.isRunning) {
    pauseBackgroundAnalysis();
  }
  
  // Set new idle timer
  backgroundAnalysis.idleTimer = setTimeout(() => {
    startBackgroundAnalysis();
  }, backgroundAnalysis.IDLE_THRESHOLD);
}

// Start background analysis when idle
function startBackgroundAnalysis() {
  if (backgroundAnalysis.isRunning || backgroundAnalysis.currentIndex >= backgroundAnalysis.projectFiles.length) {
    return;
  }
  
  backgroundAnalysis.isRunning = true;
  backgroundAnalysis.isPaused = false;
  backgroundAnalysis.stats.currentSession = 0;
  
  const remaining = backgroundAnalysis.projectFiles.length - backgroundAnalysis.currentIndex;
  const batchSize = Math.min(backgroundAnalysis.ANALYSIS_BATCH_SIZE, remaining);
  
  log(`${T.accent("🔍")} Starting background analysis (${batchSize} files, ${remaining} remaining)`);
  
  // Start analyzing files
  analyzeNextBackgroundFile();
}

// Pause background analysis (when file changes detected)
function pauseBackgroundAnalysis() {
  if (!backgroundAnalysis.isRunning) return;
  
  backgroundAnalysis.isPaused = true;
  
  if (backgroundAnalysis.analysisTimer) {
    clearTimeout(backgroundAnalysis.analysisTimer);
    backgroundAnalysis.analysisTimer = null;
  }
  
  logVerbose(`⏸️  Background analysis paused (analyzed ${backgroundAnalysis.stats.currentSession} files this session)`);
}

// Resume background analysis
function resumeBackgroundAnalysis() {
  if (!backgroundAnalysis.isPaused) return;
  
  backgroundAnalysis.isPaused = false;
  logVerbose(`▶️  Background analysis resumed`);
  
  // Continue with next file
  analyzeNextBackgroundFile();
}

// Analyze the next file in the background queue
async function analyzeNextBackgroundFile() {
  if (backgroundAnalysis.isPaused || !backgroundAnalysis.isRunning) return;
  
  // Check if we've reached the batch limit or end of files
  if (backgroundAnalysis.stats.currentSession >= backgroundAnalysis.ANALYSIS_BATCH_SIZE || 
      backgroundAnalysis.currentIndex >= backgroundAnalysis.projectFiles.length) {
    completeBackgroundSession();
    return;
  }
  
  const filePath = backgroundAnalysis.projectFiles[backgroundAnalysis.currentIndex];
  const fileName = path.basename(filePath);
  const relativePath = path.relative(PROJECT_PATH, filePath);
  
  // Skip if file doesn't exist or was recently analyzed
  if (!fs.existsSync(filePath)) {
    backgroundAnalysis.currentIndex++;
    scheduleNextBackgroundFile();
    return;
  }
  
  // Skip if already in cache and file hasn't changed
  const content = fs.readFileSync(filePath, 'utf8');
  const contentHash = simpleHash(content);
  if (analysisCache.get(filePath) === contentHash) {
    backgroundAnalysis.currentIndex++;
    backgroundAnalysis.stats.analyzed++;
    backgroundAnalysis.stats.currentSession++;
    logVerbose(`⊘ Background: ${fileName} (cached)`);
    scheduleNextBackgroundFile();
    return;
  }
  
  try {
    logVerbose(`${T.dim("🔍")} Background: ${fileName}...`);
    
    // Analyze the file (reuse existing analysis function)
    const result = await analyzeWithContext(filePath);
    
    if (result) {
      // Update cache
      analysisCache.set(filePath, contentHash);
      
      // Store result
      const hasIssues = result.status !== "excellent" && (result.issues?.length > 0 || result.improvements?.length > 0);
      
      analysisResults.push({
        file: relativePath,
        fileName,
        duration: 0, // Background analysis doesn't track duration
        hasIssues,
        issues: result.issues || [],
        improvements: result.improvements || [],
        suggestions: result.suggestions || [],
        positives: result.positives || [],
        summary: result.summary,
        overallScore: result.overallScore || 0,
        categories: result.categories || {},
        isBackground: true, // Mark as background analysis
      });
      
      // Show compact result
      if (hasIssues) {
        const criticalCount = (result.issues || []).filter(i => i.severity === "critical" || i.severity === "high").length;
        const improvementCount = (result.improvements || []).filter(i => i.priority === "high").length;
        
        if (criticalCount > 0) {
          log(`${T.warning("⚠")} Background: ${fileName} - ${criticalCount} critical issues found`);
        } else if (improvementCount > 0) {
          logVerbose(`${T.accent("💡")} Background: ${fileName} - ${improvementCount} improvements available`);
        }
      } else {
        logVerbose(`${T.success("✓")} Background: ${fileName}`);
      }
      
      backgroundAnalysis.stats.analyzed++;
    }
    
    backgroundAnalysis.currentIndex++;
    backgroundAnalysis.stats.currentSession++;
    
  } catch (error) {
    logVerbose(`${T.error("✗")} Background: ${fileName} - ${error.message}`);
    backgroundAnalysis.currentIndex++;
  }
  
  // Schedule next file
  scheduleNextBackgroundFile();
}

// Schedule the next background file analysis
function scheduleNextBackgroundFile() {
  if (backgroundAnalysis.isPaused || !backgroundAnalysis.isRunning) return;
  
  backgroundAnalysis.analysisTimer = setTimeout(() => {
    analyzeNextBackgroundFile();
  }, backgroundAnalysis.ANALYSIS_INTERVAL);
}

// Complete the current background analysis session
function completeBackgroundSession() {
  backgroundAnalysis.isRunning = false;
  backgroundAnalysis.stats.completedSessions++;
  backgroundAnalysis.stats.remaining = backgroundAnalysis.projectFiles.length - backgroundAnalysis.currentIndex;
  
  const sessionCount = backgroundAnalysis.stats.currentSession;
  const totalAnalyzed = backgroundAnalysis.stats.analyzed;
  const remaining = backgroundAnalysis.stats.remaining;
  
  if (sessionCount > 0) {
    log(`${T.success("✓")} Background analysis complete: ${sessionCount} files analyzed (${totalAnalyzed}/${backgroundAnalysis.stats.totalFiles} total, ${remaining} remaining)`);
    
    // Show summary of findings
    const backgroundResults = analysisResults.filter(r => r.isBackground);
    const recentFindings = backgroundResults.slice(-sessionCount);
    const criticalIssues = recentFindings.filter(r => r.issues?.some(i => i.severity === "critical" || i.severity === "high")).length;
    const improvements = recentFindings.filter(r => r.improvements?.some(i => i.priority === "high")).length;
    
    if (criticalIssues > 0 || improvements > 0) {
      const parts = [];
      if (criticalIssues > 0) parts.push(`${criticalIssues} files with critical issues`);
      if (improvements > 0) parts.push(`${improvements} files with high-priority improvements`);
      log(`${T.accent("📊")} Found: ${parts.join(", ")}`);
    }
  }
  
  // Reset idle timer for next session
  resetIdleTimer();
}

// Show background analysis status
function showBackgroundAnalysisStatus() {
  console.log("");
  console.log(T.accent("  ╭─────────────────────────────────────────────────────────────────╮"));
  console.log(T.accent("  │") + chalk.bold.white("  🔍 BACKGROUND ANALYSIS STATUS                                 ") + T.accent("│"));
  console.log(T.accent("  ╰─────────────────────────────────────────────────────────────────╯"));
  console.log("");
  
  const stats = backgroundAnalysis.stats;
  const progress = stats.totalFiles > 0 ? ((stats.analyzed / stats.totalFiles) * 100).toFixed(1) : 0;
  
  // Overall progress
  console.log(`  📊 ${chalk.bold("Progress:")} ${stats.analyzed}/${stats.totalFiles} files (${progress}%)`);
  console.log(`  🔄 ${chalk.bold("Sessions:")} ${stats.completedSessions} completed`);
  console.log(`  ⏳ ${chalk.bold("Remaining:")} ${stats.remaining} files`);
  
  // Current status
  if (backgroundAnalysis.isRunning) {
    console.log(`  ▶️  ${chalk.bold("Status:")} ${T.accent("Running")} (${backgroundAnalysis.stats.currentSession} files this session)`);
  } else if (backgroundAnalysis.isPaused) {
    console.log(`  ⏸️  ${chalk.bold("Status:")} ${T.warning("Paused")} (waiting for file activity to complete)`);
  } else {
    const timeSinceActivity = Date.now() - backgroundAnalysis.lastActivity;
    const timeUntilNext = Math.max(0, backgroundAnalysis.IDLE_THRESHOLD - timeSinceActivity);
    
    if (timeUntilNext > 0) {
      console.log(`  ⏱️  ${chalk.bold("Status:")} ${T.dim("Waiting")} (${Math.ceil(timeUntilNext / 1000)}s until next session)`);
    } else {
      console.log(`  ✅ ${chalk.bold("Status:")} ${T.success("Complete")} (all files analyzed)`);
    }
  }
  
  // Recent findings
  const backgroundResults = analysisResults.filter(r => r.isBackground);
  if (backgroundResults.length > 0) {
    const criticalFiles = backgroundResults.filter(r => r.issues?.some(i => i.severity === "critical" || i.severity === "high"));
    const improvementFiles = backgroundResults.filter(r => r.improvements?.some(i => i.priority === "high"));
    
    console.log("");
    console.log(`  📋 ${chalk.bold("Findings:")}`);
    
    if (criticalFiles.length > 0) {
      console.log(`     🚨 ${criticalFiles.length} files with critical issues`);
    }
    if (improvementFiles.length > 0) {
      console.log(`     💡 ${improvementFiles.length} files with high-priority improvements`);
    }
    if (criticalFiles.length === 0 && improvementFiles.length === 0) {
      console.log(`     ✅ No critical issues found`);
    }
  }
  
  console.log("");
}

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
  console.log(T.accent("  │") + chalk.bold.white("  🧠 CODEMIND CODE WATCHER                                      ") + T.accent("│"));
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
  
  // Cognitive Engine badge
  const cognitiveBadge = ENABLE_COGNITIVE
    ? chalk.bgMagenta.white(" 🧠 COGNITIVE ")
    : "";
  
  console.log(`  ${modeBadge} ${cognitiveBadge} ${T.dim("Theme:")} ${T.accent(THEME_NAME)} ${T.dim("│")} ${T.dim("Debounce:")} ${chalk.white(WATCHER_DEBOUNCE + "ms")}`);
  
  // Show cognitive features if enabled
  if (ENABLE_COGNITIVE) {
    const features = [];
    if (ENABLE_INTENT_DETECTION) features.push("Intent");
    if (ENABLE_PREDICTION) features.push("Prediction");
    if (ENABLE_FLOW_PROTECTION) features.push("Flow");
    console.log(T.dim(`  Cognitive: ${features.join(" · ")}`));
  }
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
  
  const prompt = `You are an expert code reviewer and mentor. Analyze this file comprehensively and provide actionable feedback.

PROJECT: ${project.framework || project.type} / ${project.language}
FILE: ${file.path} (${file.lineCount} lines)

\`\`\`${file.path.split(".").pop()}
${file.content}
\`\`\`

COMPREHENSIVE ANALYSIS REQUIRED:
1. CRITICAL ISSUES: Bugs, security vulnerabilities, performance problems
2. CODE QUALITY: Best practices, patterns, maintainability
3. IMPROVEMENTS: Specific suggestions for better code
4. MODERN PRACTICES: Latest language features, framework patterns
5. ARCHITECTURE: Structure, organization, design patterns
6. TESTING: Test coverage, testability improvements
7. DOCUMENTATION: Missing comments, unclear naming
8. PERFORMANCE: Optimization opportunities
9. ACCESSIBILITY: If UI code, accessibility improvements
10. SECURITY: Security best practices and hardening

For each finding, provide:
- Specific line numbers when possible
- Clear explanation of WHY it's an issue/improvement
- HOW to fix it with concrete examples
- IMPACT of making the change

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "status": "excellent" | "good" | "needs_improvement" | "critical_issues",
  "summary": "One sentence overall assessment",
  "overallScore": 85,
  "categories": {
    "bugs": { "score": 90, "issues": 0 },
    "security": { "score": 85, "issues": 1 },
    "performance": { "score": 75, "issues": 2 },
    "maintainability": { "score": 80, "issues": 1 },
    "modernization": { "score": 70, "issues": 3 },
    "testing": { "score": 60, "issues": 2 },
    "documentation": { "score": 65, "issues": 2 }
  },
  "issues": [
    {
      "type": "bug|security|performance|maintainability|modernization|testing|documentation|accessibility",
      "severity": "critical|high|medium|low",
      "line": 42,
      "title": "Short descriptive title",
      "description": "Clear explanation of the issue",
      "why": "Why this is problematic",
      "how": "Specific steps to fix",
      "example": "Code example of the fix",
      "impact": "What improves when fixed"
    }
  ],
  "improvements": [
    {
      "type": "enhancement|optimization|modernization|best_practice",
      "priority": "high|medium|low",
      "line": 15,
      "title": "Use async/await instead of promises",
      "description": "Replace .then() chains with modern async/await",
      "benefit": "Improved readability and error handling",
      "example": "const result = await fetchData(); instead of fetchData().then()",
      "effort": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "category": "architecture|patterns|naming|structure",
      "title": "Extract utility function",
      "description": "This logic appears in multiple places",
      "actionable": "Create a shared utility function in utils/helpers.js"
    }
  ],
  "positives": [
    "Good error handling in the main function",
    "Clear variable naming throughout",
    "Proper TypeScript types defined"
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
  
  // Check for @codemind-ignore comment - skip analysis for demo/test files
  if (content.includes("@codemind-ignore") || content.includes("@letta-ignore")) {
    stats.skipped++;
    logVerbose(`⊘ Skipped (@codemind-ignore): ${fileName}`);
    return;
  }
  
  // Skip if unchanged
  const contentHash = simpleHash(content);
  if (analysisCache.get(filePath) === contentHash) {
    stats.skipped++;
    logVerbose(`⊘ Skipped (no changes): ${fileName}`);
    return;
  }

  // 🧠 Cognitive Engine: Record file change and check flow state
  if (cognitiveEngine) {
    cognitiveEngine.recordChange({ file: relativePath, size: content.length });
    cognitiveEngine.recordActiveFile(relativePath);
    
    // Check if we should analyze (flow protection)
    const state = cognitiveEngine.getCurrentState();
    if (state.isInDeepFlow && ENABLE_FLOW_PROTECTION) {
      // In deep flow - queue for later, don't interrupt
      logVerbose(`🌊 Deep flow detected - queueing ${fileName}`);
      cognitiveEngine.flowOptimizer.queueSuggestion({
        type: 'pending_analysis',
        file: filePath,
        timestamp: Date.now(),
      });
      return;
    }
  }
  
  log(`${T.accent("●")} ${fileName}...`);
  logVerbose(`File size: ${content.length} chars, ${content.split("\n").length} lines`);
  
  stats.analyzed++;
  const startTime = Date.now();
  
  // Show periodic improvement tips
  if (stats.analyzed % 3 === 0 && analysisResults.length > 0) {
    showPeriodicImprovementTip();
  }

  // 🧠 Cognitive Engine: Run predictive analysis first
  let cognitiveResult = null;
  if (cognitiveEngine && ENABLE_PREDICTION) {
    try {
      cognitiveResult = await cognitiveEngine.analyze({
        code: content,
        activeFileContent: content,
        filePath: relativePath,
      });
      
      // Show cognitive insights if significant
      if (cognitiveResult.predictions?.summary?.critical > 0) {
        log(`${T.warning("🔮")} Predictive: ${cognitiveResult.predictions.summary.message}`);
      }
      
      // Show flow status occasionally
      if (VERBOSE_OUTPUT && cognitiveResult.flow) {
        logVerbose(cognitiveEngine.flowOptimizer.formatFlowStatus());
      }
    } catch (err) {
      if (DEBUG) log(T.dim(`Cognitive analysis error: ${err.message}`));
    }
  }

  const result = await analyzeWithContext(filePath);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!result) {
    log(T.error(`✗ Analysis failed for ${fileName}`));
    return;
  }
  
  logVerbose(`Analysis complete in ${duration}s`);
  
  analysisCache.set(filePath, contentHash);
  changedFiles.add(relativePath);
  
  const hasIssues = result.status !== "excellent" && (result.issues?.length > 0 || result.improvements?.length > 0);
  
  // Store result for summary (include cognitive insights)
  analysisResults.push({
    file: relativePath,
    fileName,
    duration,
    hasIssues,
    issues: result.issues || [],
    improvements: result.improvements || [],
    suggestions: result.suggestions || [],
    positives: result.positives || [],
    summary: result.summary,
    overallScore: result.overallScore || 0,
    categories: result.categories || {},
    cognitive: cognitiveResult ? {
      intent: cognitiveResult.intent?.intent,
      riskLevel: cognitiveResult.predictions?.riskScore?.level,
      flowState: cognitiveResult.flow?.flowState?.state,
    } : null,
  });
  
  // Enhanced output with scores and comprehensive feedback
  const scoreColor = result.overallScore >= 90 ? T.success : 
                    result.overallScore >= 75 ? T.accent : 
                    result.overallScore >= 60 ? T.warning : T.error;
  
  const statusIcon = result.status === "excellent" ? "🌟" :
                    result.status === "good" ? "✓" :
                    result.status === "needs_improvement" ? "⚠" : "❌";
  
  if (hasIssues) {
    const totalFindings = (result.issues?.length || 0) + (result.improvements?.length || 0);
    stats.issues += totalFindings;
    
    log(`${T.warning(statusIcon)} ${fileName} ${scoreColor(`${result.overallScore}/100`)} ${T.dim(`(${totalFindings} findings, ${duration}s)`)}`);
    
    // Show critical issues first
    const criticalIssues = result.issues?.filter(i => i.severity === "critical" || i.severity === "high") || [];
    for (const issue of criticalIssues) {
      if (issue.type === "bug") stats.issuesByType.bugs++;
      else if (issue.type === "security") stats.issuesByType.security++;
      else if (issue.type === "performance") stats.issuesByType.performance++;
      else stats.issuesByType.style++;
      
      if (issue.severity) {
        stats.severityCounts[issue.severity] = (stats.severityCounts[issue.severity] || 0) + 1;
      }
      
      const sevIcon = { critical: "🚨", high: "⚠️", medium: "💡", low: "ℹ️" }[issue.severity] || "💡";
      const lineInfo = issue.line ? T.dim(` L${issue.line}`) : "";
      
      console.log(`       ${sevIcon} ${T.error(issue.title || issue.description)}${lineInfo}`);
      if (issue.why && VERBOSE_OUTPUT) {
        console.log(`          ${T.dim("Why:")} ${issue.why}`);
      }
      if (issue.how) {
        console.log(`          ${T.dim("Fix:")} ${issue.how}`);
      }
    }
    
    // Show top improvements
    const highPriorityImprovements = result.improvements?.filter(i => i.priority === "high").slice(0, 2) || [];
    for (const improvement of highPriorityImprovements) {
      const lineInfo = improvement.line ? T.dim(` L${improvement.line}`) : "";
      console.log(`       💡 ${T.accent(improvement.title)}${lineInfo}`);
      console.log(`          ${T.dim("Benefit:")} ${improvement.benefit}`);
      if (improvement.example && VERBOSE_OUTPUT) {
        console.log(`          ${T.dim("Example:")} ${improvement.example}`);
      }
    }
    
    // Show architectural suggestions
    const archSuggestions = result.suggestions?.filter(s => s.category === "architecture" || s.category === "patterns").slice(0, 1) || [];
    for (const suggestion of archSuggestions) {
      console.log(`       🏗️  ${T.accent(suggestion.title)}`);
      console.log(`          ${suggestion.actionable}`);
    }
    
    // Show what's good (positive reinforcement)
    if (result.positives?.length > 0 && VERBOSE_OUTPUT) {
      console.log(`       ${T.success("✨ Good:")} ${result.positives[0]}`);
    }

    // 🧠 Show cognitive suggestions if available
    if (cognitiveResult?.suggestions?.length > 0 && !cognitiveResult.flow?.flowState?.state?.includes('FLOW')) {
      console.log(`       🧠 ${T.dim(cognitiveResult.suggestions[0].message)}`);
    }
  } else {
    log(`${T.success(statusIcon)} ${fileName} ${scoreColor(`${result.overallScore}/100`)} ${T.dim(`(${duration}s)`)}`);
    
    // Even for "good" files, show top improvement if available
    if (result.improvements?.length > 0) {
      const topImprovement = result.improvements[0];
      console.log(`       💡 ${T.dim(topImprovement.title)} - ${topImprovement.benefit}`);
    }
    
    // Show what's excellent
    if (result.positives?.length > 0) {
      console.log(`       ${T.success("✨")} ${result.positives[0]}`);
    }
    
    // Show immediate actionable suggestion
    if (result.improvements?.length > 0) {
      const quickWin = result.improvements.find(i => i.effort === "low") || result.improvements[0];
      console.log(`       ${T.accent("💡 Quick win:")} ${quickWin.title}`);
    }
  }
  
  // Show real-time learning insights
  if (cognitiveEngine && result.overallScore < 80) {
    const insight = cognitiveEngine.generateImprovementInsight(result);
    if (insight) {
      console.log(`       ${T.dim("🧠 Insight:")} ${insight}`);
    }
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

function showPeriodicImprovementTip() {
  const recentResults = analysisResults.slice(-3);
  const commonIssues = {};
  const commonImprovements = {};
  
  // Analyze patterns in recent results
  recentResults.forEach(result => {
    (result.issues || []).forEach(issue => {
      commonIssues[issue.type] = (commonIssues[issue.type] || 0) + 1;
    });
    (result.improvements || []).forEach(imp => {
      commonImprovements[imp.type] = (commonImprovements[imp.type] || 0) + 1;
    });
  });
  
  // Find most common pattern
  const topIssue = Object.entries(commonIssues).sort(([,a], [,b]) => b - a)[0];
  const topImprovement = Object.entries(commonImprovements).sort(([,a], [,b]) => b - a)[0];
  
  if (topIssue && topIssue[1] >= 2) {
    const tips = {
      security: "💡 Tip: Consider using environment variables for sensitive data and validating all inputs",
      performance: "💡 Tip: Look for opportunities to cache results, use lazy loading, or optimize loops",
      maintainability: "💡 Tip: Break down large functions, use descriptive names, and add comments for complex logic",
      modernization: "💡 Tip: Consider using modern ES6+ features like destructuring, arrow functions, and async/await"
    };
    
    if (tips[topIssue[0]]) {
      console.log("");
      console.log(`  ${T.accent(tips[topIssue[0]])}`);
      console.log("");
    }
  } else if (topImprovement && topImprovement[1] >= 2) {
    const improvementTips = {
      enhancement: "💡 Pattern detected: Consider creating reusable components or utilities for repeated logic",
      optimization: "💡 Pattern detected: Look for caching opportunities and algorithm improvements",
      modernization: "💡 Pattern detected: Gradually adopt modern language features for better maintainability"
    };
    
    if (improvementTips[topImprovement[0]]) {
      console.log("");
      console.log(`  ${T.accent(improvementTips[topImprovement[0]])}`);
      console.log("");
    }
  }
}

function scheduleAnalysis(filePath) {
  // Reset idle timer - file activity detected
  resetIdleTimer();
  
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
  
  // Build context for AI - get actual file names for specificity
  const fileList = gitStatus.files?.map(f => path.basename(f.file)).slice(0, 15) || [];
  const categories = diffSummary?.categories || {};
  
  // Analyze change patterns to determine commit type
  const changeAnalysis = {
    isNewFeature: gitStatus.added > gitStatus.modified,
    isTestFocused: categories.tests?.length > 0 && categories.tests.length >= gitStatus.total / 2,
    isDocsFocused: categories.docs?.length > 0 && categories.docs.length >= gitStatus.total / 2,
    isStyleFocused: categories.styles?.length > 0 && categories.styles.length >= gitStatus.total / 2,
    isConfigFocused: categories.configs?.length > 0 && categories.configs.length >= gitStatus.total / 2,
    isBugFix: analysisResults.some(r => r.hasIssues && r.issues?.some(i => i.type.includes('error') || i.type.includes('bug'))),
    isRefactor: gitStatus.modified > gitStatus.added && !changeAnalysis?.isBugFix
  };
  
  // Build detailed file context
  let fileContext = [];
  if (categories.components?.length > 0) {
    fileContext.push(`Components: ${categories.components.slice(0, 3).join(", ")}`);
  }
  if (categories.utils?.length > 0) {
    fileContext.push(`Utils: ${categories.utils.slice(0, 3).join(", ")}`);
  }
  if (categories.tests?.length > 0) {
    fileContext.push(`Tests: ${categories.tests.slice(0, 3).join(", ")}`);
  }
  if (categories.styles?.length > 0) {
    fileContext.push(`Styles: ${categories.styles.slice(0, 3).join(", ")}`);
  }
  if (categories.configs?.length > 0) {
    fileContext.push(`Configs: ${categories.configs.slice(0, 3).join(", ")}`);
  }
  if (categories.docs?.length > 0) {
    fileContext.push(`Docs: ${categories.docs.slice(0, 3).join(", ")}`);
  }
  
  // Build change summary
  const changeSummary = [];
  if (gitStatus.modified > 0) changeSummary.push(`${gitStatus.modified} modified`);
  if (gitStatus.added > 0) changeSummary.push(`${gitStatus.added} added`);
  if (gitStatus.deleted > 0) changeSummary.push(`${gitStatus.deleted} deleted`);
  
  // Include analysis results for context
  let analysisContext = "";
  if (analysisResults.length > 0) {
    const issueFiles = analysisResults.filter(r => r.hasIssues);
    const cleanFiles = analysisResults.filter(r => !r.hasIssues);
    
    if (issueFiles.length > 0) {
      const issueTypes = new Set();
      issueFiles.forEach(r => r.issues?.forEach(i => issueTypes.add(i.type)));
      analysisContext = `\nCode analysis: ${Array.from(issueTypes).join(", ")} issues found and addressed.`;
    }
    if (cleanFiles.length > 0) {
      analysisContext += `\n${cleanFiles.length} file(s) passed quality checks.`;
    }
  }
  
  try {
    const prompt = `Generate a professional git commit message for these code changes.

CHANGE ANALYSIS:
- Total files: ${gitStatus.total} (${changeSummary.join(", ")})
- Change pattern: ${changeAnalysis.isNewFeature ? 'New feature' : changeAnalysis.isBugFix ? 'Bug fix' : changeAnalysis.isRefactor ? 'Refactoring' : 'Modification'}
- Primary focus: ${changeAnalysis.isTestFocused ? 'Testing' : changeAnalysis.isDocsFocused ? 'Documentation' : changeAnalysis.isStyleFocused ? 'Styling' : changeAnalysis.isConfigFocused ? 'Configuration' : 'Core functionality'}

MODIFIED AREAS:
${fileContext.length > 0 ? fileContext.join("\n") : `Files: ${fileList.join(", ")}`}
${analysisContext}

COMMIT MESSAGE REQUIREMENTS:
1. Use conventional commit format: [Type]: [Specific description]
2. Types based on analysis:
   - Feat: New features, capabilities, or major additions
   - Fix: Bug fixes, error corrections, issue resolutions
   - Refactor: Code restructuring without changing functionality
   - Style: Formatting, whitespace, code style improvements
   - Docs: Documentation updates, README changes
   - Test: Adding or updating tests
   - Chore: Maintenance, dependency updates, build changes
3. Be SPECIFIC about the functionality/capability added or changed
4. Focus on WHAT was accomplished, not just which files changed
5. Use present tense imperative ("Add", "Fix", "Update")
6. Keep description under 55 characters
7. Capitalize first letter after colon

PROFESSIONAL EXAMPLES:
- "Feat: Add developer insights dashboard with analytics"
- "Fix: Resolve memory leak in file watcher process"
- "Refactor: Simplify commit message generation logic"
- "Test: Add comprehensive unit tests for insight engine"
- "Docs: Update README with installation instructions"
- "Style: Apply consistent formatting to dashboard components"
- "Chore: Update dependencies to latest stable versions"

Based on the change analysis above, generate ONE professional commit message that clearly describes the main accomplishment.

Respond with ONLY the commit message in format: [Type]: [Description]`;

    const response = await client.agents.messages.create(agentId, { input: prompt });
    
    let desc = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    desc = desc.replace(/^["']|["']$/g, "").trim();
    
    // Clean up the message
    desc = desc.replace(/^(commit:?\s*)/i, "");
    
    // Ensure proper conventional commit format
    const conventionalMatch = desc.match(/^(feat|fix|refactor|style|docs|test|chore|perf|build|ci):\s*(.+)/i);
    if (conventionalMatch) {
      const type = conventionalMatch[1].charAt(0).toUpperCase() + conventionalMatch[1].slice(1).toLowerCase();
      const description = conventionalMatch[2].charAt(0).toUpperCase() + conventionalMatch[2].slice(1);
      desc = `${type}: ${description}`;
    } else {
      // If no type prefix, intelligently add one based on analysis
      let prefix = "Refactor";
      if (changeAnalysis.isNewFeature) prefix = "Feat";
      else if (changeAnalysis.isBugFix) prefix = "Fix";
      else if (changeAnalysis.isTestFocused) prefix = "Test";
      else if (changeAnalysis.isDocsFocused) prefix = "Docs";
      else if (changeAnalysis.isStyleFocused) prefix = "Style";
      else if (changeAnalysis.isConfigFocused) prefix = "Chore";
      
      // Capitalize first letter of description
      desc = `${prefix}: ${desc.charAt(0).toUpperCase()}${desc.slice(1)}`;
    }
    
    // Truncate if too long while preserving meaning
    if (desc.length > 60) {
      const colonIndex = desc.indexOf(': ');
      if (colonIndex > 0) {
        const type = desc.substring(0, colonIndex + 2);
        const description = desc.substring(colonIndex + 2);
        const maxDescLength = 60 - type.length - 3; // -3 for "..."
        desc = type + description.slice(0, maxDescLength) + "...";
      } else {
        desc = desc.slice(0, 57) + "...";
      }
    }
    
    if (!desc || desc.length < 10) {
      desc = generateFallbackMessage(gitStatus, categories, fileList);
    }
    
    return `${dateStr} - ${desc}`;
  } catch (err) {
    if (DEBUG) console.log("Commit message generation error:", err.message);
    return `${dateStr} - ${generateFallbackMessage(gitStatus, categories, fileList)}`;
  }
}

function generateFallbackMessage(gitStatus, categories, fileList = []) {
  // Generate a professional fallback message based on intelligent analysis
  
  const totalFiles = gitStatus?.total || fileList.length;
  const added = gitStatus?.added || 0;
  const modified = gitStatus?.modified || 0;
  const deleted = gitStatus?.deleted || 0;
  
  // Determine primary change type
  let commitType = "Refactor";
  let description = "";
  
  // Analyze by file categories first
  if (categories?.tests?.length > 0 && categories.tests.length >= totalFiles / 2) {
    commitType = "Test";
    if (categories.tests.length === 1) {
      const testFile = categories.tests[0].replace(/\.(test|spec)\.(jsx?|tsx?)$/, "");
      description = `Add tests for ${testFile}`;
    } else {
      description = `Add comprehensive test coverage`;
    }
  } else if (categories?.docs?.length > 0 && categories.docs.length >= totalFiles / 2) {
    commitType = "Docs";
    description = categories.docs.some(f => f.includes('README')) 
      ? "Update README and documentation" 
      : "Update project documentation";
  } else if (categories?.configs?.length > 0 && categories.configs.length >= totalFiles / 2) {
    commitType = "Chore";
    description = "Update configuration and build files";
  } else if (categories?.styles?.length > 0 && categories.styles.length >= totalFiles / 2) {
    commitType = "Style";
    description = "Update styling and visual components";
  } else if (added > modified && added > 0) {
    commitType = "Feat";
    if (categories?.components?.length > 0) {
      const comp = categories.components[0].replace(/\.(jsx?|tsx?)$/, "");
      description = `Add ${comp} component functionality`;
    } else if (fileList.length > 0) {
      const mainFile = fileList[0].replace(/\.(jsx?|tsx?|json|md)$/, "");
      description = `Add ${mainFile} module`;
    } else {
      description = `Add new functionality (${added} files)`;
    }
  } else if (modified > 0) {
    commitType = "Refactor";
    if (categories?.components?.length > 0) {
      const comp = categories.components[0].replace(/\.(jsx?|tsx?)$/, "");
      description = totalFiles === 1 
        ? `Improve ${comp} component logic`
        : `Improve ${comp} and related components`;
    } else if (categories?.utils?.length > 0) {
      const util = categories.utils[0].replace(/\.(jsx?|tsx?)$/, "");
      description = `Enhance ${util} utility functions`;
    } else if (fileList.length > 0) {
      const mainFile = fileList[0].replace(/\.(jsx?|tsx?|json|md)$/, "");
      description = totalFiles === 1 
        ? `Improve ${mainFile} implementation`
        : `Improve ${mainFile} and ${totalFiles - 1} related files`;
    } else {
      description = `Improve code structure (${modified} files)`;
    }
  } else if (deleted > 0) {
    commitType = "Refactor";
    description = `Remove unused code (${deleted} files)`;
  } else {
    // Generic fallback
    commitType = "Chore";
    description = `Update project files (${totalFiles} files)`;
  }
  
  // Ensure description is not too long
  if (description.length > 50) {
    description = description.slice(0, 47) + "...";
  }
  
  return `${commitType}: ${description}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Summary - Clean and informative
// ═══════════════════════════════════════════════════════════════════════════

async function showSessionSummary() {
  console.log("");
  console.log(T.accent("  ╭─────────────────────────────────────────────────────────────────╮"));
  console.log(T.accent("  │") + chalk.bold.white("  📊 COMPREHENSIVE SESSION ANALYSIS                            ") + T.accent("│"));
  console.log(T.accent("  ╰─────────────────────────────────────────────────────────────────╯"));
  console.log("");
  
  // Stats row - clean and visual
  const uptimeStr = chalk.white(getUptime());
  const analyzedStr = stats.analyzed > 0 ? T.success(`${stats.analyzed} analyzed`) : T.dim("0 analyzed");
  const issuesStr = stats.issues > 0 ? T.warning(`${stats.issues} findings`) : T.success("no issues");
  
  console.log(`  ⏱ ${uptimeStr}  │  ${analyzedStr}  │  ${issuesStr}`);
  
  // Background analysis stats
  if (backgroundAnalysis.stats.analyzed > 0) {
    const bgAnalyzed = backgroundAnalysis.stats.analyzed;
    const bgTotal = backgroundAnalysis.stats.totalFiles;
    const bgProgress = ((bgAnalyzed / bgTotal) * 100).toFixed(0);
    console.log(`  🔍 ${T.accent("Background:")} ${bgAnalyzed}/${bgTotal} files (${bgProgress}% complete)`);
  }
  
  console.log("");
  
  // Overall project health score
  if (analysisResults.length > 0) {
    const avgScore = analysisResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / analysisResults.length;
    const healthColor = avgScore >= 90 ? T.success : avgScore >= 75 ? T.accent : avgScore >= 60 ? T.warning : T.error;
    const healthIcon = avgScore >= 90 ? "🌟" : avgScore >= 75 ? "✅" : avgScore >= 60 ? "⚠️" : "🚨";
    
    console.log(`  ${healthIcon} ${chalk.bold("Project Health:")} ${healthColor(`${avgScore.toFixed(0)}/100`)}`);
    console.log("");
  }
  
  // 🧠 Cognitive Engine stats
  if (cognitiveEngine && ENABLE_COGNITIVE) {
    const cogStats = cognitiveEngine.getSessionStats();
    const flowStats = cogStats.flow;
    
    if (flowStats.totalDeepFlowTime > 0) {
      const deepFlowMins = Math.round(flowStats.totalDeepFlowTime / 60000);
      const percentage = flowStats.deepFlowPercentage.toFixed(0);
      console.log(`  🧠 ${T.accent("Cognitive:")} ${deepFlowMins}m deep flow (${percentage}%)`);
      
      // Show top mistakes if any
      if (cogStats.topMistakes?.length > 0) {
        const topMistake = cogStats.topMistakes[0];
        console.log(T.dim(`     Common pattern: ${topMistake.type} (${topMistake.frequency}x)`));
      }
      console.log("");
    }
  }
  
  // Category breakdown with scores
  if (analysisResults.length > 0) {
    const categoryScores = {
      bugs: [], security: [], performance: [], maintainability: [], 
      modernization: [], testing: [], documentation: []
    };
    
    analysisResults.forEach(r => {
      if (r.categories) {
        Object.keys(categoryScores).forEach(cat => {
          if (r.categories[cat]?.score) {
            categoryScores[cat].push(r.categories[cat].score);
          }
        });
      }
    });
    
    console.log(`  📈 ${chalk.bold("Code Quality Breakdown:")}`);
    Object.entries(categoryScores).forEach(([category, scores]) => {
      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const scoreColor = avgScore >= 90 ? T.success : avgScore >= 75 ? T.accent : avgScore >= 60 ? T.warning : T.error;
        const icon = avgScore >= 90 ? "🌟" : avgScore >= 75 ? "✅" : avgScore >= 60 ? "⚠️" : "🚨";
        console.log(`     ${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${scoreColor(`${avgScore.toFixed(0)}/100`)}`);
      }
    });
    console.log("");
  }
  
  // Top actionable improvements
  const allImprovements = analysisResults.flatMap(r => 
    (r.improvements || []).map(imp => ({ ...imp, file: r.fileName }))
  ).filter(imp => imp.priority === "high").slice(0, 3);
  
  if (allImprovements.length > 0) {
    console.log(`  💡 ${chalk.bold("Top Improvement Opportunities:")}`);
    allImprovements.forEach((imp, i) => {
      console.log(`     ${i + 1}. ${T.accent(imp.title)} (${imp.file})`);
      console.log(`        ${T.dim("→")} ${imp.benefit}`);
      if (imp.effort) {
        const effortColor = imp.effort === "low" ? T.success : imp.effort === "medium" ? T.warning : T.error;
        console.log(`        ${T.dim("Effort:")} ${effortColor(imp.effort)}`);
      }
    });
    console.log("");
  }
  
  // Architectural suggestions
  const archSuggestions = analysisResults.flatMap(r => 
    (r.suggestions || []).filter(s => s.category === "architecture" || s.category === "patterns")
  ).slice(0, 2);
  
  if (archSuggestions.length > 0) {
    console.log(`  🏗️  ${chalk.bold("Architecture Recommendations:")}`);
    archSuggestions.forEach((sug, i) => {
      console.log(`     ${i + 1}. ${T.accent(sug.title)}`);
      console.log(`        ${sug.actionable}`);
    });
    console.log("");
  }
  
  // Critical issues that need immediate attention
  const criticalIssues = analysisResults.flatMap(r => 
    (r.issues || []).filter(issue => issue.severity === "critical" || issue.severity === "high")
      .map(issue => ({ ...issue, file: r.fileName }))
  ).slice(0, 3);
  
  if (criticalIssues.length > 0) {
    console.log(`  🚨 ${chalk.bold("Critical Issues Requiring Attention:")}`);
    criticalIssues.forEach((issue, i) => {
      const sevIcon = issue.severity === "critical" ? "🚨" : "⚠️";
      console.log(`     ${sevIcon} ${T.error(issue.title || issue.description)} (${issue.file})`);
      if (issue.how) {
        console.log(`        ${T.dim("Fix:")} ${issue.how}`);
      }
    });
    console.log("");
  }
  
  // What's going well (positive reinforcement)
  const positives = analysisResults.flatMap(r => r.positives || []).slice(0, 3);
  if (positives.length > 0) {
    console.log(`  ✨ ${chalk.bold("What's Going Well:")}`);
    positives.forEach((positive, i) => {
      console.log(`     ${T.success("•")} ${positive}`);
    });
    console.log("");
  }
  
  // Files analyzed - compact list with scores
  if (analysisResults.length > 0) {
    const withIssues = analysisResults.filter(r => r.hasIssues);
    const excellent = analysisResults.filter(r => (r.overallScore || 0) >= 90);
    
    if (withIssues.length > 0) {
      console.log(`  📋 ${chalk.bold("Files Analyzed:")}`);
      console.log(`     ${T.warning("⚠")} ${withIssues.length} file(s) with improvement opportunities`);
      if (excellent.length > 0) {
        console.log(`     ${T.success("🌟")} ${excellent.length} file(s) excellent quality`);
      }
      console.log("");
    }
  }
  
  // Next steps recommendation
  if (analysisResults.length > 0) {
    console.log(`  🎯 ${chalk.bold("Recommended Next Steps:")}`);
    
    if (criticalIssues.length > 0) {
      console.log(`     1. ${T.error("Address critical issues first")} (security & bugs)`);
      console.log(`     2. ${T.warning("Implement high-priority improvements")}`);
      console.log(`     3. ${T.accent("Consider architectural suggestions")}`);
    } else if (allImprovements.length > 0) {
      console.log(`     1. ${T.accent("Implement high-impact improvements")}`);
      console.log(`     2. ${T.dim("Review modernization opportunities")}`);
      console.log(`     3. ${T.dim("Enhance testing and documentation")}`);
    } else {
      console.log(`     ${T.success("✓ Code quality is excellent! Consider:")}`);
      console.log(`     1. ${T.dim("Add more comprehensive tests")}`);
      console.log(`     2. ${T.dim("Improve documentation")}`);
      console.log(`     3. ${T.dim("Explore performance optimizations")}`);
    }
    console.log("");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT ASSISTANT - Enhanced UX with Arrow Key Navigation
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

// Arrow key menu selection - Windows compatible
async function selectMenu(options, startIndex = 0) {
  return new Promise((resolve) => {
    let selectedIndex = startIndex;
    let inputBuffer = "";
    
    const renderMenu = (initial = false) => {
      // Move cursor up to redraw menu (not on initial render)
      if (!initial) {
        process.stdout.write(`\x1b[${options.length + 2}A`); // +2 for hint lines
      }
      
      for (let i = 0; i < options.length; i++) {
        const isSelected = i === selectedIndex;
        const prefix = isSelected ? T.accent("❯") : " ";
        const label = isSelected ? chalk.bold.white(options[i].label) : T.dim(options[i].label);
        const hint = options[i].hint ? (isSelected ? T.dim(` — ${options[i].hint}`) : "") : "";
        
        process.stdout.write("\x1b[2K"); // Clear line
        console.log(`  ${prefix} ${label}${hint}`);
      }
      
      // Show hint
      process.stdout.write("\x1b[2K");
      console.log("");
      process.stdout.write("\x1b[2K");
      console.log(T.dim("  ↑/↓ move  Enter select  Esc cancel"));
    };
    
    // Initial render
    renderMenu(true);
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
    }
    
    const handleKey = (key) => {
      // Handle escape sequences (arrow keys)
      // Windows sends: \x1b[A (up), \x1b[B (down)
      // But may come as separate chunks, so we buffer
      inputBuffer += key;
      
      // Check for complete escape sequences
      if (inputBuffer.includes("\x1b[A") || inputBuffer === "\x1bOA") {
        // Up arrow
        inputBuffer = "";
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        renderMenu();
        return;
      }
      if (inputBuffer.includes("\x1b[B") || inputBuffer === "\x1bOB") {
        // Down arrow
        inputBuffer = "";
        selectedIndex = (selectedIndex + 1) % options.length;
        renderMenu();
        return;
      }
      
      // If buffer starts with escape but isn't complete, wait for more
      if (inputBuffer.startsWith("\x1b") && inputBuffer.length < 3) {
        // Set timeout to clear buffer if no more input
        setTimeout(() => {
          if (inputBuffer === "\x1b") {
            // Just escape key pressed
            inputBuffer = "";
            cleanup();
            resolve(null);
          }
        }, 50);
        return;
      }
      
      // Clear buffer for non-escape sequences
      const currentKey = inputBuffer;
      inputBuffer = "";
      
      // Enter key
      if (currentKey === "\r" || currentKey === "\n") {
        cleanup();
        resolve(options[selectedIndex].value);
        return;
      }
      
      // Escape key (standalone)
      if (currentKey === "\x1b") {
        cleanup();
        resolve(null);
        return;
      }
      
      // Ctrl+C
      if (currentKey === "\x03") {
        cleanup();
        resolve(null);
        return;
      }
      
      // W/w or K/k for up
      if (currentKey.toLowerCase() === "w" || currentKey.toLowerCase() === "k") {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        renderMenu();
        return;
      }
      
      // S/s or J/j for down
      if (currentKey.toLowerCase() === "s" || currentKey.toLowerCase() === "j") {
        selectedIndex = (selectedIndex + 1) % options.length;
        renderMenu();
        return;
      }
    };
    
    const cleanup = () => {
      process.stdin.removeListener("data", handleKey);
      if (process.stdin.isTTY) {
        try { process.stdin.setRawMode(false); } catch (e) {}
      }
      // Clear hint lines
      process.stdout.write("\x1b[1A\x1b[2K\x1b[1A\x1b[2K");
      console.log("");
    };
    
    process.stdin.on("data", handleKey);
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
  
  // Arrow key menu
  const choice = await selectMenu([
    { value: "guided", label: "Guided commit", hint: "step by step" },
    { value: "auto", label: "Auto commit", hint: "stage, commit, push" },
    { value: "skip", label: "Skip", hint: "commit later" },
  ]);
  
  if (choice === "guided") {
    return await runGuidedCommit();
  } else if (choice === "auto") {
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
  
  // Message options with arrow menu
  const msgChoice = await selectMenu([
    { value: "use", label: "Use this message" },
    { value: "edit", label: "Edit message" },
    { value: "cancel", label: "Cancel" },
  ]);
  
  let finalMessage = aiMessage;
  
  if (msgChoice === "edit") {
    console.log("");
    const customMsg = await rlQuestion(`  ${T.dim("New message:")} `);
    if (customMsg) {
      finalMessage = customMsg;
    }
  } else if (msgChoice === "cancel" || msgChoice === null) {
    console.log(T.dim("  Cancelled."));
    return "cancel";
  }
  
  // Save message
  fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), finalMessage, "utf8");
  
  // Stage files with arrow menu
  console.log("");
  const stageChoice = await selectMenu([
    { value: "all", label: "Stage all", hint: "git add -A" },
    { value: "tracked", label: "Stage tracked only", hint: "git add -u" },
    { value: "cancel", label: "Cancel" },
  ]);
  
  if (stageChoice === "cancel" || stageChoice === null) {
    console.log(T.dim("  Cancelled."));
    return "cancel";
  }
  
  try {
    const stageCmd = stageChoice === "tracked" ? "git add -u" : "git add -A";
    execSync(stageCmd, { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(`  ${T.success("✓")} Staged`);
    
    // Commit
    execSync(`git commit -m "${finalMessage.replace(/"/g, '\\"')}"`, { cwd: PROJECT_PATH, stdio: "pipe" });
    console.log(`  ${T.success("✓")} Committed`);
    
    // Ask about push with arrow menu
    console.log("");
    const pushChoice = await selectMenu([
      { value: "push", label: "Push now" },
      { value: "later", label: "Push later" },
    ]);
    
    if (pushChoice === "push") {
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
  
  const choice = await selectMenu([
    { value: "watch", label: "Continue watching", hint: "restart watcher" },
    { value: "menu", label: "Return to menu" },
    { value: "exit", label: "Exit" },
  ]);
  
  return choice || "exit";
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
  
  // Initialize background analysis system
  initializeBackgroundAnalysis();
  
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

async function restartWatcher() {
  // Reset state
  isShuttingDown = false;
  shutdownComplete = false;
  isReady = false; // Important: reset ready state for new watcher
  stats.analyzed = 0;
  stats.issues = 0;
  stats.fixed = 0;
  stats.skipped = 0;
  stats.startTime = Date.now();
  stats.issuesByType = { bugs: 0, security: 0, performance: 0, style: 0 };
  stats.severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  analysisResults.length = 0;
  analysisCache.clear();
  changedFiles.clear();
  pendingAnalysis.clear();
  
  // Show header again
  showHeader();
  log(T.dim("Restarting watcher..."));
  
  // Create new watcher
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
}

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
  
  if (action === "watch") {
    // Restart the watcher
    console.log("");
    await restartWatcher();
    return; // Don't exit, continue watching
  }
  
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
    console.log(T.accent("\n  ♥ Thanks for using CodeMind! Happy coding!\n"));
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
    const fileList = gitStatus.files?.map(f => path.basename(f.file)) || [];
    const commitMsg = `${dateStr} - ${generateFallbackMessage(gitStatus, categories, fileList)}`;
    
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
  console.log(`  ${T.accent("♥")} Thanks for using CodeMind!`);
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
      
      // 'b' or 'B' to show background analysis status
      if (key === "b" || key === "B") {
        showBackgroundAnalysisStatus();
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
      log(T.dim("Press 'b' for background analysis status"));
    } else {
      log(T.dim("Press 'q' or Ctrl+C to stop and see session summary"));
      log(T.dim("Press 'b' for background analysis status"));
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
