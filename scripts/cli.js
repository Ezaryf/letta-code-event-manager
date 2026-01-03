#!/usr/bin/env node
// CodeMind CLI - Production-quality coding assistant with seamless navigation
import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { detectIDE, isAgenticIDE, getSupportedIDEs } from "../src/core/ideDetector.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Detect IDE at startup
let currentIDE = null;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function hasAgent() {
  return fs.existsSync(path.join(ROOT, ".codemind_agent_id"));
}

function hasApiKey() {
  return process.env.LETTA_API_KEY && process.env.LETTA_API_KEY !== "sk-let-your-api-key-here";
}

function getAgentId() {
  return fs.readFileSync(path.join(ROOT, ".codemind_agent_id"), "utf8").trim();
}

function getAgentConfig() {
  const configPath = path.join(ROOT, ".codemind_agent_config.json");
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {}
  }
  return null;
}

function getRecentProjects() {
  const historyFile = path.join(ROOT, ".codemind_history.json");
  if (fs.existsSync(historyFile)) {
    try {
      return JSON.parse(fs.readFileSync(historyFile, "utf8")).recentProjects || [];
    } catch (e) {}
  }
  return [];
}

function saveToHistory(projectPath) {
  const historyFile = path.join(ROOT, ".codemind_history.json");
  let history = { recentProjects: [] };
  if (fs.existsSync(historyFile)) {
    try { history = JSON.parse(fs.readFileSync(historyFile, "utf8")); } catch (e) {}
  }
  history.recentProjects = [projectPath, ...history.recentProjects.filter(p => p !== projectPath)].slice(0, 5);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf8");
}

// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function showBanner(subtitle = null) {
  console.clear();
  const title = "CODEMIND CODING ASSISTANT";
  const desc = "AI-powered code analysis, fixes & commit generation";
  
  console.log(chalk.cyan("╔" + "═".repeat(66) + "╗"));
  console.log(chalk.cyan("║") + " ".repeat(66) + chalk.cyan("║"));
  console.log(chalk.cyan("║") + "     🧠 " + chalk.bold.white(title) + " ".repeat(66 - 8 - title.length) + chalk.cyan("║"));
  console.log(chalk.cyan("║") + "     " + chalk.gray(desc) + " ".repeat(66 - 5 - desc.length) + chalk.cyan("║"));
  console.log(chalk.cyan("║") + " ".repeat(66) + chalk.cyan("║"));
  console.log(chalk.cyan("╚" + "═".repeat(66) + "╝"));
  console.log("");
  
  // Detect IDE if not already done
  if (!currentIDE) {
    currentIDE = detectIDE(process.cwd());
  }
  
  // Show IDE status
  const ide = currentIDE.primary;
  const ideIcon = ide.type === "agentic" ? "🤖" : ide.type === "modern" ? "⚡" : ide.type === "terminal" ? "💻" : "📝";
  const ideStatus = ide.type === "agentic" 
    ? chalk.magenta(`${ideIcon} ${ide.name}`) + chalk.green(" (AI Collab enabled)")
    : chalk.gray(`${ideIcon} ${ide.name}`);
  console.log(`  ${ideStatus}`);
  
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API Key configured"));
  } else {
    console.log(chalk.red("  ✗ API Key missing") + chalk.gray(" - select 'Quick Setup'"));
  }
  
  if (hasAgent()) {
    const config = getAgentConfig();
    const version = config?.template_version || "unknown";
    console.log(chalk.green(`  ✓ Agent ready`) + chalk.gray(` (${config?.name || "CodeMind"} v${version})`));
  } else {
    console.log(chalk.yellow("  ○ No agent") + chalk.gray(" - select 'Quick Setup'"));
  }
  
  if (subtitle) {
    console.log("");
    console.log(chalk.bold.cyan(`  ${subtitle}`));
  }
  
  console.log("");
}

async function arrowMenu(title, options, { showBack = false } = {}) {
  // Ensure stdin is in a clean state before starting
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch (e) {}
  }
  process.stdin.pause();
  
  // Small delay to let any pending events clear
  await new Promise(r => setTimeout(r, 30));
  
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const items = [...options];
    let menuLineCount = 0;
    let isFirstDraw = true;
    let resolved = false;
    
    if (showBack) {
      items.push({ label: chalk.yellow("← Back"), value: "back" });
    }
    
    while (items[selectedIndex]?.value?.startsWith?.("separator")) {
      selectedIndex++;
    }
    
    // Build menu content without banner (banner shown once at start)
    const buildMenu = () => {
      let lines = [];
      lines.push(chalk.gray("  ↑↓ Navigate  •  Enter Select  •  Esc Back  •  Ctrl+C Exit"));
      lines.push(chalk.gray("─".repeat(66)));
      lines.push("");
      lines.push(chalk.bold.white(`  ${title}`));
      lines.push("");
      
      items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const isSeparator = item.value?.startsWith?.("separator");
        
        if (isSeparator) {
          lines.push(chalk.gray(`    ${item.label}`));
        } else if (isSelected) {
          lines.push(chalk.cyan.bold(`  ❯ ${item.label}`));
        } else {
          lines.push(chalk.white(`    ${item.label}`));
        }
      });
      
      lines.push("");
      return lines;
    };
    
    const draw = () => {
      const menuLines = buildMenu();
      
      if (isFirstDraw) {
        showBanner();
        menuLines.forEach(line => console.log(line));
        menuLineCount = menuLines.length;
        isFirstDraw = false;
      } else {
        process.stdout.write(`\x1b[${menuLineCount}A`);
        process.stdout.write('\x1b[J');
        menuLines.forEach(line => console.log(line));
      }
    };
    
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      process.stdin.removeAllListeners("keypress");
      if (process.stdin.isTTY) {
        try { process.stdin.setRawMode(false); } catch (e) {}
      }
      process.stdin.pause();
    };
    
    const onKeypress = (_, key) => {
      if (!key || resolved) return;
      
      if (key.name === "up") {
        do {
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
        } while (items[selectedIndex]?.value?.startsWith?.("separator"));
        draw();
      } else if (key.name === "down") {
        do {
          selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
        } while (items[selectedIndex]?.value?.startsWith?.("separator"));
        draw();
      } else if (key.name === "return") {
        cleanup();
        resolve(items[selectedIndex].value);
      } else if (key.name === "escape" || key.name === "backspace") {
        cleanup();
        resolve("back");
      } else if (key.ctrl && key.name === "c") {
        cleanup();
        console.log(chalk.cyan("\n\n  👋 Goodbye!\n"));
        process.exit(0);
      }
    };
    
    draw();
    
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}

async function inputPrompt(message, { allowEmpty = false, isPath = false } = {}) {
  // Ensure stdin is clean
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch (e) {}
  }
  process.stdin.pause();
  await new Promise(r => setTimeout(r, 30));
  
  return new Promise((resolve) => {
    console.log(chalk.gray("  (Press Enter to cancel)"));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(chalk.white(`  ${message} `), (answer) => {
      rl.close();
      const trimmed = answer.trim();
      
      if (!trimmed && !allowEmpty) {
        resolve(null);
        return;
      }
      
      if (isPath && trimmed) {
        const resolved = path.resolve(trimmed);
        if (!fs.existsSync(resolved)) {
          console.log(chalk.red(`\n  ❌ Path not found: ${resolved}\n`));
          resolve(null);
          return;
        }
        resolve(resolved);
        return;
      }
      
      resolve(trimmed || null);
    });
  });
}

async function confirmPrompt(message, { defaultYes = false } = {}) {
  // Ensure stdin is clean
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch (e) {}
  }
  process.stdin.pause();
  await new Promise(r => setTimeout(r, 30));
  
  return new Promise((resolve) => {
    const hint = defaultYes ? "(Y/n/b)" : "(y/N/b)";
    console.log(chalk.gray("  b = back"));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(chalk.white(`  ${message} ${hint}: `), (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      
      if (a === "b" || a === "back") {
        resolve("back");
      } else if (a === "y" || a === "yes") {
        resolve(true);
      } else if (a === "n" || a === "no") {
        resolve(false);
      } else {
        resolve(defaultYes);
      }
    });
  });
}

async function waitForKey(message = "Press Enter to continue...") {
  // Ensure stdin is clean
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch (e) {}
  }
  process.stdin.pause();
  await new Promise(r => setTimeout(r, 30));
  
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(chalk.gray(`  ${message} `), () => {
      rl.close();
      resolve();
    });
  });
}

async function secureInput(message) {
  // Ensure stdin is clean
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch (e) {}
  }
  process.stdin.pause();
  await new Promise(r => setTimeout(r, 30));
  
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(chalk.white(`  ${message} `));
    
    let input = "";
    let resolved = false;
    
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      stdin.removeAllListeners("data");
      if (stdin.isTTY) {
        try { stdin.setRawMode(false); } catch (e) {}
      }
      stdin.pause();
    };
    
    const onData = (char) => {
      if (resolved) return;
      
      if (char === "\u0003") {
        stdout.write("\n");
        cleanup();
        resolve(null);
        return;
      }
      
      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        cleanup();
        resolve(input);
        return;
      }
      
      if (char === "\u007F" || char === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }
      
      if (char === "\u001B") {
        stdout.write("\n");
        cleanup();
        resolve(null);
        return;
      }
      
      input += char;
      stdout.write("*");
    };
    
    stdin.on("data", onData);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MENUS
// ═══════════════════════════════════════════════════════════════════════════

