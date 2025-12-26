#!/usr/bin/env node
// Letta CLI - Production-quality coding assistant with seamless navigation
import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function hasAgent() {
  return fs.existsSync(path.join(ROOT, ".letta_agent_id"));
}

function hasApiKey() {
  return process.env.LETTA_API_KEY && process.env.LETTA_API_KEY !== "sk-let-your-api-key-here";
}

function getAgentId() {
  return fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
}

function getRecentProjects() {
  const historyFile = path.join(ROOT, ".letta_history.json");
  if (fs.existsSync(historyFile)) {
    try {
      return JSON.parse(fs.readFileSync(historyFile, "utf8")).recentProjects || [];
    } catch (e) {}
  }
  return [];
}

function saveToHistory(projectPath) {
  const historyFile = path.join(ROOT, ".letta_history.json");
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
  console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     ${chalk.bold.white("🤖 LETTA CODING ASSISTANT")}                                  ║
║     ${chalk.gray("AI-powered code analysis, fixes & commit generation")}       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`));
  
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API Key configured"));
  } else {
    console.log(chalk.red("  ✗ API Key missing") + chalk.gray(" - edit .env file"));
  }
  
  if (hasAgent()) {
    console.log(chalk.green(`  ✓ Agent ready`) + chalk.gray(` (${getAgentId().slice(0, 20)}...)`));
  } else {
    console.log(chalk.yellow("  ○ No agent") + chalk.gray(" - select 'Setup' to create one"));
  }
  
  if (subtitle) {
    console.log("");
    console.log(chalk.bold.cyan(`  ${subtitle}`));
  }
  
  console.log("");
}

// Arrow key menu with full back/escape support
async function arrowMenu(title, options, { showBack = false, showExit = false } = {}) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const items = [...options];
    
    // Add back option if requested
    if (showBack) {
      items.push({ label: chalk.yellow("← Back to Main Menu"), value: "back" });
    }
    
    // Find first non-separator
    while (items[selectedIndex]?.value?.startsWith?.("separator")) {
      selectedIndex++;
    }
    
    const draw = () => {
      showBanner();
      console.log(chalk.gray("  ↑↓ Navigate  •  Enter Select  •  Esc Back  •  Ctrl+C Exit"));
      console.log(chalk.gray("─".repeat(66)));
      console.log("");
      console.log(chalk.bold.white(`  ${title}`));
      console.log("");
      
      items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const isSeparator = item.value?.startsWith?.("separator");
        
        if (isSeparator) {
          console.log(chalk.gray(`    ${item.label}`));
        } else if (isSelected) {
          console.log(chalk.cyan.bold(`  ❯ ${item.label}`));
        } else {
          console.log(chalk.white(`    ${item.label}`));
        }
      });
      
      console.log("");
    };
    
    draw();
    
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    
    const cleanup = () => {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    };
    
    const onKeypress = (_, key) => {
      if (!key) return;
      
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
    
    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}

// Input prompt with escape/back support
async function inputPrompt(message, { allowEmpty = false, isPath = false } = {}) {
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
        resolve(null); // Cancelled
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

// Confirm prompt with back support (y/n/b)
async function confirmPrompt(message, { defaultYes = false } = {}) {
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

// Wait for any key
async function waitForKey(message = "Press Enter to continue...") {
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

// ═══════════════════════════════════════════════════════════════════════════
// MENUS
// ═══════════════════════════════════════════════════════════════════════════

const MAIN_MENU = [
  { label: `👁️  Watch & Analyze     ${chalk.gray("Monitor code changes")}`, value: "watch" },
  { label: `🔧 Auto Test-Fix       ${chalk.gray("Fix failing tests")}`, value: "fix" },
  { label: `💬 Chat with Agent     ${chalk.gray("Ask questions")}`, value: "chat" },
  { label: `📝 Generate Commit     ${chalk.gray("Create commit message")}`, value: "commit" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator1" },
  { label: `⚙️  Setup Agent         ${chalk.gray("Create agent")}`, value: "setup" },
  { label: `🧹 Cleanup Agents       ${chalk.gray("Remove old agents")}`, value: "cleanup" },
  { label: `❓ Help                 ${chalk.gray("Documentation")}`, value: "help" },
  { label: chalk.gray("────────────────────────────────────────────"), value: "separator2" },
  { label: chalk.red("✖  Exit"), value: "exit" },
];

async function selectProject() {
  const recentProjects = getRecentProjects();
  const options = [];
  
  // Recent projects
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

// ═══════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

async function runWatch() {
  const project = await selectProject();
  if (!project) return; // User went back
  
  // Ask for auto-fix
  const autoFix = await confirmPrompt("Enable auto-fix?");
  if (autoFix === "back") return; // User went back
  
  saveToHistory(project);
  
  console.log(chalk.cyan("\n  🚀 Starting Watch & Analyze..."));
  console.log(chalk.gray("  Press Ctrl+C to stop watching\n"));
  
  const args = [project];
  if (autoFix) args.push("--auto-fix");
  
  const { spawn } = await import("child_process");
  const child = spawn("node", [path.join(ROOT, "scripts/assistant.js"), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  await new Promise((resolve) => child.on("close", resolve));
}

async function runTestFix() {
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

async function runChat() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Setup first.\n"));
    await waitForKey();
    return;
  }
  
  showBanner("💬 CHAT WITH AGENT");
  console.log(chalk.gray("  Type your message and press Enter"));
  console.log(chalk.gray("  Type 'exit' or press Enter on empty line to go back\n"));
  
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
    
    // Exit conditions
    if (!message || message.toLowerCase() === "exit" || message.toLowerCase() === "back") {
      console.log(chalk.gray("\n  Returning to main menu...\n"));
      break;
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

async function runCommit() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent configured. Run Setup first.\n"));
    await waitForKey();
    return;
  }
  
  const project = await selectProject();
  if (!project) return;
  
  saveToHistory(project);
  
  const { execSync } = await import("child_process");
  
  // Get diff
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
  
  const spinner = ora("  Generating commit message...").start();
  
  try {
    const { Letta } = await import("@letta-ai/letta-client");
    const dayjs = (await import("dayjs")).default;
    
    const client = new Letta({
      apiKey: process.env.LETTA_API_KEY,
      projectID: process.env.LETTA_PROJECT_ID,
    });
    
    const today = dayjs().format("DDMMYY");
    const prompt = `Generate a git commit message. Format: ${today} - <description>. Keep under 50 chars total. Capitalize first letter after dash.\n\nChanges:\n\`\`\`diff\n${diff.slice(0, 2000)}\n\`\`\`\n\nRespond with ONLY the commit message, nothing else.`;
    
    const response = await client.agents.messages.create(getAgentId(), { input: prompt });
    let message = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    
    // Ensure format
    if (!message.startsWith(today)) message = `${today} - ${message}`;
    
    spinner.succeed("  Generated!");
    
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

async function runSetup() {
  showBanner("⚙️ AGENT SETUP");
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not set in .env file"));
    console.log(chalk.gray("     Get your API key from https://app.letta.ai\n"));
    await waitForKey();
    return;
  }
  
  if (hasAgent()) {
    const confirm = await confirmPrompt("Agent already exists. Create a new one?");
    if (confirm === "back" || confirm === false) return;
  }
  
  const spinner = ora("  Creating agent...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/createAgent.js")], {
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
      console.log(chalk.gray(`  ID: ${getAgentId()}\n`));
    } else {
      spinner.fail("  Failed to create agent");
      if (output) console.log(chalk.gray(output));
    }
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

