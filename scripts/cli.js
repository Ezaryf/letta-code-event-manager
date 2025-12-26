#!/usr/bin/env node
// Letta CLI - Production-quality coding assistant with arrow-key navigation
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

// ASCII Art Banner
const BANNER = `
${chalk.cyan("╔════════════════════════════════════════════════════════════════╗")}
${chalk.cyan("║")}                                                                ${chalk.cyan("║")}
${chalk.cyan("║")}     ${chalk.bold.white("🤖 LETTA CODING ASSISTANT")}                                  ${chalk.cyan("║")}
${chalk.cyan("║")}     ${chalk.gray("AI-powered code analysis, fixes & commit generation")}       ${chalk.cyan("║")}
${chalk.cyan("║")}                                                                ${chalk.cyan("║")}
${chalk.cyan("╚════════════════════════════════════════════════════════════════╝")}
`;

// Check if agent exists
function hasAgent() {
  return fs.existsSync(path.join(ROOT, ".letta_agent_id"));
}

// Check if API key is configured
function hasApiKey() {
  return process.env.LETTA_API_KEY && process.env.LETTA_API_KEY !== "sk-let-your-api-key-here";
}

// Get recent projects from history
function getRecentProjects() {
  const historyFile = path.join(ROOT, ".letta_history.json");
  if (fs.existsSync(historyFile)) {
    try {
      const history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
      return history.recentProjects || [];
    } catch (e) {}
  }
  return [];
}

// Save project to history
function saveToHistory(projectPath) {
  const historyFile = path.join(ROOT, ".letta_history.json");
  let history = { recentProjects: [] };
  
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
    } catch (e) {}
  }
  
  history.recentProjects = [projectPath, ...history.recentProjects.filter(p => p !== projectPath)].slice(0, 5);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf8");
}

// Arrow key menu selector
async function arrowMenu(title, options, showBack = false) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const items = [...options];
    if (showBack) {
      items.push({ label: chalk.gray("← Back"), value: null });
    }
    
    const renderMenu = () => {
      // Move cursor up to redraw menu
      if (selectedIndex >= 0) {
        process.stdout.write(`\x1B[${items.length + 2}A`);
      }
      
      console.log("");
      console.log(chalk.bold.white(`  ${title}`));
      console.log("");
      
      items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? chalk.cyan("❯ ") : "  ";
        const text = isSelected ? chalk.cyan.bold(item.label) : item.label;
        console.log(`  ${prefix}${text}`);
      });
    };
    
    // Initial render
    console.log("");
    console.log(chalk.bold.white(`  ${title}`));
    console.log("");
    items.forEach((item, index) => {
      const isSelected = index === selectedIndex;
      const prefix = isSelected ? chalk.cyan("❯ ") : "  ";
      const text = isSelected ? chalk.cyan.bold(item.label) : item.label;
      console.log(`  ${prefix}${text}`);
    });
    
    // Setup raw mode for arrow keys
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    const onKeypress = (str, key) => {
      if (key.name === "up") {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
        renderMenu();
      } else if (key.name === "down") {
        selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
        renderMenu();
      } else if (key.name === "return") {
        cleanup();
        resolve(items[selectedIndex].value);
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        cleanup();
        if (key.ctrl && key.name === "c") {
          console.log(chalk.cyan("\n\n👋 Goodbye!\n"));
          process.exit(0);
        }
        resolve(null);
      }
    };
    
    const cleanup = () => {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    };
    
    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}

// Simple input prompt
async function inputPrompt(message, validate = null) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const ask = () => {
      rl.question(chalk.white(`  ${message} `), (answer) => {
        if (validate) {
          const result = validate(answer);
          if (result !== true) {
            console.log(`  ${chalk.red(result)}`);
            ask();
            return;
          }
        }
        rl.close();
        resolve(answer);
      });
    };
    
    ask();
  });
}

// Confirm prompt
async function confirmPrompt(message) {
  const answer = await inputPrompt(`${message} (y/n):`, (input) => {
    if (/^[yn]$/i.test(input)) return true;
    return "Please enter y or n";
  });
  return answer.toLowerCase() === "y";
}


// Status display
function showStatus() {
  console.log("");
  
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API Key configured"));
  } else {
    console.log(chalk.red("  ✗ API Key missing") + chalk.gray(" - edit .env file"));
  }
  
  if (hasAgent()) {
    const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
    console.log(chalk.green(`  ✓ Agent ready`) + chalk.gray(` (${agentId.slice(0, 20)}...)`));
  } else {
    console.log(chalk.yellow("  ○ No agent") + chalk.gray(" - select 'Setup' to create one"));
  }
  
  console.log("");
  console.log(chalk.gray("  ↑↓ Navigate  •  Enter Select  •  Ctrl+C Exit"));
  console.log("");
  console.log(chalk.gray("─".repeat(66)));
}

