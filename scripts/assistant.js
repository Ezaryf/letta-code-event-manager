// Letta Coding Assistant - Intelligent File Watcher
// Deep analysis with context awareness and safe auto-fixing
import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";
import {
  detectProjectType,
  scanProjectStructure,
  analyzeFileContent,
  findRelatedFiles,
  buildAnalysisContext,
  getGitContext,
} from "./analyzer.js";

dotenv.config();

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));

// CLI Arguments
const PROJECT_PATH = process.argv[2] ? path.resolve(process.argv[2]) : null;
const AUTO_FIX = process.argv.includes("--auto-fix");
const DEBUG = process.argv.includes("--debug") || process.env.DEBUG === "true";

// Show help first (before agent check)
if (!PROJECT_PATH) {
  console.log(`
🤖 Letta Coding Assistant - Intelligent Watcher
================================================

Usage:
  npm run watch <project-path> [options]

Options:
  --auto-fix     Automatically apply safe fixes
  --debug        Enable debug logging

Examples:
  npm run watch ../my-project
  npm run watch "C:\\Projects\\my-app" --auto-fix
`);
  process.exit(0);
}

// Now check agent
const agentId = fs.existsSync(path.join(ROOT, ".letta_agent_id"))
  ? fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim()
  : null;

if (!agentId) {
  console.error("❌ No agent. Run: npm run setup");
  process.exit(1);
}

if (!fs.existsSync(PROJECT_PATH)) {
  console.error(`❌ Project not found: ${PROJECT_PATH}`);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const pendingAnalysis = new Map();
const analysisCache = new Map();
const changedFiles = new Set();
const fixHistory = [];
let isReady = false;
let projectType = null;
let projectStructure = null;

const stats = {
  analyzed: 0,
  issues: 0,
  fixed: 0,
  skipped: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeWithContext(filePath) {
  const relativePath = path.relative(PROJECT_PATH, filePath);
  
  // Build rich context
  const context = buildAnalysisContext(filePath, PROJECT_PATH, { includeGit: true });
  
  // Create intelligent prompt with full context
  const prompt = buildAnalysisPrompt(context);
  
  if (DEBUG) {
    console.log(`   [DEBUG] Context: ${context.file.imports.length} imports, ${context.file.functions.length} functions`);
    console.log(`   [DEBUG] Related: ${context.related.tests.length} tests, ${context.related.types.length} types`);
  }
  
  try {
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
    
    // Parse structured response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return { ...result, raw: text };
      } catch (e) {
        if (DEBUG) console.log(`   [DEBUG] JSON parse failed, using text response`);
      }
    }
    
    // Fallback to text analysis
    return {
      status: text.includes("✓") || text.toLowerCase().includes("looks good") ? "ok" : "review",
      summary: text.slice(0, 200),
      issues: [],
      suggestions: [],
      fix_available: false,
      raw: text,
    };
    
  } catch (err) {
    console.log(`   ❌ Analysis error: ${err.message}`);
    return null;
  }
}

