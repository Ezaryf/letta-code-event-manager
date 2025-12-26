#!/usr/bin/env node
// Letta CLI - Production-quality coding assistant
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

// Clear screen and show banner
function showBanner() {
  console.clear();
  console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     ${chalk.bold.white("🤖 LETTA CODING ASSISTANT")}                                  ║
║     ${chalk.gray("AI-powered code analysis, fixes & commit generation")}       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`));
  
  // Status
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
}

// Arrow key menu - full screen redraw approach
async function arrowMenu(title, options, showBack = false) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const items = [...options];
    if (showBack) {
      items.push({ label: chalk.gray("← Back"), value: null });
    }
    
    const draw = () => {
      showBanner();
      console.log(chalk.gray("  ↑↓ Navigate  •  Enter Select  •  Ctrl+C Exit"));
      console.log(chalk.gray("─".repeat(66)));
      console.log("");
      console.log(chalk.bold.white(`  ${title}`));
      console.log("");
      
      items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        if (isSelected) {
          console.log(chalk.cyan(`  ❯ ${item.label}`));
        } else {
          console.log(chalk.white(`    ${item.label}`));
        }
      });
      
      console.log("");
    };
    
    draw();
    
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    const onKeypress = (str, key) => {
      if (!key) return;
      
      if (key.name === "up") {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
        // Skip separators
        while (items[selectedIndex].value && items[selectedIndex].value.startsWith("separator")) {
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
        }
        draw();
      } else if (key.name === "down") {
        selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
        // Skip separators
        while (items[selectedIndex].value && items[selectedIndex].value.startsWith("separator")) {
          selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
        }
        draw();
      } else if (key.name === "return") {
        cleanup();
        console.log("");
        resolve(items[selectedIndex].value);
      } else if (key.ctrl && key.name === "c") {
        cleanup();
        console.log(chalk.cyan("\n\n  👋 Goodbye!\n"));
        process.exit(0);
      } else if (key.name === "escape") {
        cleanup();
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
async function inputPrompt(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(chalk.white(`  ${message} `), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Confirm prompt
async function confirmPrompt(message) {
  const answer = await inputPrompt(`${message} (y/n):`);
  return answer.toLowerCase() === "y";
}


// Main menu options
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

// Main menu
async function mainMenu() {
  const action = await arrowMenu("MAIN MENU", MAIN_MENU);
  return action;
}

// Project selector
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
  options.push({ label: `📂 Current directory`, value: process.cwd() });
  
  const project = await arrowMenu("SELECT PROJECT", options, true);
  
  if (project === null) return null;
  
  if (project === "manual") {
    const manualPath = await inputPrompt("Enter project path:");
    if (!manualPath) return null;
    const resolved = path.resolve(manualPath);
    if (!fs.existsSync(resolved)) {
      console.log(chalk.red(`  Path not found: ${resolved}`));
      await inputPrompt("Press Enter...");
      return null;
    }
    return resolved;
  }
  
  return project;
}

// Run watch
async function runWatch(projectPath, options = []) {
  saveToHistory(projectPath);
  
  console.log(chalk.cyan("\n  🚀 Starting Watch & Analyze...\n"));
  
  const args = [projectPath];
  if (options.includes("autoFix")) args.push("--auto-fix");
  
  const { spawn } = await import("child_process");
  const child = spawn("node", [path.join(ROOT, "scripts/assistant.js"), ...args], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env },
  });
  
  return new Promise((resolve) => child.on("close", resolve));
}

// Run test-fix
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
  
  return new Promise((resolve) => child.on("close", resolve));
}

// Chat
async function runChat() {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent. Run Setup first.\n"));
    await inputPrompt("Press Enter...");
    return;
  }
  
  console.log(chalk.blue("\n  💬 Chat with Agent"));
  console.log(chalk.gray("  Type 'exit' to return\n"));
  
  const { Letta } = await import("@letta-ai/letta-client");
  const client = new Letta({
    apiKey: process.env.LETTA_API_KEY,
    projectID: process.env.LETTA_PROJECT_ID,
  });
  const agentId = fs.readFileSync(path.join(ROOT, ".letta_agent_id"), "utf8").trim();
  
  while (true) {
    const message = await inputPrompt(chalk.cyan("You:"));
    
    if (message.toLowerCase() === "exit" || !message) break;
    
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

// Generate commit
async function runCommit(projectPath) {
  if (!hasAgent()) {
    console.log(chalk.red("\n  ❌ No agent. Run Setup first.\n"));
    await inputPrompt("Press Enter...");
    return;
  }
  
  saveToHistory(projectPath);
  
  const { execSync } = await import("child_process");
  
  let diff;
  try {
    diff = execSync("git diff --staged", { cwd: projectPath, encoding: "utf8" });
    if (!diff) diff = execSync("git diff", { cwd: projectPath, encoding: "utf8" });
  } catch (e) {
    console.log(chalk.red("\n  ❌ Not a git repo or no changes.\n"));
    await inputPrompt("Press Enter...");
    return;
  }
  
  if (!diff.trim()) {
    console.log(chalk.yellow("\n  ⚠️ No changes detected.\n"));
    await inputPrompt("Press Enter...");
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
    const prompt = `Generate commit message. Format: ${today} - <description>. Under 50 chars. Capitalize after dash.\n\n\`\`\`diff\n${diff.slice(0, 2000)}\n\`\`\`\n\nRespond with ONLY the message.`;
    
    const response = await client.agents.messages.create(agentId, { input: prompt });
    let message = response?.messages?.map((m) => m.text || m.content).join("").trim().split("\n")[0] || "";
    
    if (!message.startsWith(today)) message = `${today} - ${message}`;
    
    spinner.succeed("  Generated!");
    
    console.log(chalk.green("\n  📝 Commit message:"));
    console.log(chalk.white.bold(`     ${message}\n`));
    
    if (await confirmPrompt("Commit now?")) {
      execSync(`git add -A`, { cwd: projectPath });
      execSync(`git commit -m "${message}"`, { cwd: projectPath });
      console.log(chalk.green("\n  ✅ Committed!\n"));
    }
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await inputPrompt("Press Enter...");
}


