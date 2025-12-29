#!/usr/bin/env node
// Dashboard Demo - Preview themes and live dashboard
import chalk from "chalk";
import logUpdate from "log-update";

const THEME_NAME = process.argv[2] || "ocean";

// ═══════════════════════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════════════════════

const THEMES = {
  ocean: {
    name: "Ocean",
    header: chalk.cyan,
    box1: chalk.cyan,
    box2: chalk.blue,
    box3: chalk.green,
    box4: chalk.yellow,
    box5: chalk.red,
    box6: chalk.magenta,
    accent: chalk.cyan,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    dim: chalk.dim,
    bold: chalk.bold,
  },
  forest: {
    name: "Forest",
    header: chalk.green,
    box1: chalk.green,
    box2: chalk.hex("#90EE90"),
    box3: chalk.hex("#32CD32"),
    box4: chalk.yellow,
    box5: chalk.hex("#FF6347"),
    box6: chalk.hex("#98FB98"),
    accent: chalk.green,
    success: chalk.hex("#32CD32"),
    warning: chalk.yellow,
    error: chalk.red,
    dim: chalk.dim,
    bold: chalk.bold,
  },
  sunset: {
    name: "Sunset",
    header: chalk.hex("#FF6B6B"),
    box1: chalk.hex("#FF6B6B"),
    box2: chalk.hex("#FFA07A"),
    box3: chalk.hex("#FFD93D"),
    box4: chalk.hex("#FF8C00"),
    box5: chalk.hex("#DC143C"),
    box6: chalk.hex("#FF69B4"),
    accent: chalk.hex("#FF6B6B"),
    success: chalk.hex("#98FB98"),
    warning: chalk.hex("#FFD93D"),
    error: chalk.hex("#DC143C"),
    dim: chalk.dim,
    bold: chalk.bold,
  },
  midnight: {
    name: "Midnight",
    header: chalk.hex("#9D4EDD"),
    box1: chalk.hex("#9D4EDD"),
    box2: chalk.hex("#7B68EE"),
    box3: chalk.hex("#00CED1"),
    box4: chalk.hex("#FFD700"),
    box5: chalk.hex("#FF4500"),
    box6: chalk.hex("#DA70D6"),
    accent: chalk.hex("#9D4EDD"),
    success: chalk.hex("#00FA9A"),
    warning: chalk.hex("#FFD700"),
    error: chalk.hex("#FF4500"),
    dim: chalk.dim,
    bold: chalk.bold,
  },
  mono: {
    name: "Monochrome",
    header: chalk.white,
    box1: chalk.white,
    box2: chalk.gray,
    box3: chalk.white,
    box4: chalk.gray,
    box5: chalk.white,
    box6: chalk.gray,
    accent: chalk.white,
    success: chalk.white,
    warning: chalk.gray,
    error: chalk.white,
    dim: chalk.dim,
    bold: chalk.bold,
  },
};

const T = THEMES[THEME_NAME] || THEMES.ocean;
const LINE = "─";
const W = 70;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function box(title, lines, width, color) {
  const inner = width - 4;
  let out = color(`  ┌─ `) + T.bold(title) + color(` ${LINE.repeat(Math.max(0, inner - title.length - 1))}┐\n`);
  for (const line of lines) {
    const clean = stripAnsi(String(line));
    const padding = Math.max(0, inner - clean.length);
    out += color(`  │ `) + line + " ".repeat(padding) + color(` │\n`);
  }
  out += color(`  └${LINE.repeat(width - 2)}┘`);
  return out;
}

function bar(val, max = 10, w = 10) {
  const f = Math.min(val, max);
  return T.success("█".repeat(f)) + T.dim("░".repeat(w - f));
}

// Demo data
let stats = { analyzed: 0, issues: 0, fixed: 0, skipped: 0 };
let issuesByType = { bugs: 0, security: 0, performance: 0, style: 0 };
let severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
let recentFiles = [];
let logs = ["Waiting for file changes..."];
let uptime = 0;
let currentStatus = "Initializing...";

