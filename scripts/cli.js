#!/usr/bin/env node
// Letta CLI - Production-quality coding assistant
import inquirer from "inquirer";
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
${chalk.cyan("╔═══════════════════════════════════════════════════════════╗")}
${chalk.cyan("║")}  ${chalk.bold.white("🤖 LETTA CODING ASSISTANT")}                               ${chalk.cyan("║")}
${chalk.cyan("║")}  ${chalk.gray("AI-powered code analysis, fixes & commit generation")}      ${chalk.cyan("║")}
${chalk.cyan("╚═══════════════════════════════════════════════════════════╝")}
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
  
  // Add to front, remove duplicates, keep last 5
  history.recentProjects = [projectPath, ...history.recentProjects.filter(p => p !== projectPath)].slice(0, 5);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf8");
}

// Status display
function showStatus() {
  console.log(chalk.gray("\n─────────────────────────────────────────────────────────────"));
  
  // API Key status
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API Key configured"));
  } else {
    console.log(chalk.red("  ✗ API Key missing - edit .env file"));
  }
  
  // Agent status
  if (hasAgent()) {
    const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
    console.log(chalk.green(`  ✓ Agent ready (${agentId.slice(0, 20)}...)`));
  } else {
    console.log(chalk.yellow("  ○ No agent - select 'Setup' to create one"));
  }
  
  console.log(chalk.gray("─────────────────────────────────────────────────────────────\n"));
}

// Main menu
async function mainMenu() {
  console.clear();
  console.log(BANNER);
  showStatus();
  
  const choices = [
    { name: `${chalk.cyan("👁️  Watch & Analyze")}  - Monitor code changes in real-time`, value: "watch" },
    { name: `${chalk.green("🔧 Auto Test-Fix")}     - Run tests and auto-fix failures`, value: "fix" },
    { name: `${chalk.blue("💬 Chat with Agent")}  - Ask questions or get help`, value: "chat" },
    { name: `${chalk.magenta("📝 Generate Commit")}  - Create commit message for changes`, value: "commit" },
    new inquirer.Separator(),
    { name: `${chalk.yellow("⚙️  Setup Agent")}      - Create or reconfigure agent`, value: "setup" },
    { name: `${chalk.gray("🧹 Cleanup Agents")}   - Remove unused agents`, value: "cleanup" },
    { name: `${chalk.gray("❓ Help")}              - Show documentation`, value: "help" },
    new inquirer.Separator(),
    { name: chalk.red("Exit"), value: "exit" },
  ];
  
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices,
      pageSize: 12,
    },
  ]);
  
  return action;
}

// Project selector
async function selectProject() {
  const recentProjects = getRecentProjects();
  
  const choices = [];
  
  if (recentProjects.length > 0) {
    choices.push(new inquirer.Separator(chalk.gray("── Recent Projects ──")));
    for (const proj of recentProjects) {
      if (fs.existsSync(proj)) {
        choices.push({ name: chalk.cyan(proj), value: proj });
      }
    }
    choices.push(new inquirer.Separator());
  }
  
  choices.push({ name: chalk.white("📁 Enter path manually"), value: "manual" });
  choices.push({ name: chalk.white("📂 Use current directory"), value: process.cwd() });
  choices.push(new inquirer.Separator());
  choices.push({ name: chalk.gray("← Back to menu"), value: "back" });
  
  const { project } = await inquirer.prompt([
    {
      type: "list",
      name: "project",
      message: "Select project to work with:",
      choices,
      pageSize: 10,
    },
  ]);
  
  if (project === "back") return null;
  
  if (project === "manual") {
    const { manualPath } = await inquirer.prompt([
      {
        type: "input",
        name: "manualPath",
        message: "Enter project path:",
        validate: (input) => {
          if (!input) return "Path is required";
          const resolved = path.resolve(input);
          if (!fs.existsSync(resolved)) return `Path not found: ${resolved}`;
          return true;
        },
      },
    ]);
    return path.resolve(manualPath);
  }
  
  return project;
}

// Watch options
async function watchOptions() {
  const { options } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "options",
      message: "Watch options:",
      choices: [
        { name: "Auto-fix issues", value: "autoFix", checked: false },
        { name: "Auto-commit after fixes", value: "autoCommit", checked: false },
        { name: "Watch all files (not just standard folders)", value: "watchAll", checked: false },
        { name: "Debug mode (verbose logging)", value: "debug", checked: false },
      ],
    },
  ]);
  
  return options;
}


