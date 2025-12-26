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
  
  // Add to front, remove duplicates, keep last 5
  history.recentProjects = [projectPath, ...history.recentProjects.filter(p => p !== projectPath)].slice(0, 5);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf8");
}

// Status display
function showStatus() {
  console.log("");
  
  // API Key status
  if (hasApiKey()) {
    console.log(chalk.green("  ✓ API Key configured"));
  } else {
    console.log(chalk.red("  ✗ API Key missing") + chalk.gray(" - edit .env file"));
  }
  
  // Agent status
  if (hasAgent()) {
    const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
    console.log(chalk.green(`  ✓ Agent ready`) + chalk.gray(` (${agentId.slice(0, 20)}...)`));
  } else {
    console.log(chalk.yellow("  ○ No agent") + chalk.gray(" - select 'Setup' to create one"));
  }
  
  console.log("");
}

// Main menu
async function mainMenu() {
  console.clear();
  console.log(BANNER);
  showStatus();
  
  // Show navigation hint
  console.log(chalk.gray("  ↑↓ Navigate  •  Enter Select  •  Ctrl+C Exit\n"));
  console.log(chalk.gray("─".repeat(66)));
  console.log("");
  
  const choices = [
    { 
      name: `  ${chalk.cyan.bold("👁️  Watch & Analyze")}     ${chalk.gray("Monitor code changes in real-time")}`,
      value: "watch",
      short: "Watch & Analyze"
    },
    { 
      name: `  ${chalk.green.bold("🔧 Auto Test-Fix")}       ${chalk.gray("Run tests and auto-fix failures")}`,
      value: "fix",
      short: "Auto Test-Fix"
    },
    { 
      name: `  ${chalk.blue.bold("💬 Chat with Agent")}     ${chalk.gray("Ask questions or get help")}`,
      value: "chat",
      short: "Chat"
    },
    { 
      name: `  ${chalk.magenta.bold("📝 Generate Commit")}     ${chalk.gray("Create commit message for changes")}`,
      value: "commit",
      short: "Generate Commit"
    },
    new inquirer.Separator(chalk.gray("\n─".repeat(33))),
    { 
      name: `  ${chalk.yellow("⚙️  Setup Agent")}         ${chalk.gray("Create or reconfigure agent")}`,
      value: "setup",
      short: "Setup"
    },
    { 
      name: `  ${chalk.gray("🧹 Cleanup Agents")}       ${chalk.gray("Remove unused agents")}`,
      value: "cleanup",
      short: "Cleanup"
    },
    { 
      name: `  ${chalk.gray("❓ Help")}                 ${chalk.gray("Show documentation")}`,
      value: "help",
      short: "Help"
    },
    new inquirer.Separator(chalk.gray("\n─".repeat(33))),
    { 
      name: `  ${chalk.red("✖  Exit")}`,
      value: "exit",
      short: "Exit"
    },
  ];
  
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: chalk.white.bold("Select an option:"),
      choices,
      pageSize: 15,
      loop: false,
    },
  ]);
  
  return action;
}

// Project selector
async function selectProject() {
  const recentProjects = getRecentProjects();
  
  console.log("");
  console.log(chalk.gray("  ↑↓ Navigate  •  Enter Select\n"));
  
  const choices = [];
  
  if (recentProjects.length > 0) {
    choices.push(new inquirer.Separator(chalk.gray("  ── Recent Projects ──")));
    for (const proj of recentProjects) {
      if (fs.existsSync(proj)) {
        const shortPath = proj.length > 50 ? "..." + proj.slice(-47) : proj;
        choices.push({ 
          name: `  ${chalk.cyan("📁")} ${shortPath}`, 
          value: proj,
          short: path.basename(proj)
        });
      }
    }
    choices.push(new inquirer.Separator(""));
  }
  
  choices.push({ 
    name: `  ${chalk.white("📝 Enter path manually")}`, 
    value: "manual",
    short: "Manual"
  });
  choices.push({ 
    name: `  ${chalk.white("📂 Use current directory")} ${chalk.gray(`(${process.cwd().slice(-30)})`)}`, 
    value: process.cwd(),
    short: "Current dir"
  });
  choices.push(new inquirer.Separator(""));
  choices.push({ 
    name: `  ${chalk.gray("← Back to menu")}`, 
    value: "back",
    short: "Back"
  });
  
  const { project } = await inquirer.prompt([
    {
      type: "list",
      name: "project",
      message: chalk.white.bold("Select project:"),
      choices,
      pageSize: 12,
      loop: false,
    },
  ]);
  
  if (project === "back") return null;
  
  if (project === "manual") {
    const { manualPath } = await inquirer.prompt([
      {
        type: "input",
        name: "manualPath",
        message: chalk.white("Enter project path:"),
        validate: (input) => {
          if (!input) return chalk.red("Path is required");
          const resolved = path.resolve(input);
          if (!fs.existsSync(resolved)) return chalk.red(`Path not found: ${resolved}`);
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
  console.log("");
  console.log(chalk.gray("  Space Toggle  •  Enter Confirm\n"));
  
  const { options } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "options",
      message: chalk.white.bold("Watch options:"),
      choices: [
        { 
          name: `  ${chalk.green("🔧 Auto-fix issues")}        ${chalk.gray("Automatically apply suggested fixes")}`,
          value: "autoFix", 
          checked: false 
        },
        { 
          name: `  ${chalk.blue("📝 Auto-commit")}            ${chalk.gray("Generate commits after fixes")}`,
          value: "autoCommit", 
          checked: false 
        },
        { 
          name: `  ${chalk.yellow("📂 Watch all files")}        ${chalk.gray("Not just standard folders")}`,
          value: "watchAll", 
          checked: false 
        },
        { 
          name: `  ${chalk.gray("🐛 Debug mode")}             ${chalk.gray("Verbose logging")}`,
          value: "debug", 
          checked: false 
        },
      ],
      pageSize: 6,
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
  console.log(chalk.gray("      Space       Toggle checkbox"));
  console.log(chalk.gray("      Ctrl+C      Exit / Stop watching"));
  
  console.log(chalk.gray("\n─".repeat(66)));
  
  console.log(chalk.bold.white("\n  ⚙️  CONFIGURATION (.env)\n"));
  console.log(chalk.gray("      LETTA_API_KEY     Your Letta API key (required)"));
  console.log(chalk.gray("      AUTO_APPLY        Auto-apply fixes (true/false)"));
  console.log(chalk.gray("      MIN_CONFIDENCE    Min confidence for auto-fix (0.0-1.0)"));
  
  console.log("");
  
  await inquirer.prompt([{ 
    type: "input", 
    name: "continue", 
    message: chalk.gray("Press Enter to return to menu...") 
  }]);
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