// Setup
async function runSetup() {
  console.log(chalk.yellow("\n  ⚙️  Agent Setup\n"));
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not set in .env"));
    console.log(chalk.gray("     Get key from https://app.letta.ai\n"));
    await inputPrompt("Press Enter...");
    return;
  }
  
  if (hasAgent() && !(await confirmPrompt("Agent exists. Create new?"))) {
    return;
  }
  
  const spinner = ora("  Creating agent...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/createAgent.js")], {
      cwd: ROOT,
      env: { ...process.env },
    });
    
    await new Promise((resolve) => child.on("close", resolve));
    
    if (hasAgent()) {
      spinner.succeed("  Agent created!");
    } else {
      spinner.fail("  Failed to create agent");
    }
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await inputPrompt("Press Enter...");
}

// Cleanup
async function runCleanup() {
  console.log(chalk.gray("\n  🧹 Agent Cleanup\n"));
  
  if (!hasApiKey()) {
    console.log(chalk.red("  ❌ LETTA_API_KEY not set.\n"));
    await inputPrompt("Press Enter...");
    return;
  }
  
  if (!(await confirmPrompt("Delete all agents except current?"))) {
    return;
  }
  
  const spinner = ora("  Cleaning up...").start();
  
  try {
    const { spawn } = await import("child_process");
    const child = spawn("node", [path.join(ROOT, "scripts/cleanupAgents.js"), "--confirm"], {
      cwd: ROOT,
      env: { ...process.env },
    });
    
    await new Promise((resolve) => child.on("close", resolve));
    spinner.succeed("  Cleanup complete!");
  } catch (err) {
    spinner.fail("  Error: " + err.message);
  }
  
  await inputPrompt("Press Enter...");
}

// Help
async function showHelp() {
  showBanner();
  
  console.log(chalk.bold.white("  📖 HELP\n"));
  console.log(chalk.cyan("  👁️  Watch & Analyze") + chalk.gray(" - Monitor code, detect issues, suggest fixes"));
  console.log(chalk.green("  🔧 Auto Test-Fix") + chalk.gray("    - Run tests, auto-fix failures"));
  console.log(chalk.blue("  💬 Chat") + chalk.gray("             - Ask coding questions"));
  console.log(chalk.magenta("  📝 Generate Commit") + chalk.gray("  - AI commit messages (DDMMYY format)"));
  console.log("");
  console.log(chalk.bold.white("  ⌨️  KEYS\n"));
  console.log(chalk.gray("  ↑ ↓     Navigate"));
  console.log(chalk.gray("  Enter   Select"));
  console.log(chalk.gray("  Ctrl+C  Exit"));
  console.log("");
  
  await inputPrompt("Press Enter to return...");
}

// Main
async function main() {
  // Help flag
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
${chalk.cyan("Letta Coding Assistant")}

Usage:
  npm start                    Interactive menu
  npm run watch <path>         Watch & analyze
  npm run fix <path>           Auto test-fix
  npm run chat                 Chat with agent

Options:
  --auto-fix    Auto-apply fixes
  --help        Show this help
`);
    process.exit(0);
  }
  
  // Direct path mode
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(path.resolve(argPath))) {
    const options = process.argv.includes("--auto-fix") ? ["autoFix"] : [];
    await runWatch(path.resolve(argPath), options);
    return;
  }
  
  // Interactive menu
  while (true) {
    const action = await mainMenu();
    
    if (action === "watch") {
      const project = await selectProject();
      if (project) {
        const autoFix = await confirmPrompt("Enable auto-fix?");
        await runWatch(project, autoFix ? ["autoFix"] : []);
      }
    } else if (action === "fix") {
      const project = await selectProject();
      if (project) await runTestFix(project);
    } else if (action === "chat") {
      await runChat();
    } else if (action === "commit") {
      const project = await selectProject();
      if (project) await runCommit(project);
    } else if (action === "setup") {
      await runSetup();
    } else if (action === "cleanup") {
      await runCleanup();
    } else if (action === "help") {
      await showHelp();
    } else if (action === "exit") {
      console.log(chalk.cyan("\n  👋 Goodbye!\n"));
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