function render() {
  const mins = Math.floor(uptime / 60);
  const secs = uptime % 60;
  const uptimeStr = `${mins}m ${secs}s`;
  
  let output = "";
  
  // Header
  output += T.header(`
  ┌${LINE.repeat(W - 4)}┐
  │  🤖 Letta Coding Assistant              Theme: ${T.bold(T.name)}  │
  └${LINE.repeat(W - 4)}┘
`);

  // Project Info
  output += box("Project Info", [
    `${T.dim("Project:")}   ${T.bold("letta-code-event-manager")}`,
    `${T.dim("Path:")}      ${T.accent("C:\\Users\\...\\letta-code-event-manager")}`,
    `${T.dim("Framework:")} ${chalk.yellow("node")}`,
    `${T.dim("Language:")}  ${chalk.blue("javascript")}`,
    `${T.dim("Files:")}     ${T.success("204")} total (45 comps, 32 utils, 28 tests)`,
    `${T.dim("Auto-fix:")}  ${T.success("ON")}`,
  ], W, T.box1);

  output += "\n\n";

  // Watching
  output += box("Watching", [
    `${T.accent("›")} All directories`,
    `${T.dim("Extensions:")} .js, .jsx, .ts, .tsx...`,
  ], 35, T.box2);

  output += "\n\n";

  // Stats
  output += box("Stats", [
    `Analyzed  ${T.success(String(stats.analyzed).padStart(3))}`,
    `Issues    ${T.warning(String(stats.issues).padStart(3))}`,
    `Fixed     ${T.accent(String(stats.fixed).padStart(3))}`,
    `Skipped   ${T.dim(String(stats.skipped).padStart(3))}`,
    `Uptime    ${chalk.magenta(uptimeStr)}`,
  ], 24, T.box3);

  output += "\n\n";

  // Issues
  output += box("Issues", [
    `${T.error("●")} Bugs     ${bar(issuesByType.bugs)} ${String(issuesByType.bugs).padStart(2)}`,
    `${T.warning("!")} Security ${bar(issuesByType.security)} ${String(issuesByType.security).padStart(2)}`,
    `${T.accent("⚡")} Perf     ${bar(issuesByType.performance)} ${String(issuesByType.performance).padStart(2)}`,
    `${T.dim("○")} Style    ${bar(issuesByType.style)} ${String(issuesByType.style).padStart(2)}`,
  ], 34, T.box4);

  output += "\n\n";

  // Severity
  output += box("Severity", [
    `${T.error("●")} Critical ${T.error(String(severityCounts.critical).padStart(2))}`,
    `${T.warning("●")} High     ${T.warning(String(severityCounts.high).padStart(2))}`,
    `${chalk.white("●")} Medium   ${String(severityCounts.medium).padStart(2)}`,
    `${T.dim("●")} Low      ${T.dim(String(severityCounts.low).padStart(2))}`,
  ], 22, T.box5);

  output += "\n\n";

  // Recent Activity
  let recentLines = recentFiles.length === 0 
    ? [T.dim("No files analyzed yet...")]
    : recentFiles.slice(-5).reverse().map(f => {
        const icon = f.hasIssues ? T.error("×") : T.success("✓");
        return `${icon} ${f.name.padEnd(20)} ${T.dim(f.time)}${f.fixed ? T.accent(" [fix]") : ""}`;
      });
  output += box("Recent Activity", recentLines, 42, T.box6);

  output += "\n\n";

  // Activity Log
  output += T.dim(`  ─── Activity Log ${"─".repeat(40)}\n`);
  for (const log of logs.slice(-3)) {
    output += `  ${log}\n`;
  }

  output += "\n";

  // Status
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const frame = spinner[Math.floor(Date.now() / 100) % spinner.length];
  output += T.accent(`  ${frame} ${currentStatus}\n`);
  output += T.dim(`\n  ${LINE.repeat(W - 4)}`);
  output += T.dim(`\n  Press ${T.accent("Ctrl+C")} to stop  |  Theme: ${T.accent(THEME_NAME)}  |  Try: node scripts/dashboardDemo.js sunset\n`);

  return output;
}