const MAIN_MENU = [
  { label: `🚀 Quick Setup         ${chalk.gray("API key + Agent (first time)")}`, value: "quicksetup" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator0" },
  { label: `👁️  Watch & Analyze     ${chalk.gray("Monitor code changes")}`, value: "watch" },
  { label: `🔧 Auto Test-Fix       ${chalk.gray("Fix failing tests")}`, value: "fix" },
  { label: `🔍 Analyze Project     ${chalk.gray("Deep code analysis")}`, value: "analyze" },
  { label: `💬 Chat with Agent     ${chalk.gray("Ask questions")}`, value: "chat" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator1" },
  { label: `🧬 Developer Insights  ${chalk.gray("Personal analytics dashboard")}`, value: "insights" },
  { label: `📄 Code Tools          ${chalk.gray("Review, explain, refactor")}`, value: "codetools" },
  { label: `🧪 Generate Tests      ${chalk.gray("Create tests for code")}`, value: "gentests" },
  { label: `🐛 Find Bugs           ${chalk.gray("Scan for potential issues")}`, value: "findbugs" },
  { label: `📝 Git Tools           ${chalk.gray("Commit, diff, status")}`, value: "gittools" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator2" },
  { label: `📊 Agent Status        ${chalk.gray("View agent info & memory")}`, value: "status" },
  { label: `⚙️  Settings            ${chalk.gray("Configure options")}`, value: "settings" },
  { label: `❓ Help                 ${chalk.gray("Documentation")}`, value: "help" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator3" },
  { label: chalk.red("✖  Exit"), value: "exit" },
];

const CODE_TOOLS_MENU = [
  { label: `📖 Review Code         ${chalk.gray("Get AI code review")}`, value: "review" },
  { label: `💡 Explain Code        ${chalk.gray("Understand what code does")}`, value: "explain" },
  { label: `♻️  Refactor            ${chalk.gray("Improve code structure")}`, value: "refactor" },
  { label: `📚 Add Documentation   ${chalk.gray("Generate comments/docs")}`, value: "document" },
  { label: `🔒 Security Check      ${chalk.gray("Find security issues")}`, value: "security" },
];

const GIT_TOOLS_MENU = [
  { label: `📝 Generate Commit     ${chalk.gray("AI commit message")}`, value: "commit" },
  { label: `📊 Git Status          ${chalk.gray("View changes")}`, value: "gitstatus" },
  { label: `📜 View Diff           ${chalk.gray("See what changed")}`, value: "gitdiff" },
  { label: `🌿 Branch Info         ${chalk.gray("Current branch details")}`, value: "branchinfo" },
  { label: `📋 Recent Commits      ${chalk.gray("View commit history")}`, value: "gitlog" },
];

const SETTINGS_MENU = [
  { label: `🎨 Theme & Display     ${chalk.gray("Colors, output style")}`, value: "theme" },
  { label: `⚙️  Watcher Settings    ${chalk.gray("Analysis behavior")}`, value: "watcher" },
  { label: `🔧 Auto-fix Settings   ${chalk.gray("Automatic fixes")}`, value: "autofix" },
  { label: `🛡️  Security Settings   ${chalk.gray("Autonomy & safety")}`, value: "security" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator0" },
  { label: `💻 IDE Detection       ${chalk.gray("View detected IDE info")}`, value: "ideinfo" },
  { label: `🔑 Configure API Key   ${chalk.gray("Update CodeMind API key")}`, value: "apikey" },
  { label: `🤖 Setup Agent         ${chalk.gray("Create/recreate agent")}`, value: "setup" },
  { label: `⬆️  Upgrade Agent       ${chalk.gray("Update to latest template")}`, value: "upgrade" },
  { label: `🧹 Cleanup Agents      ${chalk.gray("Remove old agents")}`, value: "cleanup" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator1" },
  { label: `🗑️  Clear History       ${chalk.gray("Clear recent projects")}`, value: "clearhistory" },
  { label: `📋 View All Config     ${chalk.gray("Show current settings")}`, value: "viewconfig" },
  { label: `🔄 Reset to Defaults   ${chalk.gray("Reset all settings")}`, value: "reset" },
];

async function selectProject() {
  const recentProjects = getRecentProjects();
  const options = [];
  
  for (const proj of recentProjects) {
    if (fs.existsSync(proj)) {
      const shortPath = proj.length > 40 ? "..." + proj.slice(-37) : proj;
      options.push({ label: `📁 ${shortPath}`, value: proj });
    }
  }
  
  if (options.length > 0) {
    options.push({ label: chalk.gray("────────────────────────────────────────────"), value: "separator" });
  }
  
  options.push({ label: "📝 Enter path manually", value: "manual" });
  options.push({ label: `📂 Use current directory (${process.cwd().slice(-30)})`, value: process.cwd() });
  
  const choice = await arrowMenu("SELECT PROJECT", options, { showBack: true });
  
  if (choice === "back" || choice === null) return null;
  
  if (choice === "manual") {
    console.log("");
    const manualPath = await inputPrompt("Enter project path:", { isPath: true });
    return manualPath;
  }
  
  return choice;
}

// Select a file from project
async function selectFile(projectPath) {
  const options = [];
  const VALID_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h"];
  
  // Scan for files
  const scanDir = (dir, depth = 0) => {
    if (depth > 3) return;
    const IGNORE = ["node_modules", ".git", ".next", "dist", "build", "coverage"];
    
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (IGNORE.includes(item)) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (stat.isFile() && VALID_EXTENSIONS.includes(path.extname(item))) {
          const relPath = path.relative(projectPath, fullPath);
          if (options.length < 20) { // Limit to 20 files
            options.push({ label: `📄 ${relPath}`, value: fullPath });
          }
        }
      }
    } catch (e) {}
  };
  
  scanDir(projectPath);
  
  if (options.length === 0) {
    console.log(chalk.yellow("\n  No code files found in project.\n"));
    await waitForKey();
    return null;
  }
  
  options.push({ label: chalk.gray("────────────────────────────────────────────"), value: "separator" });
  options.push({ label: "📝 Enter file path manually", value: "manual" });
  
  const choice = await arrowMenu("SELECT FILE", options, { showBack: true });
  
  if (choice === "back" || choice === null) return null;
  
  if (choice === "manual") {
    console.log("");
    const manualPath = await inputPrompt("Enter file path:", { isPath: true });
    return manualPath;
  }
  
  return choice;
}

// Get CodeMind client (using Letta backend)
async function getCodeMindClient() {
  const { Letta } = await import("@letta-ai/letta-client");
  return new Letta({
    apiKey: process.env.LETTA_API_KEY,
    projectID: process.env.LETTA_PROJECT_ID,
  });
}

// Send prompt to agent and get response
async function askAgent(prompt) {
  const client = await getCodeMindClient();
  const agentId = getAgentId();
  const response = await client.agents.messages.create(agentId, { input: prompt });
  return response?.messages?.map((m) => m.text || m.content).join("\n") || "No response";
}


// ═══════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

async function runQuickSetup() {
  showBanner("🚀 QUICK SETUP");
  
  // Step 1: API Key
  if (!hasApiKey()) {
    console.log(chalk.bold.white("  Step 1: Configure API Key\n"));
    console.log(chalk.gray("  Get your key from: https://app.letta.com\n"));
    
    const apiKey = await secureInput("API Key:");
    
    if (!apiKey) {
      console.log(chalk.yellow("\n  Setup cancelled.\n"));
      await waitForKey();
      return;
    }
    
    if (!apiKey.startsWith("sk-let-") || apiKey.length < 20) {
      console.log(chalk.red("\n  ❌ Invalid API key format."));
      console.log(chalk.gray("     Key should start with 'sk-let-'\n"));
      await waitForKey();
      return;
    }
    
    // Save API key
    const envPath = path.join(ROOT, ".env");
    const examplePath = path.join(ROOT, ".env.example");
    let envContent = fs.existsSync(envPath) 
      ? fs.readFileSync(envPath, "utf8")
      : fs.existsSync(examplePath) 
        ? fs.readFileSync(examplePath, "utf8")
        : "LETTA_API_KEY=\n";
    
    envContent = envContent.replace(/^LETTA_API_KEY=.*/m, `LETTA_API_KEY=${apiKey}`);
    if (!envContent.includes("LETTA_API_KEY=")) {
      envContent += `\nLETTA_API_KEY=${apiKey}\n`;
    }
    
    fs.writeFileSync(envPath, envContent, { encoding: "utf8", mode: 0o600 });
    dotenv.config({ override: true });
    
    console.log(chalk.green("\n  ✓ API key saved!\n"));
  } else {
    console.log(chalk.green("  ✓ API key already configured\n"));
  }
  
  // Step 2: Create Agent
  if (!hasAgent()) {
    console.log(chalk.bold.white("  Step 2: Creating Agent...\n"));
    
    const spinner = ora("  Setting up your AI agent...").start();
    
    try {
      const { spawn } = await import("child_process");
      const child = spawn("node", [path.join(ROOT, "scripts/createAgent.js")], {
        cwd: ROOT,
        env: { ...process.env, LETTA_API_KEY: process.env.LETTA_API_KEY },
        stdio: "pipe",
      });
      
      let output = "";
      child.stdout.on("data", (data) => { output += data.toString(); });
      child.stderr.on("data", (data) => { output += data.toString(); });
      
      await new Promise((resolve) => child.on("close", resolve));
      
      if (hasAgent()) {
        spinner.succeed("  Agent created successfully!");
        const config = getAgentConfig();
        console.log(chalk.gray(`\n  Name: ${config?.name || "CodeMind"}`));
        console.log(chalk.gray(`  Version: ${config?.template_version || "1.0.0"}`));
      } else {
        spinner.fail("  Failed to create agent");
        console.log(chalk.gray(output));
      }
    } catch (err) {
      spinner.fail("  Error: " + err.message);
    }
  } else {
    console.log(chalk.green("  ✓ Agent already configured\n"));
  }
  
  console.log(chalk.green.bold("\n  🎉 Setup complete! You're ready to go.\n"));
  console.log(chalk.gray("  Try 'Watch & Analyze' to monitor your code,"));
  console.log(chalk.gray("  or 'Chat with Agent' to ask questions.\n"));
  
  await waitForKey();
}

async function runWatch() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const project = await selectProject();
  if (!project) return;
  
  // Small delay to ensure stdin is ready
  await new Promise(r => setTimeout(r, 100));
  
  // Watch mode selection
  const watchModeOptions = [
    { label: `📂 Watch ALL     ${chalk.gray("Monitor entire project")}`, value: "all" },
    { label: `📁 Smart mode    ${chalk.gray("Common folders only")}`, value: "smart" },
  ];
  
  const watchMode = await arrowMenu("WATCH MODE", watchModeOptions, { showBack: true });
  if (watchMode === "back") return;
  
  // Small delay before next prompt
  await new Promise(r => setTimeout(r, 100));
  
  const autoFix = await confirmPrompt("Enable auto-fix?");
  if (autoFix === "back") return;
  
  saveToHistory(project);
  
  // Clear screen before launching watcher (watcher will show its own header)
  console.clear();
  
  const args = [project, "--return-to-menu"];
  if (watchMode === "all") args.push("--all");
  if (autoFix) args.push("--auto-fix");
  
  const { spawn } = await import("child_process");
  const child = spawn("node", [path.join(ROOT, "scripts/assistant.js"), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  // Wait for child to exit and check exit code
  const exitCode = await new Promise((resolve) => child.on("close", resolve));
  
  // If exit code is 100, the user chose to return to menu - we continue
  // Otherwise, the watcher handles its own exit
  if (exitCode !== 100 && exitCode !== 0) {
    console.log(chalk.yellow(`\n  Watcher exited with code ${exitCode}\n`));
    await waitForKey();
  }
  // Return to main menu loop naturally
}

async function runTestFix() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const project = await selectProject();
  if (!project) return;
  
  const autoApply = await confirmPrompt("Auto-apply fixes?");
  if (autoApply === "back") return;
  
  saveToHistory(project);
  
  console.log(chalk.green("\n  🔧 Starting Auto Test-Fix..."));
  console.log(chalk.gray("  Press Ctrl+C to stop\n"));
  
  const args = [project];
  if (autoApply) args.push("--auto");
  
  const { spawn } = await import("child_process");
  const child = spawn("node", [path.join(ROOT, "scripts/autoTestFix.js"), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  await new Promise((resolve) => child.on("close", resolve));
}

async function runAnalyze() {
  const project = await selectProject();
  if (!project) return;
  
  saveToHistory(project);
  showBanner("🔍 PROJECT ANALYSIS");
  
  const spinner = ora("  Analyzing project structure...").start();
  
  try {
    const { detectProjectType, scanProjectStructure, getGitContext } = await import("./analyzer.js");
    
    const projectType = detectProjectType(project);
    const structure = scanProjectStructure(project);
    const git = getGitContext(project);
    
    spinner.succeed("  Analysis complete!\n");
    
    // Project Info
    console.log(chalk.bold.white("  📁 PROJECT INFO"));
    console.log(chalk.gray("  ─".repeat(30)));
    console.log(`  Path:       ${project}`);
    console.log(`  Type:       ${projectType.framework || projectType.type}`);
    console.log(`  Language:   ${projectType.language}`);
    if (git.branch) console.log(`  Branch:     ${git.branch}`);
    console.log("");
    
    // Structure
    console.log(chalk.bold.white("  📊 STRUCTURE"));
    console.log(chalk.gray("  ─".repeat(30)));
    console.log(`  Total Files:   ${structure.totalFiles}`);
    console.log(`  Components:    ${structure.components.length}`);
    console.log(`  Utilities:     ${structure.utils.length}`);
    console.log(`  Hooks:         ${structure.hooks.length}`);
    console.log(`  Tests:         ${structure.testFiles.length}`);
    console.log(`  Config Files:  ${structure.configFiles.length}`);
    console.log("");
    
    // Tools
    console.log(chalk.bold.white("  🛠️  TOOLS DETECTED"));
    console.log(chalk.gray("  ─".repeat(30)));
    if (projectType.hasJest) console.log("  ✓ Jest");
    if (projectType.hasVitest) console.log("  ✓ Vitest");
    if (projectType.hasMocha) console.log("  ✓ Mocha");
    if (projectType.hasEslint) console.log("  ✓ ESLint");
    if (projectType.hasPrettier) console.log("  ✓ Prettier");
    if (projectType.language === "typescript") console.log("  ✓ TypeScript");
    console.log("");
    
    // Scripts
    if (Object.keys(projectType.scripts).length > 0) {
      console.log(chalk.bold.white("  📜 AVAILABLE SCRIPTS"));
      console.log(chalk.gray("  ─".repeat(30)));
      const importantScripts = ["dev", "start", "build", "test", "lint"];
      for (const script of importantScripts) {
        if (projectType.scripts[script]) {
          console.log(`  npm run ${script.padEnd(8)} → ${projectType.scripts[script].slice(0, 40)}`);
        }
      }
      console.log("");
    }
    
    // Git Status
    if (git.isGitRepo && git.uncommittedChanges.length > 0) {
      console.log(chalk.bold.white("  📝 UNCOMMITTED CHANGES"));
      console.log(chalk.gray("  ─".repeat(30)));
      for (const change of git.uncommittedChanges.slice(0, 5)) {
        const icon = change.status === "M" ? "📝" : change.status === "A" ? "➕" : change.status === "D" ? "➖" : "❓";
        console.log(`  ${icon} ${change.file}`);
      }
      if (git.uncommittedChanges.length > 5) {
        console.log(chalk.gray(`  ... and ${git.uncommittedChanges.length - 5} more`));
      }
      console.log("");
    }
    
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

async function runChat() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  showBanner("💬 CHAT WITH AGENT");
  console.log(chalk.gray("  Type your message and press Enter"));
  console.log(chalk.gray("  Commands: 'exit' to quit, 'clear' to clear screen\n"));
  
  const { Letta } = await import("@letta-ai/letta-client");
  const client = new Letta({
    apiKey: process.env.LETTA_API_KEY,
    projectID: process.env.LETTA_PROJECT_ID,
  });
  const agentId = getAgentId();
  
  while (true) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const message = await new Promise((resolve) => {
      rl.question(chalk.cyan("  You: "), (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (!message || message.toLowerCase() === "exit" || message.toLowerCase() === "back") {
      console.log(chalk.gray("\n  Returning to main menu...\n"));
      break;
    }
    
    if (message.toLowerCase() === "clear") {
      showBanner("💬 CHAT WITH AGENT");
      console.log(chalk.gray("  Type your message and press Enter"));
      console.log(chalk.gray("  Commands: 'exit' to quit, 'clear' to clear screen\n"));
      continue;
    }
    
    const spinner = ora("  Thinking...").start();
    
    try {
      const response = await client.agents.messages.create(agentId, { input: message });
      spinner.stop();
      
      const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "No response";
      console.log(chalk.green("\n  Agent:"), text, "\n");
    } catch (err) {
      spinner.fail("  Error: " + err.message);
      console.log("");
    }
  }
}

async function runInsights() {
  showBanner("🧬 DEVELOPER INSIGHTS");
  
  console.log(chalk.gray("  Opening your personal analytics dashboard..."));
  console.log(chalk.gray("  This will launch the interactive insights interface.\n"));
  
  // Ask user if they want demo data or real data
  const modeOptions = [
    { label: `📊 Use Real Data     ${chalk.gray("Your actual coding analytics")}`, value: "real" },
    { label: `🎭 Demo Mode         ${chalk.gray("Sample data for exploration")}`, value: "demo" },
  ];
  
  const mode = await arrowMenu("SELECT DATA MODE", modeOptions, { showBack: true });
  if (mode === "back") return;
  
  // Clear screen before launching dashboard
  console.clear();
  
  const { spawn } = await import("child_process");
  const args = [path.join(ROOT, "scripts/insightsDashboard.js")];
  
  // Only add --demo flag if user selected demo mode
  if (mode === "demo") {
    args.push("--demo");
  }
  
  const child = spawn("node", args, {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  // Wait for child to exit
  await new Promise((resolve) => child.on("close", resolve));
  
  // Return to main menu
  console.log(chalk.gray("\n  Returning to main menu...\n"));
}

async function runCommit() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const project = await selectProject();
  if (!project) return;
  
  saveToHistory(project);
  
  const { execSync } = await import("child_process");
  
  let diff;
  try {
    diff = execSync("git diff --staged", { cwd: project, encoding: "utf8" });
    if (!diff) diff = execSync("git diff", { cwd: project, encoding: "utf8" });
  } catch (e) {
    console.log(chalk.red("\n  ❌ Not a git repository or git not available.\n"));
    await waitForKey();
    return;
  }
  
  if (!diff.trim()) {
    console.log(chalk.yellow("\n  ⚠️ No changes detected in git.\n"));
    await waitForKey();
    return;
  }
  
  const spinner = ora("  Analyzing changes and generating commit message...").start();
  
  try {
    const { Letta } = await import("@letta-ai/letta-client");
    const dayjs = (await import("dayjs")).default;
    const { execSync } = await import("child_process");
    
    const client = new Letta({
      apiKey: process.env.LETTA_API_KEY,
      projectID: process.env.LETTA_PROJECT_ID,
    });
    
    const today = dayjs().format("DDMMYY");
    
    // Analyze the changes to understand what was done
    let gitStatus = "";
    let fileList = [];
    try {
      gitStatus = execSync("git status --porcelain", { cwd: project, encoding: "utf8" });
      fileList = gitStatus.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const status = line.substring(0, 2);
          const file = line.substring(3);
          return { status: status.trim(), file };
        });
    } catch (e) {
      // Fallback to diff analysis
    }
    
    // Categorize changes
    const categories = {
      added: fileList.filter(f => f.status.includes('A')).length,
      modified: fileList.filter(f => f.status.includes('M')).length,
      deleted: fileList.filter(f => f.status.includes('D')).length,
      tests: fileList.filter(f => f.file.includes('test') || f.file.includes('spec')).length,
      docs: fileList.filter(f => f.file.includes('.md') || f.file.includes('README')).length,
      configs: fileList.filter(f => f.file.includes('config') || f.file.includes('.json') || f.file.includes('.yml')).length,
      components: fileList.filter(f => f.file.includes('component') || f.file.includes('src/')).length
    };
    
    const prompt = `Analyze these git changes and generate a professional commit message.

CHANGES ANALYSIS:
- Files changed: ${fileList.length}
- Added: ${categories.added}, Modified: ${categories.modified}, Deleted: ${categories.deleted}
- Tests: ${categories.tests}, Docs: ${categories.docs}, Configs: ${categories.configs}
- Components/Source: ${categories.components}

FILES CHANGED:
${fileList.slice(0, 10).map(f => `${f.status} ${f.file}`).join('\n')}

DIFF PREVIEW:
\`\`\`diff
${diff.slice(0, 1500)}
\`\`\`

REQUIREMENTS:
1. Use conventional commit format: Type: Description
2. Types: Feat (new feature), Fix (bug fix), Refactor (code restructure), Style (formatting), Docs (documentation), Test (tests), Chore (maintenance)
3. Be SPECIFIC about what functionality was added/changed, not just file names
4. Focus on the MAIN PURPOSE of the changes
5. Use present tense imperative ("Add" not "Added")
6. Keep description under 50 characters
7. Capitalize first letter after colon

EXAMPLES:
- "Feat: Add developer insights dashboard with analytics"
- "Fix: Resolve memory leak in file watcher"
- "Refactor: Simplify commit message generation logic"
- "Test: Add unit tests for insight engine"
- "Docs: Update README with new features"

Generate ONE professional commit message that clearly describes the main purpose of these changes.
Format: ${today} - [Type]: [Specific description]

Respond with ONLY the commit message, nothing else.`;
    
    const response = await client.agents.messages.create(getAgentId(), { input: prompt });
    let message = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    
    // Clean up the message
    message = message.replace(/^["']|["']$/g, "").trim();
    message = message.replace(/^(commit:?\s*)/i, "");
    
    // Ensure proper format
    if (!message.startsWith(today)) {
      // Extract the type and description
      const match = message.match(/^(Feat|Fix|Refactor|Style|Docs|Test|Chore|Perf|Build|Ci):\s*(.+)/i);
      if (match) {
        const type = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        const desc = match[2].charAt(0).toUpperCase() + match[2].slice(1);
        message = `${today} - ${type}: ${desc}`;
      } else {
        // Fallback: try to determine type from changes
        let type = "Refactor";
        if (categories.added > categories.modified) type = "Feat";
        else if (categories.tests > 0 && categories.tests >= fileList.length / 2) type = "Test";
        else if (categories.docs > 0 && categories.docs >= fileList.length / 2) type = "Docs";
        else if (categories.configs > 0) type = "Chore";
        
        message = `${today} - ${type}: ${message.charAt(0).toUpperCase()}${message.slice(1)}`;
      }
    }
    
    // Truncate if too long (keep date + type, truncate description)
    if (message.length > 72) {
      const parts = message.split(' - ');
      if (parts.length === 2) {
        const datePrefix = parts[0] + ' - ';
        const desc = parts[1];
        const maxDescLength = 72 - datePrefix.length - 3; // -3 for "..."
        if (desc.length > maxDescLength) {
          message = datePrefix + desc.slice(0, maxDescLength) + "...";
        }
      }
    }
    
    spinner.succeed("  Professional commit message generated!");
    
    console.log(chalk.green("\n  📝 Suggested commit message:"));
    console.log(chalk.white.bold(`     ${message}\n`));
    
    const doCommit = await confirmPrompt("Commit with this message?");
    
    if (doCommit === "back") return;
    
    if (doCommit) {
      execSync(`git add -A`, { cwd: project });
      execSync(`git commit -m "${message}"`, { cwd: project });
      console.log(chalk.green("\n  ✅ Committed successfully!\n"));
      
      const doPush = await confirmPrompt("Push to remote?");
      if (doPush === true) {
        try {
          execSync(`git push`, { cwd: project });
          console.log(chalk.green("  ✅ Pushed!\n"));
        } catch (e) {
          console.log(chalk.red("  ❌ Push failed: " + e.message + "\n"));
        }
      }
    }
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE TOOLS
// ═══════════════════════════════════════════════════════════════════════════

async function runCodeTools() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  while (true) {
    const action = await arrowMenu("CODE TOOLS", CODE_TOOLS_MENU, { showBack: true });
    
    if (action === "back") return;
    
    const project = await selectProject();
    if (!project) continue;
    
    const file = await selectFile(project);
    if (!file) continue;
    
    saveToHistory(project);
    
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(project, file);
    
    let prompt;
    let title;
    
    switch (action) {
      case "review":
        title = "📖 CODE REVIEW";
        prompt = `Review this code file and provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance concerns
4. Suggestions for improvement

File: ${relPath}
\`\`\`
${content.slice(0, 8000)}
\`\`\`

Provide a structured review with specific line references where applicable.`;
        break;
        
      case "explain":
        title = "💡 CODE EXPLANATION";
        prompt = `Explain what this code does in detail:
1. Overall purpose
2. Key functions/components and what they do
3. Data flow
4. Any complex logic explained simply

File: ${relPath}
\`\`\`
${content.slice(0, 8000)}
\`\`\``;
        break;
        
      case "refactor":
        title = "♻️ REFACTORING SUGGESTIONS";
        prompt = `Suggest refactoring improvements for this code:
1. Code structure improvements
2. Better naming conventions
3. DRY principle violations
4. Modern syntax/patterns that could be used
5. Provide specific code examples for each suggestion

File: ${relPath}
\`\`\`
${content.slice(0, 8000)}
\`\`\``;
        break;
        
      case "document":
        title = "📚 DOCUMENTATION";
        prompt = `Generate documentation for this code:
1. File-level JSDoc/docstring
2. Function/method documentation
3. Inline comments for complex logic
4. Usage examples

File: ${relPath}
\`\`\`
${content.slice(0, 8000)}
\`\`\`

Provide the documented version of the code.`;
        break;
        
      case "security":
        title = "🔒 SECURITY ANALYSIS";
        prompt = `Perform a security analysis on this code:
1. Identify potential vulnerabilities (XSS, injection, etc.)
2. Check for exposed secrets or sensitive data
3. Authentication/authorization issues
4. Input validation problems
5. Rate each issue by severity (Critical/High/Medium/Low)

File: ${relPath}
\`\`\`
${content.slice(0, 8000)}
\`\`\``;
        break;
        
      default:
        continue;
    }
    
    showBanner(title);
    console.log(chalk.gray(`  File: ${relPath}\n`));
    
    const spinner = ora("  Analyzing...").start();
    
    try {
      const response = await askAgent(prompt);
      spinner.stop();
      console.log(chalk.green("\n  Result:\n"));
      console.log(response);
      console.log("");
    } catch (err) {
      spinner.fail("  Error: " + err.message);
    }
    
    await waitForKey();
  }
}

async function runGenerateTests() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const project = await selectProject();
  if (!project) return;
  
  const file = await selectFile(project);
  if (!file) return;
  
  saveToHistory(project);
  
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(project, file);
  const ext = path.extname(file);
  
  // Detect test framework
  const pkgPath = path.join(project, "package.json");
  let testFramework = "jest";
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) testFramework = "vitest";
    else if (deps.mocha) testFramework = "mocha";
  }
  
  showBanner("🧪 GENERATE TESTS");
  console.log(chalk.gray(`  File: ${relPath}`));
  console.log(chalk.gray(`  Framework: ${testFramework}\n`));
  
  const spinner = ora("  Generating tests...").start();
  
  const prompt = `Generate comprehensive unit tests for this code using ${testFramework}:

File: ${relPath}
\`\`\`${ext.slice(1)}
${content.slice(0, 8000)}
\`\`\`

Requirements:
1. Test all exported functions/components
2. Include edge cases and error scenarios
3. Use descriptive test names
4. Mock external dependencies
5. Aim for high coverage

Provide complete, runnable test code.`;

  try {
    const response = await askAgent(prompt);
    spinner.stop();
    
    console.log(chalk.green("\n  Generated Tests:\n"));
    console.log(response);
    console.log("");
    
    // Offer to save
    const testFileName = relPath.replace(ext, `.test${ext}`);
    const save = await confirmPrompt(`Save to ${testFileName}?`);
    
    if (save === true) {
      // Extract code from response
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        const testPath = path.join(project, testFileName);
        fs.mkdirSync(path.dirname(testPath), { recursive: true });
        fs.writeFileSync(testPath, codeMatch[1], "utf8");
        console.log(chalk.green(`\n  ✅ Saved to ${testFileName}\n`));
      } else {
        console.log(chalk.yellow("\n  Could not extract code from response.\n"));
      }
    }
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

async function runFindBugs() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Quick Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const project = await selectProject();
  if (!project) return;
  
  saveToHistory(project);
  
  showBanner("🐛 FIND BUGS");
  
  // Scan multiple files
  const VALID_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
  const files = [];
  
  const scanDir = (dir, depth = 0) => {
    if (depth > 3 || files.length >= 10) return;
    const IGNORE = ["node_modules", ".git", ".next", "dist", "build", "coverage", "__tests__", "tests"];
    
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (IGNORE.includes(item) || files.length >= 10) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (stat.isFile() && VALID_EXTENSIONS.includes(path.extname(item))) {
          files.push(fullPath);
        }
      }
    } catch (e) {}
  };
  
  scanDir(project);
  
  if (files.length === 0) {
    console.log(chalk.yellow("  No code files found.\n"));
    await waitForKey();
    return;
  }
  
  console.log(chalk.gray(`  Scanning ${files.length} files...\n`));
  
  const spinner = ora("  Analyzing for bugs...").start();
  
  // Build context from files
  let context = "";
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relPath = path.relative(project, file);
    context += `\n--- ${relPath} ---\n${content.slice(0, 2000)}\n`;
  }
  
  const prompt = `Scan these code files for potential bugs and issues:

${context.slice(0, 15000)}

Look for:
1. Logic errors and edge cases
2. Null/undefined handling issues
3. Race conditions or async problems
4. Memory leaks
5. Type mismatches
6. Error handling gaps

For each bug found, provide:
- File and approximate location
- Description of the issue
- Severity (Critical/High/Medium/Low)
- Suggested fix`;

  try {
    const response = await askAgent(prompt);
    spinner.stop();
    
    console.log(chalk.green("\n  Bug Analysis Results:\n"));
    console.log(response);
    console.log("");
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

// ═══════════════════════════════════════════════════════════════════════════
// GIT TOOLS
// ═══════════════════════════════════════════════════════════════════════════

async function runGitTools() {
  while (true) {
    const action = await arrowMenu("GIT TOOLS", GIT_TOOLS_MENU, { showBack: true });
    
    if (action === "back") return;
    
    const project = await selectProject();
    if (!project) continue;
    
    saveToHistory(project);
    
    const { execSync } = await import("child_process");
    
    // Check if git repo
    try {
      execSync("git rev-parse --git-dir", { cwd: project, stdio: "pipe" });
    } catch (e) {
      console.log(chalk.red("\n  ❌ Not a git repository.\n"));
      await waitForKey();
      continue;
    }
    
    switch (action) {
      case "commit":
        await runCommit();
        break;
        
      case "gitstatus":
        showBanner("📊 GIT STATUS");
        try {
          const status = execSync("git status", { cwd: project, encoding: "utf8" });
          console.log(status);
        } catch (e) {
          console.log(chalk.red("  Error: " + e.message));
        }
        await waitForKey();
        break;
        
      case "gitdiff":
        showBanner("📜 GIT DIFF");
        try {
          let diff = execSync("git diff --staged", { cwd: project, encoding: "utf8" });
          if (!diff) diff = execSync("git diff", { cwd: project, encoding: "utf8" });
          if (diff) {
            console.log(diff.slice(0, 5000));
            if (diff.length > 5000) console.log(chalk.gray("\n  ... (truncated)"));
          } else {
            console.log(chalk.gray("  No changes to show."));
          }
        } catch (e) {
          console.log(chalk.red("  Error: " + e.message));
        }
        await waitForKey();
        break;
        
      case "branchinfo":
        showBanner("🌿 BRANCH INFO");
        try {
          const branch = execSync("git branch --show-current", { cwd: project, encoding: "utf8" }).trim();
          const remote = execSync("git remote -v", { cwd: project, encoding: "utf8" });
          const lastCommit = execSync("git log -1 --oneline", { cwd: project, encoding: "utf8" }).trim();
          
          console.log(chalk.bold.white(`  Current Branch: ${branch}\n`));
          console.log(chalk.gray("  Remote:"));
          console.log(remote);
          console.log(chalk.gray("  Last Commit:"));
          console.log(`  ${lastCommit}\n`);
        } catch (e) {
          console.log(chalk.red("  Error: " + e.message));
        }
        await waitForKey();
        break;
        
      case "gitlog":
        showBanner("📋 RECENT COMMITS");
        try {
          const log = execSync("git log --oneline -15", { cwd: project, encoding: "utf8" });
          console.log(log);
        } catch (e) {
          console.log(chalk.red("  Error: " + e.message));
        }
        await waitForKey();
        break;
    }
  }
}


async function runStatus() {
  showBanner("📊 AGENT STATUS");
  
  // API Key Status
  console.log(chalk.bold.white("  🔑 API CONFIGURATION"));
  console.log(chalk.gray("  ─".repeat(30)));
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API Key: Configured"));
    if (process.env.LETTA_PROJECT_ID) {
      console.log(chalk.green(`  ✓ Project ID: ${process.env.LETTA_PROJECT_ID.slice(0, 20)}...`));
    }
  } else {
    console.log(chalk.red("  ✗ API Key: Not configured"));
  }
  console.log("");
  
  // Agent Status
  console.log(chalk.bold.white("  🤖 AGENT"));
  console.log(chalk.gray("  ─".repeat(30)));
  if (hasAgent()) {
    const config = getAgentConfig();
    console.log(chalk.green(`  ✓ Status: Active`));
    console.log(`  Name: ${config?.name || "Unknown"}`);
    console.log(`  ID: ${getAgentId().slice(0, 30)}...`);
    console.log(`  Template Version: ${config?.template_version || "Unknown"}`);
    console.log(`  Model: ${config?.model || "Unknown"}`);
    console.log(`  Created: ${config?.created ? new Date(config.created).toLocaleDateString() : "Unknown"}`);
    
    if (config?.memory_blocks) {
      console.log(`  Memory Blocks: ${config.memory_blocks.join(", ")}`);
    }
  } else {
    console.log(chalk.red("  ✗ Status: Not configured"));
  }
  console.log("");
  
  // Memory Status
  console.log(chalk.bold.white("  🧠 MEMORY"));
  console.log(chalk.gray("  ─".repeat(30)));
  try {
    const shortTermPath = path.join(ROOT, "memory/short_term.json");
    const longTermPath = path.join(ROOT, "memory/long_term.json");
    
    if (fs.existsSync(shortTermPath)) {
      const shortTerm = JSON.parse(fs.readFileSync(shortTermPath, "utf8"));
      console.log(`  Short-term entries: ${Array.isArray(shortTerm) ? shortTerm.length : 0}`);
    }
    
    if (fs.existsSync(longTermPath)) {
      const longTerm = JSON.parse(fs.readFileSync(longTermPath, "utf8"));
      const keys = Object.keys(longTerm);
      console.log(`  Long-term keys: ${keys.length}`);
      if (longTerm.common_failures) {
        console.log(`  Learned failures: ${longTerm.common_failures.length}`);
      }
    }
  } catch (e) {
    console.log(chalk.gray("  Memory files not initialized"));
  }
  console.log("");
  
  // Recent Projects
  const recentProjects = getRecentProjects();
  if (recentProjects.length > 0) {
    console.log(chalk.bold.white("  📁 RECENT PROJECTS"));
    console.log(chalk.gray("  ─".repeat(30)));
    for (const proj of recentProjects.slice(0, 3)) {
      const exists = fs.existsSync(proj);
      const icon = exists ? "✓" : "✗";
      const color = exists ? chalk.green : chalk.red;
      console.log(color(`  ${icon} ${proj.slice(-50)}`));
    }
    console.log("");
  }
  
  // Check for updates
  const templatePath = path.join(ROOT, "templates/agent/code_agent.json");
  if (fs.existsSync(templatePath) && hasAgent()) {
    const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
    const config = getAgentConfig();
    if (config?.template_version && template.version !== config.template_version) {
      console.log(chalk.yellow(`  ⚠️  Update available: v${config.template_version} → v${template.version}`));
      console.log(chalk.gray("     Run 'Settings → Upgrade Agent' to update\n"));
    }
  }
  
  await waitForKey();
}

async function runSettings() {
  while (true) {
    const action = await arrowMenu("SETTINGS", SETTINGS_MENU, { showBack: true });
    
    switch (action) {
      case "theme":
        await runThemeSettings();
        break;
      case "watcher":
        await runWatcherSettings();
        break;
      case "autofix":
        await runAutoFixSettings();
        break;
      case "security":
        await runSecuritySettings();
        break;
      case "ideinfo":
        await runIDEInfo();
        break;
      case "apikey":
        await runConfigureApiKey();
        break;
      case "setup":
        await runSetup();
        break;
      case "upgrade":
        await runUpgrade();
        break;
      case "cleanup":
        await runCleanup();
        break;
      case "clearhistory":
        await runClearHistory();
        break;
      case "viewconfig":
        await runViewConfig();
        break;
      case "reset":
        await runResetSettings();
        break;
      case "back":
        return;
    }
  }
}

async function runIDEInfo() {
  showBanner("💻 IDE DETECTION");
  
  // Re-detect IDE
  currentIDE = detectIDE(process.cwd());
  const ide = currentIDE.primary;
  const supported = getSupportedIDEs();
  
  // Current IDE
  console.log(chalk.bold.white("  Detected IDE:\n"));
  
  const ideIcon = ide.type === "agentic" ? "🤖" : ide.type === "modern" ? "⚡" : ide.type === "terminal" ? "💻" : "📝";
  const typeBadge = ide.type === "agentic" 
    ? chalk.bgMagenta.white(" AGENTIC AI ") 
    : ide.type === "modern" 
      ? chalk.bgCyan.black(" MODERN ") 
      : ide.type === "terminal"
        ? chalk.bgGray.white(" TERMINAL ")
        : chalk.bgGray.white(" TRADITIONAL ");
  
  console.log(`  ${ideIcon} ${chalk.bold.white(ide.name)} ${typeBadge}`);
  
  if (ide.confidence > 0) {
    console.log(chalk.gray(`     Detection confidence: ${ide.confidence.toFixed(0)}%`));
  }
  
  if (ide.description) {
    console.log(chalk.gray(`     ${ide.description}`));
  }
  
  console.log("");
  
  // Features
  if (ide.features?.length > 0) {
    console.log(chalk.bold.white("  Features:"));
    console.log(`     ${ide.features.map(f => chalk.cyan(`◆ ${f}`)).join("  ")}`);
    console.log("");
  }
  
  // Collaboration status
  console.log(chalk.bold.white("  AI Collaboration:\n"));
  
  if (ide.type === "agentic") {
    console.log(chalk.green("  ✓ Full AI collaboration enabled"));
    console.log(chalk.gray("     CodeMind will sync with your IDE's built-in AI assistant"));
    console.log(chalk.gray("     for enhanced code analysis and suggestions."));
    
    if (ide.collaboration?.protocol) {
      console.log(chalk.gray(`     Protocol: ${ide.collaboration.protocol}`));
    }
  } else if (ide.collaboration?.canShare) {
    console.log(chalk.yellow("  ◆ Partial collaboration available"));
    console.log(chalk.gray("     Some features can integrate with your editor."));
  } else {
    console.log(chalk.gray("  ○ Running in standalone mode"));
    console.log(chalk.gray("     CodeMind works independently from your editor."));
  }
  
  console.log("");
  
  // Suggestions path
  if (ide.collaboration?.suggestionsPath) {
    console.log(chalk.gray(`  Suggestions saved to: ${ide.collaboration.suggestionsPath}`));
  }
  
  console.log("");
  console.log(chalk.gray("─".repeat(60)));
  console.log("");
  
  // Supported IDEs
  console.log(chalk.bold.white("  Supported IDEs:\n"));
  
  const agenticIDEs = supported.filter(i => i.type === "agentic");
  const modernIDEs = supported.filter(i => i.type === "modern");
  const traditionalIDEs = supported.filter(i => i.type === "traditional");
  
  console.log(chalk.magenta("  🤖 Agentic AI IDEs (full collaboration):"));
  for (const i of agenticIDEs) {
    const isCurrent = i.id === ide.id;
    console.log(`     ${isCurrent ? chalk.green("●") : chalk.gray("○")} ${i.name}${isCurrent ? chalk.green(" (current)") : ""}`);
  }
  console.log("");
  
  console.log(chalk.cyan("  ⚡ Modern Editors:"));
  for (const i of modernIDEs) {
    const isCurrent = i.id === ide.id;
    console.log(`     ${isCurrent ? chalk.green("●") : chalk.gray("○")} ${i.name}${isCurrent ? chalk.green(" (current)") : ""}`);
  }
  console.log("");
  
  console.log(chalk.gray("  📝 Traditional Editors:"));
  for (const i of traditionalIDEs) {
    const isCurrent = i.id === ide.id;
    console.log(`     ${isCurrent ? chalk.green("●") : chalk.gray("○")} ${i.name}${isCurrent ? chalk.green(" (current)") : ""}`);
  }
  console.log("");
  
  await waitForKey();
}

async function runConfigureApiKey() {
  showBanner("🔑 CONFIGURE API KEY");
  
  console.log(chalk.gray("  Your API key will be stored securely using hardware-bound encryption"));
  console.log(chalk.gray("  Get your key from: https://app.letta.com\n"));
  
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API key is already configured\n"));
    
    const confirm = await confirmPrompt("Replace existing API key?");
    if (confirm === "back" || confirm === false) return;
  }
  
  console.log(chalk.yellow("\n  Enter your CodeMind API key (input is hidden):"));
  console.log(chalk.gray("  Press Esc to cancel\n"));
  
  const apiKey = await secureInput("API Key:");
  
  if (!apiKey) {
    console.log(chalk.yellow("\n  Cancelled.\n"));
    await waitForKey();
    return;
  }
  
  if (!apiKey.startsWith("sk-let-") || apiKey.length < 20) {
    console.log(chalk.red("\n  ❌ Invalid API key format.\n"));
    await waitForKey();
    return;
  }
  
  const spinner = ora("  Saving configuration...").start();
  
  try {
    // Try to use secure credential manager first
    try {
      const { SecureCredentialManager } = await import("../src/security/credentialManager.js");
      const credManager = new SecureCredentialManager();
      await credManager.initialize();
      
      // Store in secure credential manager
      await credManager.storeApiKey(apiKey, 'letta');
      
      // Also update .env for backward compatibility
      const envPath = path.join(ROOT, ".env");
      const examplePath = path.join(ROOT, ".env.example");
      let envContent = fs.existsSync(envPath) 
        ? fs.readFileSync(envPath, "utf8")
        : fs.existsSync(examplePath) 
          ? fs.readFileSync(examplePath, "utf8")
          : "LETTA_API_KEY=\n";
      
      envContent = envContent.replace(/^LETTA_API_KEY=.*/m, `LETTA_API_KEY=${apiKey}`);
      if (!envContent.includes("LETTA_API_KEY=")) {
        envContent += `\nLETTA_API_KEY=${apiKey}\n`;
      }
      
      fs.writeFileSync(envPath, envContent, { encoding: "utf8", mode: 0o600 });
      dotenv.config({ override: true });
      
      spinner.succeed("  API key saved securely!");
      console.log(chalk.green("  ✓ Stored in secure credential manager"));
      console.log(chalk.gray("  ✓ Hardware-bound encryption enabled"));
      console.log(chalk.gray("  ✓ Automatic rotation scheduled"));
      
    } catch (secureError) {
      // Fallback to .env file storage
      console.warn(chalk.yellow("  ⚠ Secure storage unavailable, using .env file"));
      
      const envPath = path.join(ROOT, ".env");
      const examplePath = path.join(ROOT, ".env.example");
      let envContent = fs.existsSync(envPath) 
        ? fs.readFileSync(envPath, "utf8")
        : fs.existsSync(examplePath) 
          ? fs.readFileSync(examplePath, "utf8")
          : "LETTA_API_KEY=\n";
      
      envContent = envContent.replace(/^LETTA_API_KEY=.*/m, `LETTA_API_KEY=${apiKey}`);
      if (!envContent.includes("LETTA_API_KEY=")) {
        envContent += `\nLETTA_API_KEY=${apiKey}\n`;
      }
      
      fs.writeFileSync(envPath, envContent, { encoding: "utf8", mode: 0o600 });
      dotenv.config({ override: true });
      
      spinner.succeed("  API key saved!");
    }
    
  } catch (err) {
    spinner.fail("  Failed to save: " + err.message);
  }
  
  await waitForKey();
}

async function runSetup() {
  showBanner("⚙️ AGENT SETUP");
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not set. Configure API key first.\n"));
    await waitForKey();
    return;
  }
  
  if (hasAgent()) {
    const confirm = await confirmPrompt("Agent already exists. Recreate?");
    if (confirm === "back" || confirm === false) return;
  }
  
  const spinner = ora("  Creating agent from template...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/createAgent.js"), "--force"], {
      cwd: ROOT,
      env: { ...process.env },
      stdio: "pipe",
    });
    
    let output = "";
    child.stdout.on("data", (data) => { output += data.toString(); });
    child.stderr.on("data", (data) => { output += data.toString(); });
    
    await new Promise((resolve) => child.on("close", resolve));
    
    if (hasAgent()) {
      spinner.succeed("  Agent created successfully!");
      const config = getAgentConfig();
      console.log(chalk.gray(`\n  ID: ${getAgentId().slice(0, 30)}...`));
      console.log(chalk.gray(`  Version: ${config?.template_version || "1.0.0"}\n`));
    } else {
      spinner.fail("  Failed to create agent");
      if (output) console.log(chalk.gray(output));
    }
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

async function runUpgrade() {
  showBanner("⬆️ UPGRADE AGENT");
  
  if (!hasAgent()) {
    console.log(chalk.red("  ❌ No agent to upgrade. Run Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const templatePath = path.join(ROOT, "templates/agent/code_agent.json");
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const config = getAgentConfig();
  
  console.log(`  Current version: ${config?.template_version || "unknown"}`);
  console.log(`  Latest version:  ${template.version}\n`);
  
  if (config?.template_version === template.version) {
    console.log(chalk.green("  ✓ Agent is already up to date!\n"));
    await waitForKey();
    return;
  }
  
  const confirm = await confirmPrompt("Upgrade to latest version?");
  if (confirm === "back" || confirm === false) return;
  
  const spinner = ora("  Upgrading agent...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/createAgent.js"), "--upgrade"], {
      cwd: ROOT,
      env: { ...process.env },
      stdio: "pipe",
    });
    
    await new Promise((resolve) => child.on("close", resolve));
    
    spinner.succeed("  Agent upgraded successfully!");
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

async function runCleanup() {
  showBanner("🧹 AGENT CLEANUP");
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not set.\n"));
    await waitForKey();
    return;
  }
  
  console.log(chalk.yellow("  This will delete all agents except the current one.\n"));
  
  const confirm = await confirmPrompt("Are you sure?");
  if (confirm === "back" || confirm === false) return;
  
  const spinner = ora("  Cleaning up agents...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/cleanupAgents.js"), "--confirm"], {
      cwd: ROOT,
      env: { ...process.env },
      stdio: "pipe",
    });
    
    await new Promise((resolve) => child.on("close", resolve));
    spinner.succeed("  Cleanup complete!");
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await waitForKey();
}

async function runClearHistory() {
  showBanner("🗑️ CLEAR HISTORY");
  
  const confirm = await confirmPrompt("Clear recent projects history?");
  if (confirm === "back" || confirm === false) return;
  
  const historyFile = path.join(ROOT, ".letta_history.json");
  if (fs.existsSync(historyFile)) {
    fs.unlinkSync(historyFile);
    console.log(chalk.green("\n  ✓ History cleared!\n"));
  } else {
    console.log(chalk.gray("\n  No history to clear.\n"));
  }
  
  await waitForKey();
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW SETTINGS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getEnvValue(key, defaultValue = "") {
  return process.env[key] || defaultValue;
}

function updateEnvFile(updates) {
  const envPath = path.join(ROOT, ".env");
  const examplePath = path.join(ROOT, ".env.example");
  
  let envContent = fs.existsSync(envPath) 
    ? fs.readFileSync(envPath, "utf8")
    : fs.existsSync(examplePath) 
      ? fs.readFileSync(examplePath, "utf8")
      : "";
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*`, "m");
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  fs.writeFileSync(envPath, envContent, "utf8");
  
  // Reload env
  dotenv.config({ override: true });
}

async function runThemeSettings() {
  const THEME_OPTIONS = [
    { label: `🌊 Ocean      ${chalk.cyan("█████")} ${chalk.gray("Cool blues and cyans")}`, value: "ocean" },
    { label: `🌲 Forest     ${chalk.green("█████")} ${chalk.gray("Natural greens")}`, value: "forest" },
    { label: `🌅 Sunset     ${chalk.hex("#FF6B6B")("█████")} ${chalk.gray("Warm oranges and reds")}`, value: "sunset" },
    { label: `🌙 Midnight   ${chalk.hex("#9D4EDD")("█████")} ${chalk.gray("Deep purples")}`, value: "midnight" },
    { label: `⬜ Mono       ${chalk.white("█████")} ${chalk.gray("Clean monochrome")}`, value: "mono" },
  ];
  
  const currentTheme = getEnvValue("LETTA_THEME", "ocean");
  
  showBanner("🎨 THEME & DISPLAY SETTINGS");
  console.log(chalk.gray(`  Current theme: ${chalk.cyan(currentTheme)}\n`));
  
  const theme = await arrowMenu("SELECT THEME", THEME_OPTIONS, { showBack: true });
  
  if (theme === "back") return;
  
  updateEnvFile({ LETTA_THEME: theme });
  console.log(chalk.green(`\n  ✓ Theme changed to ${theme}!\n`));
  console.log(chalk.gray("  Restart the watcher to see the new theme.\n"));
  
  await waitForKey();
}

async function runWatcherSettings() {
  while (true) {
    const currentDebounce = getEnvValue("WATCHER_DEBOUNCE", "2000");
    const currentDepth = getEnvValue("WATCHER_DEPTH", "20");
    const currentExtensions = getEnvValue("WATCH_EXTENSIONS", ".js,.jsx,.ts,.tsx,.json,.css,.scss,.md");
    const verboseMode = getEnvValue("VERBOSE_OUTPUT", "false");
    const showTimestamps = getEnvValue("SHOW_TIMESTAMPS", "true");
    
    const WATCHER_OPTIONS = [
      { label: `⏱️  Debounce Delay     ${chalk.gray(`Current: ${currentDebounce}ms`)}`, value: "debounce" },
      { label: `📁 Watch Depth        ${chalk.gray(`Current: ${currentDepth} levels`)}`, value: "depth" },
      { label: `📄 File Extensions    ${chalk.gray("Which files to watch")}`, value: "extensions" },
      { label: `📝 Verbose Output     ${chalk.gray(`Current: ${verboseMode}`)}`, value: "verbose" },
      { label: `🕐 Show Timestamps    ${chalk.gray(`Current: ${showTimestamps}`)}`, value: "timestamps" },
      { label: chalk.gray("────────────────────────────────────────────"), value: "separator" },
      { label: `ℹ️  What do these mean?`, value: "help" },
    ];
    
    showBanner("⚙️ WATCHER SETTINGS");
    const action = await arrowMenu("WATCHER OPTIONS", WATCHER_OPTIONS, { showBack: true });
    
    if (action === "back") return;
    
    switch (action) {
      case "debounce": {
        console.log(chalk.gray("\n  Debounce delay: How long to wait after a file change before analyzing."));
        console.log(chalk.gray("  Lower = faster response, Higher = fewer duplicate analyses.\n"));
        
        const DEBOUNCE_OPTIONS = [
          { label: "500ms  - Very fast (may cause duplicates)", value: "500" },
          { label: "1000ms - Fast", value: "1000" },
          { label: "1500ms - Balanced (recommended)", value: "1500" },
          { label: "2000ms - Default", value: "2000" },
          { label: "3000ms - Slow (for large files)", value: "3000" },
        ];
        
        const debounce = await arrowMenu("SELECT DEBOUNCE DELAY", DEBOUNCE_OPTIONS, { showBack: true });
        if (debounce !== "back") {
          updateEnvFile({ WATCHER_DEBOUNCE: debounce });
          console.log(chalk.green(`\n  ✓ Debounce set to ${debounce}ms\n`));
          await waitForKey();
        }
        break;
      }
      
      case "depth": {
        console.log(chalk.gray("\n  Watch depth: How many folder levels deep to watch."));
        console.log(chalk.gray("  Higher = more files watched, but slower startup.\n"));
        
        const DEPTH_OPTIONS = [
          { label: "5 levels  - Shallow", value: "5" },
          { label: "10 levels - Medium", value: "10" },
          { label: "20 levels - Deep (default)", value: "20" },
          { label: "50 levels - Very deep", value: "50" },
        ];
        
        const depth = await arrowMenu("SELECT WATCH DEPTH", DEPTH_OPTIONS, { showBack: true });
        if (depth !== "back") {
          updateEnvFile({ WATCHER_DEPTH: depth });
          console.log(chalk.green(`\n  ✓ Watch depth set to ${depth} levels\n`));
          await waitForKey();
        }
        break;
      }
      
      case "extensions": {
        console.log(chalk.gray("\n  Current extensions: " + currentExtensions));
        console.log(chalk.gray("  Enter comma-separated list (e.g., .js,.ts,.py)\n"));
        
        const extensions = await inputPrompt("File extensions:", { allowEmpty: false });
        if (extensions) {
          updateEnvFile({ WATCH_EXTENSIONS: extensions });
          console.log(chalk.green(`\n  ✓ Extensions updated!\n`));
        }
        await waitForKey();
        break;
      }
      
      case "verbose": {
        const newValue = verboseMode === "true" ? "false" : "true";
        updateEnvFile({ VERBOSE_OUTPUT: newValue });
        console.log(chalk.green(`\n  ✓ Verbose output ${newValue === "true" ? "enabled" : "disabled"}\n`));
        await waitForKey();
        break;
      }
      
      case "timestamps": {
        const newValue = showTimestamps === "true" ? "false" : "true";
        updateEnvFile({ SHOW_TIMESTAMPS: newValue });
        console.log(chalk.green(`\n  ✓ Timestamps ${newValue === "true" ? "enabled" : "disabled"}\n`));
        await waitForKey();
        break;
      }
      
      case "help": {
        console.log(chalk.bold.white("\n  WATCHER SETTINGS EXPLAINED\n"));
        console.log(chalk.cyan("  Debounce Delay"));
        console.log(chalk.gray("    When you save a file, the watcher waits this long before"));
        console.log(chalk.gray("    analyzing. This prevents multiple analyses if you save quickly.\n"));
        console.log(chalk.cyan("  Watch Depth"));
        console.log(chalk.gray("    How many folder levels deep to monitor. Deeper = more files,"));
        console.log(chalk.gray("    but may slow down startup on large projects.\n"));
        console.log(chalk.cyan("  File Extensions"));
        console.log(chalk.gray("    Only files with these extensions will be analyzed.\n"));
        console.log(chalk.cyan("  Verbose Output"));
        console.log(chalk.gray("    Show more detailed information during analysis.\n"));
        console.log(chalk.cyan("  Timestamps"));
        console.log(chalk.gray("    Show time stamps on each log line.\n"));
        await waitForKey();
        break;
      }
    }
  }
}

async function runAutoFixSettings() {
  while (true) {
    const autoApply = getEnvValue("AUTO_APPLY", "false");
    const minConfidence = getEnvValue("MIN_CONFIDENCE", "0.7");
    const maxAttempts = getEnvValue("MAX_FIX_ATTEMPTS", "10");
    const backupEnabled = getEnvValue("BACKUP_BEFORE_FIX", "true");
    const fixTypes = getEnvValue("FIX_TYPES", "bug,security,performance");
    
    const AUTOFIX_OPTIONS = [
      { label: `🔧 Auto-Apply Fixes   ${autoApply === "true" ? chalk.green("ON") : chalk.red("OFF")}`, value: "autoapply" },
      { label: `📊 Min Confidence     ${chalk.gray(`Current: ${(parseFloat(minConfidence) * 100).toFixed(0)}%`)}`, value: "confidence" },
      { label: `🔄 Max Fix Attempts   ${chalk.gray(`Current: ${maxAttempts}`)}`, value: "attempts" },
      { label: `💾 Backup Before Fix  ${backupEnabled === "true" ? chalk.green("ON") : chalk.red("OFF")}`, value: "backup" },
      { label: `🎯 Fix Types          ${chalk.gray("Which issues to auto-fix")}`, value: "fixtypes" },
      { label: chalk.gray("────────────────────────────────────────────"), value: "separator" },
      { label: `ℹ️  What do these mean?`, value: "help" },
    ];
    
    showBanner("🔧 AUTO-FIX SETTINGS");
    const action = await arrowMenu("AUTO-FIX OPTIONS", AUTOFIX_OPTIONS, { showBack: true });
    
    if (action === "back") return;
    
    switch (action) {
      case "autoapply": {
        const newValue = autoApply === "true" ? "false" : "true";
        updateEnvFile({ AUTO_APPLY: newValue });
        console.log(chalk.green(`\n  ✓ Auto-apply ${newValue === "true" ? "enabled" : "disabled"}\n`));
        if (newValue === "true") {
          console.log(chalk.yellow("  ⚠ Auto-fix will automatically modify your files!"));
          console.log(chalk.gray("  Backups are created in .letta-backups/\n"));
        }
        await waitForKey();
        break;
      }
      
      case "confidence": {
        console.log(chalk.gray("\n  Minimum confidence required to apply a fix."));
        console.log(chalk.gray("  Higher = safer but fewer fixes, Lower = more fixes but riskier.\n"));
        
        const CONFIDENCE_OPTIONS = [
          { label: "50%  - Low (more fixes, higher risk)", value: "0.5" },
          { label: "60%  - Medium-low", value: "0.6" },
          { label: "70%  - Default (balanced)", value: "0.7" },
          { label: "80%  - Medium-high", value: "0.8" },
          { label: "90%  - High (safer, fewer fixes)", value: "0.9" },
          { label: "95%  - Very high (only very confident fixes)", value: "0.95" },
        ];
        
        const confidence = await arrowMenu("SELECT CONFIDENCE LEVEL", CONFIDENCE_OPTIONS, { showBack: true });
        if (confidence !== "back") {
          updateEnvFile({ MIN_CONFIDENCE: confidence });
          console.log(chalk.green(`\n  ✓ Confidence set to ${(parseFloat(confidence) * 100).toFixed(0)}%\n`));
          await waitForKey();
        }
        break;
      }
      
      case "attempts": {
        console.log(chalk.gray("\n  Maximum number of fix attempts per file."));
        console.log(chalk.gray("  Prevents infinite loops if a fix keeps failing.\n"));
        
        const ATTEMPTS_OPTIONS = [
          { label: "3 attempts", value: "3" },
          { label: "5 attempts", value: "5" },
          { label: "10 attempts (default)", value: "10" },
          { label: "20 attempts", value: "20" },
        ];
        
        const attempts = await arrowMenu("SELECT MAX ATTEMPTS", ATTEMPTS_OPTIONS, { showBack: true });
        if (attempts !== "back") {
          updateEnvFile({ MAX_FIX_ATTEMPTS: attempts });
          console.log(chalk.green(`\n  ✓ Max attempts set to ${attempts}\n`));
          await waitForKey();
        }
        break;
      }
      
      case "backup": {
        const newValue = backupEnabled === "true" ? "false" : "true";
        updateEnvFile({ BACKUP_BEFORE_FIX: newValue });
        console.log(chalk.green(`\n  ✓ Backup ${newValue === "true" ? "enabled" : "disabled"}\n`));
        if (newValue === "false") {
          console.log(chalk.yellow("  ⚠ Warning: Files will be modified without backup!\n"));
        }
        await waitForKey();
        break;
      }
      
      case "fixtypes": {
        console.log(chalk.gray("\n  Select which issue types to auto-fix:"));
        console.log(chalk.gray("  Current: " + fixTypes + "\n"));
        
        const FIX_TYPE_OPTIONS = [
          { label: "All types (bug, security, performance, style)", value: "bug,security,performance,style" },
          { label: "Critical only (bug, security)", value: "bug,security" },
          { label: "Bug and performance", value: "bug,performance" },
          { label: "Style only (safe)", value: "style" },
          { label: "Custom (enter manually)", value: "custom" },
        ];
        
        const types = await arrowMenu("SELECT FIX TYPES", FIX_TYPE_OPTIONS, { showBack: true });
        if (types === "custom") {
          const custom = await inputPrompt("Enter types (comma-separated):", { allowEmpty: false });
          if (custom) {
            updateEnvFile({ FIX_TYPES: custom });
            console.log(chalk.green(`\n  ✓ Fix types updated!\n`));
          }
        } else if (types !== "back") {
          updateEnvFile({ FIX_TYPES: types });
          console.log(chalk.green(`\n  ✓ Fix types set to: ${types}\n`));
        }
        await waitForKey();
        break;
      }
      
      case "help": {
        console.log(chalk.bold.white("\n  AUTO-FIX SETTINGS EXPLAINED\n"));
        console.log(chalk.cyan("  Auto-Apply Fixes"));
        console.log(chalk.gray("    When enabled, the AI will automatically apply fixes to your code."));
        console.log(chalk.gray("    When disabled, it only suggests fixes.\n"));
        console.log(chalk.cyan("  Min Confidence"));
        console.log(chalk.gray("    The AI rates its confidence in each fix (0-100%)."));
        console.log(chalk.gray("    Only fixes above this threshold will be applied.\n"));
        console.log(chalk.cyan("  Max Fix Attempts"));
        console.log(chalk.gray("    Limits how many times the AI will try to fix a single file."));
        console.log(chalk.gray("    Prevents infinite loops.\n"));
        console.log(chalk.cyan("  Backup Before Fix"));
        console.log(chalk.gray("    Creates a backup copy before modifying any file."));
        console.log(chalk.gray("    Backups are stored in .letta-backups/\n"));
        console.log(chalk.cyan("  Fix Types"));
        console.log(chalk.gray("    Choose which types of issues to auto-fix:"));
        console.log(chalk.gray("    • bug - Logic errors, null checks, etc."));
        console.log(chalk.gray("    • security - XSS, injection, exposed secrets"));
        console.log(chalk.gray("    • performance - Slow code, memory leaks"));
        console.log(chalk.gray("    • style - Formatting, naming conventions\n"));
        await waitForKey();
        break;
      }
    }
  }
}

async function runSecuritySettings() {
  while (true) {
    const autonomyLevel = getEnvValue("AUTONOMY_LEVEL", "1");
    const cloudConsent = getEnvValue("CLOUD_ANALYSIS_CONSENT", "false");
    const offlineMode = getEnvValue("OFFLINE_MODE", "false");
    const maxChangesPerHour = getEnvValue("MAX_CHANGES_PER_HOUR", "3");
    const enableSecurity = getEnvValue("ENABLE_SECURITY", "true");
    
    const autonomyNames = ["Observer", "Assistant", "Partner", "Autonomous"];
    const currentAutonomy = autonomyNames[parseInt(autonomyLevel)] || "Assistant";
    
    const SECURITY_OPTIONS = [
      { label: `🤖 Autonomy Level     ${chalk.cyan(currentAutonomy)}`, value: "autonomy" },
      { label: `☁️  Cloud Analysis     ${cloudConsent === "true" ? chalk.green("ENABLED") : chalk.red("DISABLED")}`, value: "cloud" },
      { label: `📡 Offline Mode       ${offlineMode === "true" ? chalk.green("ON") : chalk.red("OFF")}`, value: "offline" },
      { label: `⏱️  Rate Limiting      ${chalk.gray(`Max ${maxChangesPerHour}/hour`)}`, value: "ratelimit" },
      { label: `🛡️  Security Features  ${enableSecurity === "true" ? chalk.green("ON") : chalk.red("OFF")}`, value: "security" },
      { label: chalk.gray("────────────────────────────────────────────"), value: "separator" },
      { label: `🔑 Credential Manager ${chalk.gray("View stored keys")}`, value: "credentials" },
      { label: `📊 Security Status    ${chalk.gray("View safety stats")}`, value: "status" },
      { label: `ℹ️  Security Guide     ${chalk.gray("Learn about safety")}`, value: "help" },
    ];
    
    showBanner("🛡️ SECURITY SETTINGS");
    const action = await arrowMenu("SECURITY OPTIONS", SECURITY_OPTIONS, { showBack: true });
    
    if (action === "back") return;
    
    switch (action) {
      case "autonomy": {
        console.log(chalk.gray("\n  Choose how autonomous CodeMind should be:\n"));
        
        const AUTONOMY_OPTIONS = [
          { label: "🔍 Observer    - Only reports issues, never changes code", value: "0" },
          { label: "🤝 Assistant  - Suggests fixes, requires approval", value: "1" },
          { label: "⚡ Partner    - Auto-fixes trivial issues, asks for complex ones", value: "2" },
          { label: "🚀 Autonomous - Full auto-fix capability (use with caution)", value: "3" },
        ];
        
        const level = await arrowMenu("SELECT AUTONOMY LEVEL", AUTONOMY_OPTIONS, { showBack: true });
        if (level !== "back") {
          updateEnvFile({ AUTONOMY_LEVEL: level });
          const levelName = autonomyNames[parseInt(level)];
          console.log(chalk.green(`\n  ✓ Autonomy level set to: ${levelName}\n`));
          
          if (level === "3") {
            console.log(chalk.yellow("  ⚠ Warning: Autonomous mode will modify files without asking!"));
            console.log(chalk.gray("  Make sure you have backups and version control.\n"));
          }
          await waitForKey();
        }
        break;
      }
      
      case "cloud": {
        const newValue = cloudConsent === "true" ? "false" : "true";
        
        if (newValue === "true") {
          console.log(chalk.yellow("\n  ⚠ Cloud Analysis Consent\n"));
          console.log(chalk.gray("  Cloud analysis provides advanced insights but sends"));
          console.log(chalk.gray("  anonymized code snippets to CodeMind's servers.\n"));
          console.log(chalk.gray("  • Code is anonymized (secrets/paths removed)"));
          console.log(chalk.gray("  • Only complex patterns use cloud analysis"));
          console.log(chalk.gray("  • 80% of analysis runs locally"));
          console.log(chalk.gray("  • You can disable this anytime\n"));
          
          const confirm = await confirmPrompt("Enable cloud analysis?");
          if (confirm === true) {
            updateEnvFile({ CLOUD_ANALYSIS_CONSENT: "true" });
            console.log(chalk.green("\n  ✓ Cloud analysis enabled\n"));
          }
        } else {
          updateEnvFile({ CLOUD_ANALYSIS_CONSENT: "false" });
          console.log(chalk.green("\n  ✓ Cloud analysis disabled - using local-only mode\n"));
        }
        await waitForKey();
        break;
      }
      
      case "offline": {
        const newValue = offlineMode === "true" ? "false" : "true";
        updateEnvFile({ OFFLINE_MODE: newValue });
        console.log(chalk.green(`\n  ✓ Offline mode ${newValue === "true" ? "enabled" : "disabled"}\n`));
        
        if (newValue === "true") {
          console.log(chalk.gray("  All analysis will run locally. Some advanced features"));
          console.log(chalk.gray("  may be limited, but core functionality remains available.\n"));
        }
        await waitForKey();
        break;
      }
      
      case "ratelimit": {
        console.log(chalk.gray("\n  Rate limiting prevents too many automatic changes."));
        console.log(chalk.gray("  This protects against runaway automation.\n"));
        
        const RATE_OPTIONS = [
          { label: "1 change per hour (very conservative)", value: "1" },
          { label: "3 changes per hour (default)", value: "3" },
          { label: "5 changes per hour", value: "5" },
          { label: "10 changes per hour", value: "10" },
          { label: "No limit (not recommended)", value: "999" },
        ];
        
        const rate = await arrowMenu("SELECT RATE LIMIT", RATE_OPTIONS, { showBack: true });
        if (rate !== "back") {
          updateEnvFile({ MAX_CHANGES_PER_HOUR: rate });
          const rateText = rate === "999" ? "No limit" : `${rate} per hour`;
          console.log(chalk.green(`\n  ✓ Rate limit set to: ${rateText}\n`));
          await waitForKey();
        }
        break;
      }
      
      case "security": {
        const newValue = enableSecurity === "true" ? "false" : "true";
        updateEnvFile({ ENABLE_SECURITY: newValue });
        console.log(chalk.green(`\n  ✓ Security features ${newValue === "true" ? "enabled" : "disabled"}\n`));
        
        if (newValue === "false") {
          console.log(chalk.yellow("  ⚠ Warning: Disabling security features removes safety checks!"));
          console.log(chalk.gray("  This is not recommended for production use.\n"));
        }
        await waitForKey();
        break;
      }
      
      case "credentials": {
        showBanner("🔑 CREDENTIAL MANAGER");
        
        try {
          // Import and use credential manager
          const { SecureCredentialManager } = await import("../src/security/credentialManager.js");
          const credManager = new SecureCredentialManager();
          await credManager.initialize();
          
          const credentials = await credManager.listCredentials();
          
          if (credentials.length === 0) {
            console.log(chalk.gray("  No stored credentials found.\n"));
          } else {
            console.log(chalk.bold.white("  Stored Credentials:\n"));
            for (const cred of credentials) {
              const status = cred.hasKey ? chalk.green("✓") : chalk.red("✗");
              const nextRotation = new Date(cred.nextRotation).toLocaleDateString();
              console.log(`  ${status} ${cred.service}/${cred.account}`);
              console.log(chalk.gray(`      Next rotation: ${nextRotation}`));
            }
            console.log("");
          }
          
          const securityStatus = await credManager.getSecurityStatus();
          console.log(chalk.bold.white("  Security Status:\n"));
          console.log(`  Platform: ${securityStatus.platform}`);
          console.log(`  Keychain: ${securityStatus.keychainImplementation}`);
          console.log(`  Device ID: ${securityStatus.deviceFingerprint}`);
          console.log(`  Active sessions: ${securityStatus.activeSessions}`);
          console.log("");
          
        } catch (error) {
          console.log(chalk.red(`  Error accessing credential manager: ${error.message}\n`));
        }
        
        await waitForKey();
        break;
      }
      
      case "status": {
        showBanner("📊 SECURITY STATUS");
        
        try {
          // Show current security configuration
          console.log(chalk.bold.white("  Current Security Configuration:\n"));
          console.log(`  Autonomy Level: ${chalk.cyan(currentAutonomy)}`);
          console.log(`  Cloud Analysis: ${cloudConsent === "true" ? chalk.green("Enabled") : chalk.red("Disabled")}`);
          console.log(`  Offline Mode: ${offlineMode === "true" ? chalk.green("On") : chalk.red("Off")}`);
          console.log(`  Rate Limit: ${maxChangesPerHour} changes/hour`);
          console.log(`  Security Features: ${enableSecurity === "true" ? chalk.green("Enabled") : chalk.red("Disabled")}`);
          console.log("");
          
          // If we have a cognitive engine instance, show its security status
          if (typeof cognitiveEngine !== 'undefined' && cognitiveEngine) {
            const securityStatus = await cognitiveEngine.getSecurityStatus();
            if (securityStatus && !securityStatus.error) {
              console.log(chalk.bold.white("  Runtime Security Status:\n"));
              console.log(`  Credential Store: ${securityStatus.credentials.credentialCount} keys`);
              console.log(`  Safety Protocol: ${securityStatus.safety.total} evaluations`);
              console.log(`  Success Rate: ${securityStatus.safety.successRate.toFixed(1)}%`);
              console.log("");
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`  Error getting security status: ${error.message}\n`));
        }
        
        await waitForKey();
        break;
      }
      
      case "help": {
        console.log(chalk.bold.white("\n  SECURITY FEATURES EXPLAINED\n"));
        console.log(chalk.cyan("  Autonomy Levels"));
        console.log(chalk.gray("    Observer: Only reports issues, never modifies code"));
        console.log(chalk.gray("    Assistant: Suggests fixes, requires your approval"));
        console.log(chalk.gray("    Partner: Auto-fixes simple issues, asks for complex ones"));
        console.log(chalk.gray("    Autonomous: Full automation (use with caution)\n"));
        
        console.log(chalk.cyan("  Cloud Analysis"));
        console.log(chalk.gray("    Sends anonymized code for advanced pattern detection"));
        console.log(chalk.gray("    • Secrets and paths are removed"));
        console.log(chalk.gray("    • Only complex patterns use cloud"));
        console.log(chalk.gray("    • 80% of analysis runs locally\n"));
        
        console.log(chalk.cyan("  Safety Features"));
        console.log(chalk.gray("    • Change safety scoring (complexity, test coverage)"));
        console.log(chalk.gray("    • Automatic backups before modifications"));
        console.log(chalk.gray("    • Rate limiting to prevent runaway automation"));
        console.log(chalk.gray("    • Hardware-bound credential encryption\n"));
        
        console.log(chalk.cyan("  Best Practices"));
        console.log(chalk.gray("    • Start with Assistant level, increase gradually"));
        console.log(chalk.gray("    • Keep backups enabled"));
        console.log(chalk.gray("    • Use version control"));
        console.log(chalk.gray("    • Review changes in Partner/Autonomous modes\n"));
        
        await waitForKey();
        break;
      }
    }
  }
}

async function runResetSettings() {
  showBanner("🔄 RESET SETTINGS");
  
  console.log(chalk.yellow("  This will reset all settings to their defaults.\n"));
  console.log(chalk.gray("  The following will be reset:"));
  console.log(chalk.gray("  • Theme → ocean"));
  console.log(chalk.gray("  • Watcher debounce → 2000ms"));
  console.log(chalk.gray("  • Auto-apply → false"));
  console.log(chalk.gray("  • Min confidence → 70%"));
  console.log(chalk.gray("  • And other settings...\n"));
  console.log(chalk.gray("  Your API key and agent will NOT be affected.\n"));
  
  const confirm = await confirmPrompt("Reset all settings to defaults?");
  if (confirm === "back" || confirm === false) return;
  
  // Preserve API key
  const apiKey = process.env.LETTA_API_KEY;
  const projectId = process.env.LETTA_PROJECT_ID;
  
  const defaults = {
    LETTA_API_KEY: apiKey || "sk-let-your-api-key-here",
    LETTA_PROJECT_ID: projectId || "",
    AUTO_APPLY: "false",
    MIN_CONFIDENCE: "0.7",
    MAX_FIX_ATTEMPTS: "10",
    WATCHER_DEBOUNCE: "2000",
    WATCH_ALL: "false",
    LETTA_THEME: "ocean",
    AUTO_REMEMBER: "false",
    VERBOSE_OUTPUT: "false",
    SHOW_TIMESTAMPS: "true",
    WATCHER_DEPTH: "20",
    WATCH_EXTENSIONS: ".js,.jsx,.ts,.tsx,.json,.css,.scss,.md",
    BACKUP_BEFORE_FIX: "true",
    FIX_TYPES: "bug,security,performance",
  };
  
  const envPath = path.join(ROOT, ".env");
  let content = "";
  for (const [key, value] of Object.entries(defaults)) {
    content += `${key}=${value}\n`;
  }
  
  fs.writeFileSync(envPath, content, "utf8");
  dotenv.config({ override: true });
  
  console.log(chalk.green("\n  ✓ All settings reset to defaults!\n"));
  await waitForKey();
}

async function runViewConfig() {
  showBanner("📋 CURRENT CONFIGURATION");
  
  // Theme & Display
  console.log(chalk.bold.cyan("  🎨 Theme & Display"));
  console.log(chalk.gray("  ─".repeat(30)));
  console.log(`  Theme:            ${chalk.cyan(getEnvValue("LETTA_THEME", "ocean"))}`);
  console.log(`  Show Timestamps:  ${getEnvValue("SHOW_TIMESTAMPS", "true") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log(`  Verbose Output:   ${getEnvValue("VERBOSE_OUTPUT", "false") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log("");
  
  // Watcher Settings
  console.log(chalk.bold.blue("  ⚙️ Watcher Settings"));
  console.log(chalk.gray("  ─".repeat(30)));
  console.log(`  Debounce:         ${getEnvValue("WATCHER_DEBOUNCE", "2000")}ms`);
  console.log(`  Watch Depth:      ${getEnvValue("WATCHER_DEPTH", "20")} levels`);
  console.log(`  Watch All:        ${getEnvValue("WATCH_ALL", "false") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log(`  Extensions:       ${getEnvValue("WATCH_EXTENSIONS", ".js,.jsx,.ts,.tsx")}`);
  console.log("");
  
  // Auto-Fix Settings
  console.log(chalk.bold.yellow("  🔧 Auto-Fix Settings"));
  console.log(chalk.gray("  ─".repeat(30)));
  console.log(`  Auto-Apply:       ${getEnvValue("AUTO_APPLY", "false") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log(`  Min Confidence:   ${(parseFloat(getEnvValue("MIN_CONFIDENCE", "0.7")) * 100).toFixed(0)}%`);
  console.log(`  Max Attempts:     ${getEnvValue("MAX_FIX_ATTEMPTS", "10")}`);
  console.log(`  Backup Enabled:   ${getEnvValue("BACKUP_BEFORE_FIX", "true") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log(`  Fix Types:        ${getEnvValue("FIX_TYPES", "bug,security,performance")}`);
  console.log("");
  
  // API & Agent
  console.log(chalk.bold.green("  🔑 API & Agent"));
  console.log(chalk.gray("  ─".repeat(30)));
  console.log(`  API Key:          ${hasApiKey() ? chalk.green("✓ Configured") : chalk.red("✗ Not set")}`);
  console.log(`  Project ID:       ${process.env.LETTA_PROJECT_ID || chalk.gray("Not set")}`);
  
  if (hasAgent()) {
    const config = getAgentConfig();
    console.log(`  Agent:            ${chalk.green("✓ " + (config?.name || "CodeMind"))}`);
    console.log(`  Agent Version:    ${config?.template_version || "Unknown"}`);
  } else {
    console.log(`  Agent:            ${chalk.red("✗ Not configured")}`);
  }
  console.log("");
  
  // Debug
  console.log(chalk.bold.magenta("  🐛 Debug"));
  console.log(chalk.gray("  ─".repeat(30)));
  console.log(`  Debug Mode:       ${getEnvValue("DEBUG", "false") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log(`  Auto Remember:    ${getEnvValue("AUTO_REMEMBER", "false") === "true" ? chalk.green("ON") : chalk.red("OFF")}`);
  console.log("");
  
  await waitForKey();
}

async function showHelp() {
  showBanner("❓ HELP");
  
  console.log(chalk.bold.white("  GETTING STARTED\n"));
  console.log(chalk.gray("  1. Run 'Quick Setup' to configure API key and create agent"));
  console.log(chalk.gray("  2. Select a project to analyze or watch"));
  console.log(chalk.gray("  3. Use Chat to ask questions about your code\n"));
  
  console.log(chalk.bold.white("  MAIN FEATURES\n"));
  console.log(chalk.cyan("  🚀 Quick Setup") + chalk.gray(" - One-click setup for new users"));
  console.log(chalk.cyan("  👁️  Watch & Analyze") + chalk.gray(" - Real-time code monitoring"));
  console.log(chalk.cyan("  🔧 Auto Test-Fix") + chalk.gray(" - Automatically fix failing tests"));
  console.log(chalk.cyan("  🔍 Analyze Project") + chalk.gray(" - Deep project structure analysis"));
  console.log(chalk.cyan("  💬 Chat") + chalk.gray(" - Ask questions about code\n"));
  
  console.log(chalk.bold.white("  CODE TOOLS\n"));
  console.log(chalk.cyan("  📖 Review Code") + chalk.gray(" - Get AI code review"));
  console.log(chalk.cyan("  💡 Explain Code") + chalk.gray(" - Understand what code does"));
  console.log(chalk.cyan("  ♻️  Refactor") + chalk.gray(" - Improve code structure"));
  console.log(chalk.cyan("  📚 Add Documentation") + chalk.gray(" - Generate comments/docs"));
  console.log(chalk.cyan("  🔒 Security Check") + chalk.gray(" - Find security issues\n"));
  
  console.log(chalk.bold.white("  MORE TOOLS\n"));
  console.log(chalk.cyan("  🧪 Generate Tests") + chalk.gray(" - Create tests for code"));
  console.log(chalk.cyan("  🐛 Find Bugs") + chalk.gray(" - Scan for potential issues"));
  console.log(chalk.cyan("  📝 Git Tools") + chalk.gray(" - Commit, diff, status, log\n"));
  
  console.log(chalk.bold.white("  NAVIGATION\n"));
  console.log(chalk.gray("  ↑ ↓       Navigate menu"));
  console.log(chalk.gray("  Enter     Select option"));
  console.log(chalk.gray("  Esc       Go back"));
  console.log(chalk.gray("  Ctrl+C    Exit\n"));
  
  await waitForKey("Press Enter to go back...");
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  // CLI help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
${chalk.cyan("CodeMind Coding Assistant")}

Usage:
  npm start                    Interactive menu
  npm run watch <path>         Watch & analyze project
  npm run fix <path>           Auto test-fix
  npm run chat                 Chat with agent

Options:
  --auto-fix    Auto-apply fixes in watch mode
  --help        Show this help

Navigation:
  ↑ ↓           Navigate menus
  Enter         Select
  Esc / b       Go back
  Ctrl+C        Exit
`);
    process.exit(0);
  }
  
  // Direct path mode
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(path.resolve(argPath))) {
    const options = process.argv.includes("--auto-fix") ? ["autoFix"] : [];
    saveToHistory(path.resolve(argPath));
    
    const { spawn } = await import("child_process");
    const args = [path.resolve(argPath)];
    if (options.includes("autoFix")) args.push("--auto-fix");
    
    const child = spawn("node", [path.join(ROOT, "scripts/assistant.js"), ...args], {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env },
    });
    
    await new Promise((resolve) => child.on("close", resolve));
    return;
  }
  
  // First-time user check
  if (!hasApiKey() && !hasAgent()) {
    showBanner();
    console.log(chalk.yellow("  👋 Welcome! Looks like this is your first time.\n"));
    console.log(chalk.gray("  Select 'Quick Setup' to get started in seconds.\n"));
    await waitForKey();
  }
  
  // Interactive menu loop
  while (true) {
    const action = await arrowMenu("MAIN MENU", MAIN_MENU);
    
    switch (action) {
      case "quicksetup":
        await runQuickSetup();
        break;
      case "watch":
        await runWatch();
        break;
      case "fix":
        await runTestFix();
        break;
      case "analyze":
        await runAnalyze();
        break;
      case "chat":
        await runChat();
        break;
      case "insights":
        await runInsights();
        break;
      case "codetools":
        await runCodeTools();
        break;
      case "gentests":
        await runGenerateTests();
        break;
      case "findbugs":
        await runFindBugs();
        break;
      case "gittools":
        await runGitTools();
        break;
      case "status":
        await runStatus();
        break;
      case "settings":
        await runSettings();
        break;
      case "help":
        await showHelp();
        break;
      case "exit":
        console.log(chalk.cyan("\n  👋 Goodbye!\n"));
        process.exit(0);
      case "back":
        break;
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("\n  Error:"), err.message);
  process.exit(1);
});