// Run watch command
async function runWatch(projectPath, options) {
  saveToHistory(projectPath);
  
  console.log(chalk.cyan("\n🚀 Starting Watch & Analyze...\n"));
  
  const args = [projectPath];
  if (options.includes("autoFix")) args.push("--auto-fix");
  if (options.includes("autoCommit")) args.push("--auto-commit");
  if (options.includes("watchAll")) args.push("--all");
  if (options.includes("debug")) process.env.DEBUG = "true";
  
  // Dynamic import and run
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
  
  const { autoApply } = await inquirer.prompt([
    {
      type: "confirm",
      name: "autoApply",
      message: "Auto-apply fixes?",
      default: false,
    },
  ]);
  
  console.log(chalk.green("\n🔧 Starting Auto Test-Fix...\n"));
  
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
    console.log(chalk.red("\n❌ No agent found. Please run Setup first.\n"));
    await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
    return;
  }
  
  console.log(chalk.blue("\n💬 Chat with Letta Agent"));
  console.log(chalk.gray("Type 'exit' to return to menu\n"));
  
  const { Letta } = await import("@letta-ai/letta-client");
  const client = new Letta({
    apiKey: process.env.LETTA_API_KEY,
    projectID: process.env.LETTA_PROJECT_ID,
  });
  const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
  
  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: "input",
        name: "message",
        message: chalk.cyan("You:"),
      },
    ]);
    
    if (message.toLowerCase() === "exit") break;
    if (!message.trim()) continue;
    
    const spinner = ora("Thinking...").start();
    
    try {
      const response = await client.agents.messages.create(agentId, { input: message });
      spinner.stop();
      
      const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "No response";
      console.log(chalk.green("\nAgent:"), text, "\n");
    } catch (err) {
      spinner.fail("Error: " + err.message);
    }
  }
}

// Generate commit message
async function runCommit(projectPath) {
  if (!hasAgent()) {
    console.log(chalk.red("\n❌ No agent found. Please run Setup first.\n"));
    await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
    return;
  }
  
  saveToHistory(projectPath);
  
  const { execSync } = await import("child_process");
  
  // Get git diff
  let diff;
  try {
    diff = execSync("git diff --staged", { cwd: projectPath, encoding: "utf8" });
    if (!diff) {
      diff = execSync("git diff", { cwd: projectPath, encoding: "utf8" });
    }
  } catch (e) {
    console.log(chalk.red("\n❌ Not a git repository or no changes found.\n"));
    await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
    return;
  }
  
  if (!diff.trim()) {
    console.log(chalk.yellow("\n⚠️ No changes detected in git.\n"));
    await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
    return;
  }
  
  const spinner = ora("Generating commit message...").start();
  
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
Keep it under 50 chars. Be specific.

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
    
    spinner.succeed("Commit message generated!");
    
    console.log(chalk.green("\n📝 Suggested commit message:"));
    console.log(chalk.white.bold(`   ${message}\n`));
    
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Copy to clipboard (manual commit)", value: "copy" },
          { name: "Commit now", value: "commit" },
          { name: "Edit message", value: "edit" },
          { name: "Cancel", value: "cancel" },
        ],
      },
    ]);
    
    if (action === "commit") {
      execSync(`git add -A`, { cwd: projectPath });
      execSync(`git commit -m "${message}"`, { cwd: projectPath });
      console.log(chalk.green("\n✅ Committed successfully!\n"));
    } else if (action === "edit") {
      const { edited } = await inquirer.prompt([
        { type: "input", name: "edited", message: "Edit message:", default: message },
      ]);
      execSync(`git add -A`, { cwd: projectPath });
      execSync(`git commit -m "${edited}"`, { cwd: projectPath });
      console.log(chalk.green("\n✅ Committed successfully!\n"));
    } else if (action === "copy") {
      fs.writeFileSync(path.join(projectPath, ".commit_msg"), message, "utf8");
      console.log(chalk.cyan(`\n📋 Saved to ${projectPath}/.commit_msg`));
      console.log(chalk.gray(`   Run: git commit -F .commit_msg\n`));
    }
    
  } catch (err) {
    spinner.fail("Error: " + err.message);
  }
  
  await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
}