function buildAnalysisPrompt(context) {
  const { file, project, structure, related, relatedContents, git } = context;
  
  let prompt = `You are an expert code reviewer. Analyze this file with full project context.

═══════════════════════════════════════════════════════════════
PROJECT CONTEXT
═══════════════════════════════════════════════════════════════
Framework: ${project.framework || project.type}
Language: ${project.language}
Structure: ${structure.totalFiles} files (${structure.components} components, ${structure.utils} utils, ${structure.tests} tests)
${git?.branch ? `Git Branch: ${git.branch}` : ""}

═══════════════════════════════════════════════════════════════
FILE: ${file.path}
═══════════════════════════════════════════════════════════════
Lines: ${file.lineCount} | Complexity: ${file.complexity}
Imports: ${file.imports.slice(0, 5).join(", ")}${file.imports.length > 5 ? ` (+${file.imports.length - 5} more)` : ""}
Exports: ${file.exports.join(", ") || "none"}
Functions: ${file.functions.join(", ") || "none"}
${file.components.length ? `Components: ${file.components.join(", ")}` : ""}
${file.hooks.length ? `Hooks: ${file.hooks.join(", ")}` : ""}

\`\`\`${file.path.split(".").pop()}
${file.content}
\`\`\`
${file.truncated ? "\n(File truncated - showing first 15k chars)" : ""}
`;

  // Add related test file if exists
  if (Object.keys(relatedContents).length > 0) {
    prompt += `\n═══════════════════════════════════════════════════════════════
RELATED TEST FILE
═══════════════════════════════════════════════════════════════\n`;
    for (const [testPath, testContent] of Object.entries(relatedContents)) {
      prompt += `\n--- ${testPath} ---\n\`\`\`\n${testContent}\n\`\`\`\n`;
    }
  }

  // Add pre-detected issues
  if (file.issues.length > 0) {
    prompt += `\n═══════════════════════════════════════════════════════════════
PRE-DETECTED ISSUES
═══════════════════════════════════════════════════════════════\n`;
    file.issues.forEach(i => {
      prompt += `- [${i.type}] ${i.message}\n`;
    });
  }

  prompt += `
═══════════════════════════════════════════════════════════════
ANALYSIS REQUEST
═══════════════════════════════════════════════════════════════
Analyze for:
1. BUGS - Logic errors, null checks, edge cases
2. SECURITY - XSS, injection, exposed secrets
3. PERFORMANCE - Unnecessary re-renders, memory leaks, N+1
4. BEST PRACTICES - ${project.framework || "JavaScript"} patterns, naming, structure

Respond with ONLY valid JSON:
{
  "status": "ok" | "issues_found",
  "summary": "1-2 sentence summary",
  "issues": [
    {
      "type": "bug|security|performance|style",
      "severity": "critical|high|medium|low",
      "line": 0,
      "description": "what's wrong",
      "suggestion": "how to fix"
    }
  ],
  "suggestions": ["improvement 1", "improvement 2"],
  "fix_available": true|false,
  "fix_confidence": 0.0-1.0,
  "fix_description": "what the fix does",
  "fixes": [
    {
      "file": "${file.path}",
      "action": "replace",
      "search": "exact code to find",
      "replace": "replacement code"
    }
  ]
}

RULES:
- Only suggest fixes you're confident won't break the code
- For "replace" action, "search" must be EXACT text from the file
- Set fix_confidence based on how safe the fix is
- If no issues, return status "ok" with empty issues array`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE FIX APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

function applyFixes(fixes, confidence) {
  const MIN_CONFIDENCE = parseFloat(process.env.MIN_CONFIDENCE || "0.7");
  
  if (confidence < MIN_CONFIDENCE) {
    console.log(`   ⚠️ Fix confidence (${confidence}) below threshold (${MIN_CONFIDENCE})`);
    return false;
  }
  
  let allApplied = true;
  
  for (const fix of fixes) {
    const filePath = path.join(PROJECT_PATH, fix.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ File not found: ${fix.file}`);
      allApplied = false;
      continue;
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    
    if (fix.action === "replace") {
      if (!content.includes(fix.search)) {
        console.log(`   ❌ Could not find code to replace in ${fix.file}`);
        if (DEBUG) {
          console.log(`   [DEBUG] Looking for: ${fix.search.slice(0, 50)}...`);
        }
        allApplied = false;
        continue;
      }
      
      // Create backup
      createBackup(filePath);
      
      // Apply fix
      const newContent = content.replace(fix.search, fix.replace);
      
      // Validate fix doesn't break syntax (basic check)
      if (!validateSyntax(newContent, fix.file)) {
        console.log(`   ❌ Fix would create syntax error, skipping`);
        allApplied = false;
        continue;
      }
      
      fs.writeFileSync(filePath, newContent, "utf8");
      console.log(`   ✅ Fixed: ${fix.file}`);
      
      // Record fix
      fixHistory.push({
        timestamp: new Date().toISOString(),
        file: fix.file,
        action: fix.action,
        confidence,
      });
      
      stats.fixed++;
    }
  }
  
  return allApplied;
}

function createBackup(filePath) {
  const relativePath = path.relative(PROJECT_PATH, filePath);
  const backupDir = path.join(PROJECT_PATH, ".letta-backups", path.dirname(relativePath));
  const timestamp = dayjs().format("YYYYMMDD_HHmmss");
  const backupName = `${path.basename(filePath)}.${timestamp}.backup`;
  const backupPath = path.join(backupDir, backupName);
  
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  
  // Ensure .letta-backups is gitignored
  ensureGitignore();
  
  return backupPath;
}

function ensureGitignore() {
  const gitignorePath = path.join(PROJECT_PATH, ".gitignore");
  let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  
  if (!gitignore.includes(".letta-backups")) {
    fs.appendFileSync(gitignorePath, "\n# Letta assistant backups\n.letta-backups/\n");
  }
}

function validateSyntax(content, fileName) {
  // Basic syntax validation
  const ext = path.extname(fileName);
  
  if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
    // Check balanced brackets
    const brackets = { "{": 0, "[": 0, "(": 0 };
    const pairs = { "}": "{", "]": "[", ")": "(" };
    
    for (const char of content) {
      if (brackets[char] !== undefined) brackets[char]++;
      if (pairs[char]) brackets[pairs[char]]--;
    }
    
    for (const [bracket, count] of Object.entries(brackets)) {
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
  
  // Check if file still exists
  if (!fs.existsSync(filePath)) {
    if (DEBUG) console.log(`   [DEBUG] File no longer exists`);
    return;
  }
  
  // Read content
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.log(`   ❌ Could not read file: ${err.message}`);
    return;
  }
  
  // Skip empty files
  if (!content.trim()) {
    console.log(`   ⏭️ Empty file`);
    stats.skipped++;
    return;
  }
  
  // Check cache - skip if unchanged
  const contentHash = simpleHash(content);
  if (analysisCache.get(filePath) === contentHash) {
    console.log(`   ⏭️ Unchanged since last analysis`);
    stats.skipped++;
    return;
  }
  
  console.log(`   🔍 Analyzing with context...`);
  stats.analyzed++;
  
  const result = await analyzeWithContext(filePath);
  
  if (!result) {
    return;
  }
  
  // Cache result
  analysisCache.set(filePath, contentHash);
  changedFiles.add(relativePath);
  
  // Display results
  if (result.status === "ok") {
    console.log(`   ✓ ${result.summary || "Looks good!"}`);
  } else {
    // Show issues
    if (result.issues && result.issues.length > 0) {
      stats.issues += result.issues.length;
      
      for (const issue of result.issues) {
        const icon = {
          bug: "🐛",
          security: "🔒",
          performance: "⚡",
          style: "💅",
        }[issue.type] || "⚠️";
        
        const severity = {
          critical: chalk.red,
          high: chalk.yellow,
          medium: chalk.white,
          low: chalk.gray,
        }[issue.severity] || chalk.white;
        
        console.log(`   ${icon} [${issue.severity}] ${issue.description}`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      }
    }
    
    // Show suggestions
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(`   📝 Suggestions:`);
      result.suggestions.slice(0, 3).forEach(s => console.log(`      • ${s}`));
    }
    
    // Auto-fix if enabled and available
    if (AUTO_FIX && result.fix_available && result.fixes && result.fixes.length > 0) {
      console.log(`   🔧 Applying fix (confidence: ${result.fix_confidence})...`);
      console.log(`      ${result.fix_description}`);
      
      if (applyFixes(result.fixes, result.fix_confidence)) {
        console.log(`   ✅ Fix applied successfully`);
      }
    } else if (result.fix_available) {
      console.log(`   💡 Fix available (run with --auto-fix to apply)`);
    }
  }
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Simple chalk replacement for colors
const chalk = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  white: (s) => s,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEBOUNCED SCHEDULING
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT MESSAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateCommitMessage() {
  if (changedFiles.size === 0) {
    console.log("\n📝 No changes to commit.");
    return;
  }
  
  const fileList = Array.from(changedFiles).slice(0, 10).join(", ");
  const date = dayjs().format("DDMMYY");
  
  const prompt = `Generate a git commit message for these changed files: ${fileList}

Rules:
- Format: ${date} - <short description>
- Keep under 50 characters total
- Capitalize first letter after dash
- Be specific about what changed

Respond with ONLY the commit message.`;

  try {
    const response = await client.agents.messages.create(agentId, { input: prompt });
    let message = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    
    if (!message.startsWith(date)) {
      message = `${date} - ${message}`;
    }
    
    console.log(`\n📝 Suggested commit message:`);
    console.log(`   "${message}"`);
    console.log(`\n   To commit: git add -A && git commit -m "${message}"`);
    
    // Save for easy use
    fs.writeFileSync(path.join(PROJECT_PATH, ".commit_msg"), message, "utf8");
    console.log(`   Or: git commit -F .commit_msg`);
    
  } catch (err) {
    console.log(`\n❌ Could not generate commit message: ${err.message}`);
  }
  
  changedFiles.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
// WATCHER SETUP
// ═══════════════════════════════════════════════════════════════════════════

// Initialize project analysis
projectType = detectProjectType(PROJECT_PATH);
projectStructure = scanProjectStructure(PROJECT_PATH);

// Determine watch patterns
const POSSIBLE_FOLDERS = ["src", "app", "components", "pages", "lib", "utils", "hooks", "types", "features", "modules", "__tests__"];
const WATCH_PATTERNS = [];

for (const folder of POSSIBLE_FOLDERS) {
  const fullPath = path.join(PROJECT_PATH, folder);
  if (fs.existsSync(fullPath)) {
    WATCH_PATTERNS.push(fullPath.replace(/\\/g, "/"));
  }
}

// Fallback to project root
if (WATCH_PATTERNS.length === 0) {
  WATCH_PATTERNS.push(PROJECT_PATH.replace(/\\/g, "/"));
}

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
];

const VALID_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════

console.log(`
🤖 Letta Coding Assistant - Intelligent Watcher
════════════════════════════════════════════════════════════════
Project:    ${PROJECT_PATH}
Framework:  ${projectType.framework || projectType.type}
Language:   ${projectType.language}
Files:      ${projectStructure.totalFiles} total
Auto-fix:   ${AUTO_FIX ? "ON" : "OFF"}
════════════════════════════════════════════════════════════════
`);

console.log("📁 Watching:");
WATCH_PATTERNS.forEach(p => console.log(`   • ${path.relative(PROJECT_PATH, p) || "."}`));
console.log("");

const watcher = chokidar.watch(WATCH_PATTERNS, {
  ignored: IGNORE,
  ignoreInitial: true,
  persistent: true,
  usePolling: true,
  interval: 300,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  depth: 10,
});

watcher.on("ready", () => {
  if (!isReady) {
    isReady = true;
    console.log("🟢 Ready! Edit your code - I'll analyze it with full context.");
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
  console.error("❌ Watcher error:", err.message);
});

if (DEBUG) {
  watcher.on("all", (event, filePath) => {
    console.log(`[DEBUG] ${event}: ${path.relative(PROJECT_PATH, filePath)}`);
  });
}

// Handle exit
process.on("SIGINT", async () => {
  console.log(`\n
📊 Session Summary
════════════════════════════════════════════════════════════════
Files analyzed:  ${stats.analyzed}
Issues found:    ${stats.issues}
Auto-fixed:      ${stats.fixed}
Skipped:         ${stats.skipped}
════════════════════════════════════════════════════════════════
`);

  if (changedFiles.size > 0) {
    await generateCommitMessage();
  }
  
  console.log("\n👋 Goodbye!");
  process.exit(0);
});