// Simulate live activity
console.clear();
currentStatus = "Starting watcher...";

const events = [
  { delay: 1000, action: () => { currentStatus = "Ready - watching all files for changes..."; logs.push(T.success("✓ Watcher ready - monitoring all project files")); }},
  { delay: 2000, action: () => { logs.push(T.accent("› Changed: src/core/ideCoordinator.js")); currentStatus = "Analyzing ideCoordinator.js..."; }},
  { delay: 3500, action: () => { 
    stats.analyzed++; 
    stats.issues += 2;
    issuesByType.bugs++;
    issuesByType.performance++;
    severityCounts.high++;
    severityCounts.medium++;
    recentFiles.push({ name: "ideCoordinator.js", time: "14:32:15", hasIssues: true, fixed: false });
    logs.push(`🐛 ${T.warning("[high]")} ideCoordinator.js: Missing null check`);
    logs.push(`⚡ ${T.warning("[medium]")} ideCoordinator.js: Unnecessary re-render`);
    currentStatus = "Ready - watching all files for changes...";
  }},
  { delay: 5000, action: () => { logs.push(T.accent("› Changed: src/core/lockManager.js")); currentStatus = "Analyzing lockManager.js..."; }},
  { delay: 6500, action: () => { 
    stats.analyzed++; 
    recentFiles.push({ name: "lockManager.js", time: "14:32:18", hasIssues: false, fixed: false });
    logs.push(T.success("✓ lockManager.js - Looks good! (1.2s)"));
    currentStatus = "Ready - watching all files for changes...";
  }},
  { delay: 8000, action: () => { logs.push(T.success("+ Added: src/utils/newHelper.js")); currentStatus = "Analyzing newHelper.js..."; }},
  { delay: 9500, action: () => { 
    stats.analyzed++; 
    stats.issues++;
    stats.fixed++;
    issuesByType.style++;
    severityCounts.low++;
    recentFiles.push({ name: "newHelper.js", time: "14:32:22", hasIssues: true, fixed: true });
    logs.push(`💅 ${T.dim("[low]")} newHelper.js: Missing JSDoc`);
    logs.push(T.success("✓ Auto-fixed: newHelper.js"));
    currentStatus = "Ready - watching all files for changes...";
  }},
  { delay: 12000, action: () => {
    logUpdate.clear();
    console.log(T.header(`
  ┌─────────────────────────────────────────────────────────────┐
  │                    📊 Session Summary                       │
  └─────────────────────────────────────────────────────────────┘
`));
    console.log(`  ${T.dim("Analyzed:")}  ${T.success(stats.analyzed)}    ${T.dim("Issues:")} ${T.warning(stats.issues)}    ${T.dim("Fixed:")} ${T.accent(stats.fixed)}`);
    console.log(`  ${T.dim("Duration:")} ${chalk.magenta("0m 12s")}`);
    console.log("");
    console.log(`  ${T.error("●")} Bugs: 1  ${T.warning("●")} Security: 0  ${T.accent("●")} Perf: 1  ${T.dim("●")} Style: 1`);
    console.log(T.accent(`\n  ♥ Thanks for using Letta!\n`));
    console.log(T.dim(`  --- Demo complete! Available themes: ocean, forest, sunset, midnight, mono ---\n`));
    process.exit(0);
  }},
];

// Schedule events
for (const event of events) {
  setTimeout(event.action, event.delay);
}

// Live update loop
const interval = setInterval(() => {
  uptime++;
  logUpdate(render());
}, 1000);

// Initial render
logUpdate(render());