// Setup agent
async function runSetup() {
  console.log(chalk.yellow("\n⚙️  Agent Setup\n"));
  
  if (!hasApiKey()) {
    console.log(chalk.red("❌ LETTA_API_KEY not configured in .env file"));
    console.log(chalk.gray("   1. Get your API key from https://app.letta.ai"));
    console.log(chalk.gray("   2. Edit .env and add: LETTA_API_KEY=sk-let-...\n"));
    await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
    return;
  }
  
  if (hasAgent()) {
    const { recreate } = await inquirer.prompt([
      {
        type: "confirm",
        name: "recreate",
        message: "Agent already exists. Create a new one?",
        default: false,
      },
    ]);
    if (!recreate) return;
  }
  
  const spinner = ora("Creating agent...").start();
  
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
      spinner.succeed("Agent created successfully!");
      console.log(chalk.gray(output));
    } else {
      spinner.fail("Failed to create agent");
      console.log(chalk.red(output));
    }
  } catch (err) {
    spinner.fail("Error: " + err.message);
  }
  
  await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
}

// Cleanup agents
async function runCleanup() {
  console.log(chalk.gray("\n🧹 Agent Cleanup\n"));
  
  if (!hasApiKey()) {
    console.log(chalk.red("❌ LETTA_API_KEY not configured.\n"));
    await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
    return;
  }
  
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "This will delete all agents except your current one. Continue?",
      default: false,
    },
  ]);
  
  if (!confirm) return;
  
  const spinner = ora("Cleaning up agents...").start();
  
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
    
    spinner.succeed("Cleanup complete!");
    console.log(chalk.gray(output));
  } catch (err) {
    spinner.fail("Error: " + err.message);
  }
  
  await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to continue..." }]);
}

// Show help
async function showHelp() {
  console.clear();
  console.log(BANNER);
  
  console.log(chalk.bold("\n📖 HELP & DOCUMENTATION\n"));
  
  console.log(chalk.cyan("Watch & Analyze"));
  console.log(chalk.gray("  Monitors your project for file changes and analyzes code in real-time."));
  console.log(chalk.gray("  - Detects bugs, security issues, and improvements"));
  console.log(chalk.gray("  - Can auto-fix issues with --auto-fix option"));
  console.log(chalk.gray("  - Generates commit messages on exit\n"));
  
  console.log(chalk.green("Auto Test-Fix"));
  console.log(chalk.gray("  Runs your test suite and automatically fixes failures."));
  console.log(chalk.gray("  - Sets up Jest if not configured"));
  console.log(chalk.gray("  - Creates basic tests if none exist"));
  console.log(chalk.gray("  - Retries with different approaches\n"));
  
  console.log(chalk.blue("Chat with Agent"));
  console.log(chalk.gray("  Interactive chat with your Letta agent."));
  console.log(chalk.gray("  - Ask coding questions"));
  console.log(chalk.gray("  - Get explanations and suggestions"));
  console.log(chalk.gray("  - Agent remembers context\n"));
  
  console.log(chalk.magenta("Generate Commit"));
  console.log(chalk.gray("  Creates commit messages from your git diff."));
  console.log(chalk.gray("  - Format: DDMMYY - Description"));
  console.log(chalk.gray("  - Can commit directly or save for later\n"));
  
  console.log(chalk.bold("Keyboard Shortcuts (in Watch mode):"));
  console.log(chalk.gray("  Ctrl+C  - Stop watching and show commit options\n"));
  
  console.log(chalk.bold("Configuration (.env):"));
  console.log(chalk.gray("  LETTA_API_KEY     - Your Letta API key (required)"));
  console.log(chalk.gray("  AUTO_APPLY        - Auto-apply fixes (true/false)"));
  console.log(chalk.gray("  MIN_CONFIDENCE    - Min confidence for auto-fix (0.0-1.0)\n"));
  
  await inquirer.prompt([{ type: "input", name: "continue", message: "Press Enter to return to menu..." }]);
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
        console.log(chalk.cyan("\n👋 Goodbye!\n"));
        process.exit(0);
    }
  }
}

// Run
main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