async function showHelp() {
  showBanner("❓ HELP");
  
  console.log(chalk.bold.white("  COMMANDS\n"));
  console.log(chalk.cyan("  👁️  Watch & Analyze"));
  console.log(chalk.gray("      Monitor code changes in real-time, get AI analysis and suggestions\n"));
  console.log(chalk.green("  🔧 Auto Test-Fix"));
  console.log(chalk.gray("      Run tests, detect failures, and automatically generate fixes\n"));
  console.log(chalk.blue("  💬 Chat"));
  console.log(chalk.gray("      Have a conversation with your AI agent about code\n"));
  console.log(chalk.magenta("  📝 Generate Commit"));
  console.log(chalk.gray("      AI-generated commit messages in DDMMYY format\n"));
  
  console.log(chalk.bold.white("  NAVIGATION\n"));
  console.log(chalk.gray("  ↑ ↓       Navigate menu options"));
  console.log(chalk.gray("  Enter     Select option"));
  console.log(chalk.gray("  Esc       Go back / Cancel"));
  console.log(chalk.gray("  b         Go back (in prompts)"));
  console.log(chalk.gray("  Ctrl+C    Exit application"));
  console.log("");
  
  await waitForKey("Press Enter to go back...");
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  // CLI help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
${chalk.cyan("Letta Coding Assistant")}

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
  
  // Direct path mode (skip menu)
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
  
  // Interactive menu loop
  while (true) {
    const action = await arrowMenu("MAIN MENU", MAIN_MENU);
    
    switch (action) {
      case "watch":
        await runWatch();
        break;
      case "fix":
        await runTestFix();
        break;
      case "chat":
        await runChat();
        break;
      case "commit":
        await runCommit();
        break;
      case "setup":
        await runSetup();
        break;
      case "cleanup":
        await runCleanup();
        break;
      case "help":
        await showHelp();
        break;
      case "exit":
        console.log(chalk.cyan("\n  👋 Goodbye!\n"));
        process.exit(0);
      case "back":
        // Already at main menu, do nothing
        break;
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("\n  Error:"), err.message);
  process.exit(1);
});