// Main menu options
const MAIN_MENU_OPTIONS = [
  { label: `👁️  Watch & Analyze     ${chalk.gray("Monitor code changes in real-time")}`, value: "watch" },
  { label: `🔧 Auto Test-Fix       ${chalk.gray("Run tests and auto-fix failures")}`, value: "fix" },
  { label: `💬 Chat with Agent     ${chalk.gray("Ask questions or get help")}`, value: "chat" },
  { label: `📝 Generate Commit     ${chalk.gray("Create commit message for changes")}`, value: "commit" },
  { label: chalk.gray("─".repeat(50)), value: "separator1" },
  { label: `⚙️  Setup Agent         ${chalk.gray("Create or reconfigure agent")}`, value: "setup" },
  { label: `🧹 Cleanup Agents       ${chalk.gray("Remove unused agents")}`, value: "cleanup" },
  { label: `❓ Help                 ${chalk.gray("Show documentation")}`, value: "help" },
  { label: chalk.gray("─".repeat(50)), value: "separator2" },
  { label: chalk.red("✖  Exit"), value: "exit" },
];

// Main menu
async function mainMenu() {
  console.clear();
  console.log(BANNER);
  showStatus();
  
  const action = await arrowMenu("MAIN MENU", MAIN_MENU_OPTIONS);
  
  // Skip separators
  if (action === "separator1" || action === "separator2") {
    return mainMenu();
  }
  
  return action;
}

// Project selector
async function selectProject() {
  const recentProjects = getRecentProjects();
  const options = [];
  
  if (recentProjects.length > 0) {
    for (const proj of recentProjects) {
      if (fs.existsSync(proj)) {
        const shortPath = proj.length > 45 ? "..." + proj.slice(-42) : proj;
        options.push({ label: `📁 ${shortPath}`, value: proj });
      }
    }
    if (options.length > 0) {
      options.push({ label: chalk.gray("─".repeat(50)), value: "separator" });
    }
  }
  
  options.push({ label: "📝 Enter path manually", value: "manual" });
  
  const cwdShort = process.cwd().length > 35 ? "..." + process.cwd().slice(-32) : process.cwd();
  options.push({ label: `📂 Current directory ${chalk.gray(`(${cwdShort})`)}`, value: process.cwd() });
  
  console.log("");
  const project = await arrowMenu("SELECT PROJECT", options, true);
  
  if (project === "separator") {
    return selectProject();
  }
  
  if (project === null) return null;
  
  if (project === "manual") {
    console.log("");
    const manualPath = await inputPrompt("Enter project path:", (input) => {
      if (!input) return "Path is required";
      const resolved = path.resolve(input);
      if (!fs.existsSync(resolved)) return `Path not found: ${resolved}`;
      return true;
    });
    return path.resolve(manualPath);
  }
  
  return project;
}

// Watch options
async function watchOptions() {
  const options = [
    { label: `🔧 Auto-fix issues        ${chalk.gray("Automatically apply fixes")}`, value: "autoFix", selected: false },
    { label: `📝 Auto-commit            ${chalk.gray("Generate commits after fixes")}`, value: "autoCommit", selected: false },
    { label: `📂 Watch all files        ${chalk.gray("Not just standard folders")}`, value: "watchAll", selected: false },
    { label: `🐛 Debug mode             ${chalk.gray("Verbose logging")}`, value: "debug", selected: false },
  ];
  
  console.log("");
  console.log(chalk.bold.white("  WATCH OPTIONS"));
  console.log(chalk.gray("  Press Enter to start with defaults, or select options:"));
  console.log("");
  
  // For simplicity, ask yes/no for auto-fix
  const autoFix = await confirmPrompt("Enable auto-fix?");
  
  const result = [];
  if (autoFix) result.push("autoFix");
  
  return result;
}


// Run watch command
async function runWatch(projectPath, options) {
  saveToHistory(projectPath);
  
  console.log(chalk.cyan("\n  🚀 Starting Watch & Analyze...\n"));
  
  const args = [projectPath];
  if (options.includes("autoFix")) args.push("--auto-fix");
  if (options.includes("autoCommit")) args.push("--auto-commit");
  if (options.includes("watchAll")) args.push("--all");
  if (options.includes("debug")) process.env.DEBUG = "true";
  
  const { spawn } = await import("child_process");
  const child = spawn("node", [path.join(ROOT, "scripts/assistant.js"), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  return new Promise((resolve) => {
    child.on("close", resolve);
  });
}

// Run test-fix command
async function runTestFix(projectPath) {
  saveToHistory(projectPath);
  
  const autoApply = await confirmPrompt("Auto-apply fixes?");
  
  console.log(chalk.green("\n  🔧 Starting Auto Test-Fix...\n"));
  
  const args = [projectPath];
  if (autoApply) args.push("--auto");
  
  const { spawn } = await import("child_process");
  const child = spawn("node", [path.join(ROOT, "scripts/autoTestFix.js"), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  return new Promise((resolve) => {
    child.on("close", resolve);
  });
}

// Chat with agent
async function runChat() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent found. Please run Setup first.\n"));
    await inputPrompt("Press Enter to continue...");
    return;
  }
  
  console.log(chalk.blue("\n  💬 Chat with Letta Agent"));
  console.log(chalk.gray("  Type 'exit' to return to menu\n"));
  
  const { Letta } = await import("@letta-ai/letta-client");
  const client = new Letta({
    apiKey: process.env.LETTA_API_KEY,
    projectID: process.env.LETTA_PROJECT_ID,
  });
  const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
  
  while (true) {
    const message = await inputPrompt(chalk.cyan("You:"));
    
    if (message.toLowerCase() === "exit") break;
    if (!message.trim()) continue;
    
    const spinner = ora("  Thinking...").start();
    
    try {
      const response = await client.agents.messages.create(agentId, { input: message });
      spinner.stop();
      
      const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "No response";
      console.log(chalk.green("\n  Agent:"), text, "\n");
    } catch (err) {
      spinner.fail("  Error: " + err.message);
    }
  }
}

// Generate commit message
async function runCommit(projectPath) {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent found. Please run Setup first.\n"));
    await inputPrompt("Press Enter to continue...");
    return;
  }
  
  saveToHistory(projectPath);
  
  const { execSync } = await import("child_process");
  
  let diff;
  try {
    diff = execSync("git diff --staged", { cwd: projectPath, encoding: "utf8" });
    if (!diff) {
      diff = execSync("git diff", { cwd: projectPath, encoding: "utf8" });
    }
  } catch (e) {
    console.log(chalk.red("\n  ❌ Not a git repository or no changes found.\n"));
    await inputPrompt("Press Enter to continue...");
    return;
  }
  
  if (!diff.trim()) {
    console.log(chalk.yellow("\n  ⚠️ No changes detected in git.\n"));
    await inputPrompt("Press Enter to continue...");
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
    const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
    
    const today = dayjs().format("DDMMYY");
    const prompt = `Generate a git commit message for these changes. Format: ${today} - <description>
Keep it under 50 chars. Be specific. Capitalize first letter after the dash.

\`\`\`diff
${diff.slice(0, 3000)}
\`\`\`

Respond with ONLY the commit message, nothing else.`;
    
    const response = await client.agents.messages.create(agentId, { input: prompt });
    const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
    
    let message = text.trim().split("\n")[0];
    if (!message.startsWith(today)) {
      message = `${today} - ${message}`;
    }
    
    spinner.succeed("  Commit message generated!");
    
    console.log(chalk.green("\n  📝 Suggested commit message:"));
    console.log(chalk.white.bold(`     ${message}\n`));
    
    const commitNow = await confirmPrompt("Commit now?");
    
    if (commitNow) {
      execSync(`git add -A`, { cwd: projectPath });
      execSync(`git commit -m "${message}"`, { cwd: projectPath });
      console.log(chalk.green("\n  ✅ Committed successfully!\n"));
    } else {
      fs.writeFileSync(path.join(projectPath, ".commit_msg"), message, "utf8");
      console.log(chalk.cyan(`\n  📋 Saved to ${projectPath}/.commit_msg`));
      console.log(chalk.gray(`     Run: git commit -F .commit_msg\n`));
    }
    
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await inputPrompt("Press Enter to continue...");
}


// Setup agent
async function runSetup() {
  console.log(chalk.yellow("\n  ⚙️  Agent Setup\n"));
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not configured in .env file"));
    console.log(chalk.gray("     1. Get your API key from https://app.letta.ai"));
    console.log(chalk.gray("     2. Edit .env and add: LETTA_API_KEY=sk-let-...\n"));
    await inputPrompt("Press Enter to continue...");
    return;
  }
  
  if (hasAgent()) {
    const recreate = await confirmPrompt("Agent already exists. Create a new one?");
    if (!recreate) return;
  }
  
  const spinner = ora("  Creating agent...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/createAgent.js")], {
      cwd: ROOT,
      env: { ...process.env },
    });
    
    let output = "";
    child.stdout.on("data", (data) => { output += data.toString(); });
    child.stderr.on("data", (data) => { output += data.toString(); });
    
    await new Promise((resolve) => child.on("close", resolve));
    
    if (hasAgent()) {
      spinner.succeed("  Agent created successfully!");
      console.log(chalk.gray(output));
    } else {
      spinner.fail("  Failed to create agent");
      console.log(chalk.red(output));
    }
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await inputPrompt("Press Enter to continue...");
}

// Cleanup agents
async function runCleanup() {
  console.log(chalk.gray("\n  🧹 Agent Cleanup\n"));
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not configured.\n"));
    await inputPrompt("Press Enter to continue...");
    return;
  }
  
  const confirm = await confirmPrompt("Delete all agents except current one?");
  if (!confirm) return;
  
  const spinner = ora("  Cleaning up agents...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/cleanupAgents.js"), "--confirm"], {
      cwd: ROOT,
      env: { ...process.env },
    });
    
    let output = "";
    child.stdout.on("data", (data) => { output += data.toString(); });
    child.stderr.on("data", (data) => { output += data.toString(); });
    
    await new Promise((resolve) => child.on("close", resolve));
    
    spinner.succeed("  Cleanup complete!");
    console.log(chalk.gray(output));
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await inputPrompt("Press Enter to continue...");
}

// Show help
async function showHelp() {
  console.clear();
  console.log(BANNER);
  
  console.log(chalk.bold.white("\n  📖 HELP & DOCUMENTATION\n"));
  console.log(chalk.gray("─".repeat(66)));
  
  console.log(chalk.cyan.bold("\n  👁️  Watch & Analyze\n"));
  console.log(chalk.white("      Monitors your project for file changes and analyzes code"));
  console.log(chalk.white("      in real-time using AI.\n"));
  console.log(chalk.gray("      • Detects bugs, security issues, and improvements"));
  console.log(chalk.gray("      • Can auto-fix issues with the auto-fix option"));
  console.log(chalk.gray("      • Generates commit messages on exit"));
  
  console.log(chalk.green.bold("\n  🔧 Auto Test-Fix\n"));
  console.log(chalk.white("      Runs your test suite and automatically fixes failures.\n"));
  console.log(chalk.gray("      • Sets up Jest if not configured"));
  console.log(chalk.gray("      • Creates basic tests if none exist"));
  console.log(chalk.gray("      • Retries with different approaches"));
  
  console.log(chalk.blue.bold("\n  💬 Chat with Agent\n"));
  console.log(chalk.white("      Interactive chat with your Letta AI agent.\n"));
  console.log(chalk.gray("      • Ask coding questions"));
  console.log(chalk.gray("      • Get explanations and suggestions"));
  console.log(chalk.gray("      • Agent remembers context"));
  
  console.log(chalk.magenta.bold("\n  📝 Generate Commit\n"));
  console.log(chalk.white("      Creates commit messages from your git diff.\n"));
  console.log(chalk.gray("      • Format: DDMMYY - Description"));
  console.log(chalk.gray("      • Can commit directly or save for later"));
  
  console.log(chalk.gray("\n─".repeat(66)));
  
  console.log(chalk.bold.white("\n  ⌨️  KEYBOARD SHORTCUTS\n"));
  console.log(chalk.gray("      ↑ ↓         Navigate menu options"));
  console.log(chalk.gray("      Enter       Select option"));
  console.log(chalk.gray("      Ctrl+C      Exit / Stop watching"));
  
  console.log("");
  
  await inputPrompt("Press Enter to return to menu...");
}

// Main loop
async function main() {
  // Help flag
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(BANNER);
    console.log(chalk.bold("Usage:"));
    console.log("  npm start                    Interactive menu");
    console.log("  npm run watch <path>         Watch & analyze project");
    console.log("  npm run fix <path>           Auto test-fix loop");
    console.log("  npm run chat                 Chat with agent");
    console.log("");
    console.log(chalk.bold("Options:"));
    console.log("  --auto-fix                   Auto-apply fixes");
    console.log("  --auto-commit                Auto-generate commits");
    console.log("  --all                        Watch all files");
    console.log("  --debug                      Verbose logging");
    console.log("");
    process.exit(0);
  }
  
  // Quick start mode - if path provided as argument
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(path.resolve(argPath))) {
    const projectPath = path.resolve(argPath);
    const options = [];
    if (process.argv.includes("--auto-fix")) options.push("autoFix");
    if (process.argv.includes("--auto-commit")) options.push("autoCommit");
    if (process.argv.includes("--all")) options.push("watchAll");
    if (process.argv.includes("--debug")) options.push("debug");
    
    await runWatch(projectPath, options);
    return;
  }
  
  // Interactive menu mode
  while (true) {
    const action = await mainMenu();
    
    switch (action) {
      case "watch": {
        const project = await selectProject();
        if (project) {
          const options = await watchOptions();
          await runWatch(project, options);
        }
        break;
      }
      
      case "fix": {
        const project = await selectProject();
        if (project) {
          await runTestFix(project);
        }
        break;
      }
      
      case "chat":
        await runChat();
        break;
      
      case "commit": {
        const project = await selectProject();
        if (project) {
          await runCommit(project);
        }
        break;
      }
      
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
    }
  }
}

// Run
main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
