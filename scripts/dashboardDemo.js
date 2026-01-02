#!/usr/bin/env node
/**
 * Dashboard Demo - Preview the file watcher UI with simulated events
 * 
 * @letta-ignore - This is a demo/preview script, not production code
 * 
 * This file simulates the watcher output for theme preview purposes.
 * The "API key" and "security" messages shown are SIMULATED OUTPUT TEXT,
 * not actual security issues. The setTimeout usage is intentional for
 * creating a timed demo sequence.
 * 
 * Usage: node scripts/dashboardDemo.js [theme]
 * Themes: ocean, forest, sunset, midnight, mono
 */
import chalk from "chalk";

const THEME_NAME = process.argv[2] || "ocean";

const THEMES = {
  ocean: { accent: chalk.cyan, success: chalk.green, warning: chalk.yellow, error: chalk.red, dim: chalk.dim },
  forest: { accent: chalk.green, success: chalk.hex("#32CD32"), warning: chalk.yellow, error: chalk.red, dim: chalk.dim },
  sunset: { accent: chalk.hex("#FF6B6B"), success: chalk.hex("#98FB98"), warning: chalk.hex("#FFD93D"), error: chalk.hex("#DC143C"), dim: chalk.dim },
  midnight: { accent: chalk.hex("#9D4EDD"), success: chalk.hex("#00FA9A"), warning: chalk.hex("#FFD700"), error: chalk.hex("#FF4500"), dim: chalk.dim },
  mono: { accent: chalk.white, success: chalk.white, warning: chalk.gray, error: chalk.white, dim: chalk.dim },
};

const T = THEMES[THEME_NAME] || THEMES.ocean;

function log(time, message) {
  console.log(`  ${T.dim(time)} ${message}`);
}

// Get correct date
const now = new Date();
const day = String(now.getDate()).padStart(2, "0");
const month = String(now.getMonth() + 1).padStart(2, "0");
const year = String(now.getFullYear()).slice(-2);
const dateStr = `${day}${month}${year}`;

// Show header
console.clear();
console.log("");
console.log(T.accent("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
console.log(T.accent("  ┃") + chalk.bold.white("  🧠 CODEMIND CODE WATCHER                                     ") + T.accent("┃"));
console.log(T.accent("  ┃") + T.dim("     Real-time AI code analysis & smart commits                ") + T.accent("┃"));
console.log(T.accent("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
console.log("");

// Project Overview
console.log(T.dim("  ─── Project ───────────────────────────────────────────────────────"));
console.log(`  📁 ${chalk.bold.white("my-awesome-project")} ${T.dim("v2.1.0")}`);
console.log(`     ${chalk.bgBlue.white(" React ")} ${chalk.bgBlue.white(" TS ")}`);
console.log("");
console.log(`  ${T.dim("Files")}     ${chalk.white("156")} ${T.success("■■■■■■■■")}${T.dim("□□")}`);
console.log(`  ${T.dim("Structure")} ${chalk.magenta("45")} components · ${chalk.blue("32")} utils · ${chalk.cyan("12")} hooks · ${chalk.green("28")} tests`);
console.log(`  ${T.dim("Tools")}     ${chalk.gray("◆ Jest  ◆ ESLint  ◆ Prettier  ◆ TypeScript")}`);
console.log("");

// Git Status
console.log(T.dim("  ─── Git ───────────────────────────────────────────────────────────"));
console.log(`  🔀 ${chalk.magenta("feature/new-dashboard")} ${T.warning("●")} ${T.warning("4 changes")}`);
console.log(T.dim("     3 modified, 1 new"));
console.log("");

// IDE Detection (simulated for demo)
console.log(T.dim("  ─── IDE ───────────────────────────────────────────────────────────"));
console.log(`  🤖 ${chalk.bold.white("Kiro")} ${chalk.bgMagenta.white(" AGENTIC ")} ${T.dim("95% confidence")}`);
console.log(T.success("     ✓ AI Collaboration enabled - will sync with Kiro's AI"));
console.log(T.dim("     Features: ai-native, specs, steering, hooks"));
console.log("");

// Session
console.log(T.dim("  ─── Session ───────────────────────────────────────────────────────"));
console.log(`  ${chalk.bgGreen.black(" AUTO-FIX ON ")} ${chalk.bgBlack.white(` ${THEME_NAME.toUpperCase()} `)} ${T.dim("Debounce: 1500ms")}`);
console.log("");

// Controls
console.log(T.dim("  ─── Controls ──────────────────────────────────────────────────────"));
console.log(`  ${T.accent("q")} ${T.dim("quit + summary")}    ${T.accent("Ctrl+C")} ${T.dim("quick exit")}    ${T.accent("npm start")} ${T.dim("settings")}`);
console.log("");
console.log(T.dim("  ═══════════════════════════════════════════════════════════════════"));
console.log("");

// Simulate events
const events = [
  { delay: 500, fn: () => log("14:30:01", T.accent("Starting file watcher...")) },
  { delay: 1500, fn: () => log("14:30:02", T.success("✓ Watcher ready! Monitoring 156 files")) },
  { delay: 2000, fn: () => log("14:30:02", T.success("Press 'q' for full summary + commit options (recommended)")) },
  { delay: 2500, fn: () => console.log("") },
  
  { delay: 3500, fn: () => log("14:30:05", T.accent("📝 File changed: src/components/Button.tsx")) },
  { delay: 4000, fn: () => log("14:30:06", T.accent("⏳ Analyzing: Button.tsx...")) },
  { delay: 5500, fn: () => {
    log("14:30:08", T.success("✓ Button.tsx - Clean component, no issues found (2.0s)"));
    console.log("");
  }},
  
  { delay: 6500, fn: () => log("14:30:10", T.accent("📝 File changed: src/utils/api.ts")) },
  { delay: 7000, fn: () => log("14:30:11", T.accent("⏳ Analyzing: api.ts...")) },
  { delay: 9000, fn: () => {
    log("14:30:13", T.warning("⚠ api.ts - Found 2 issue(s) (2.5s)"));
    console.log(`     🔒 ${T.warning("[HIGH]")} API key exposed in source code`);
    console.log(`     ⚡ ${chalk.white("[MEDIUM]")} Missing error handling`);
    console.log("");
  }},
  
  // User presses 'q' - show shutdown flow
  { delay: 11000, fn: () => {
    console.log("");
    log("14:30:20", T.dim("Stopping watcher..."));
    console.log("");
    
    // Session Summary
    console.log(T.accent("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
    console.log(T.accent("  ┃") + chalk.bold.white("  📊 SESSION COMPLETE                                          ") + T.accent("┃"));
    console.log(T.accent("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
    console.log("");
    console.log(`  ${chalk.magenta("⏱ 20s")}  ${T.success("2 analyzed")}  ${T.warning("2 issues")}  ${T.accent("0 fixed")}`);
    console.log("");
    console.log(T.dim("  Issues: ") + `🔒 ${T.warning("1")}  ⚡ ${chalk.white("1")}`);
    console.log("");
    console.log(T.accent("  Files:"));
    console.log(`     ${T.success("✓")} Button.tsx`);
    console.log(`     ${T.warning("⚠")} api.ts ${T.dim("(2 issues)")}`);
    console.log("");
  }},
  
  // Commit Assistant
  { delay: 12500, fn: () => {
    console.log(T.dim("  ═══════════════════════════════════════════════════════════════════"));
    console.log("");
    console.log(T.accent("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
    console.log(T.accent("  ┃") + chalk.bold.white("  📝 COMMIT ASSISTANT                                          ") + T.accent("┃"));
    console.log(T.accent("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
    console.log("");
    console.log(T.dim("  ─── Current Status ────────────────────────────────────────────────"));
    console.log(`  🔀 Branch: ${chalk.magenta("feature/new-dashboard")}`);
    console.log(`  📁 Changes: ${chalk.yellow("3")} modified, ${chalk.green("1")} new`);
    console.log("");
    console.log(T.accent("  Would you like to commit these changes?"));
    console.log("");
    console.log(`  ${T.accent("[1]")} ${chalk.bold("Yes, help me commit")} ${T.dim("(guided process)")}`);
    console.log(`  ${T.accent("[2]")} ${chalk.bold("Auto commit & push")} ${T.dim("(fully automatic)")}`);
    console.log(`  ${T.accent("[3]")} ${chalk.bold("Skip")} ${T.dim("(I'll do it later)")}`);
    console.log("");
    console.log(T.accent("  Your choice (1-3): ") + chalk.white("2"));
    console.log("");
  }},
  
  // Auto commit flow
  { delay: 14000, fn: () => {
    console.log(T.dim("  ─── Auto Commit & Push ────────────────────────────────────────────"));
    console.log("");
    console.log(T.accent("  🤖 Generating commit message..."));
  }},
  
  { delay: 15500, fn: () => {
    console.log(T.success(`  ✓ Message: "${dateStr} - Fix API security and update Button component"`));
    console.log("");
    console.log(T.dim("  Staging all changes..."));
    console.log(T.success("  ✓ Staged"));
    console.log(T.dim("  Committing..."));
    console.log(T.success("  ✓ Committed"));
    console.log(T.dim("  Pushing to remote..."));
    console.log(T.success("  ✓ Pushed"));
    console.log("");
    console.log(T.success("  ════════════════════════════════════════════════════════════════"));
    console.log(T.success("  ✓ AUTO COMMIT COMPLETE!"));
    console.log(T.success("  ════════════════════════════════════════════════════════════════"));
    console.log("");
  }},
  
  // Final menu
  { delay: 17000, fn: () => {
    console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
    console.log("");
    console.log(T.accent("  What's next?"));
    console.log("");
    console.log(`  ${T.accent("[1]")} Return to main menu`);
    console.log(`  ${T.accent("[2]")} Exit`);
    console.log("");
    console.log(T.accent("  Your choice (1-2): ") + chalk.white("2"));
    console.log("");
    console.log(T.accent("  ♥ Thanks for using CodeMind! Happy coding!"));
    console.log("");
    console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
    console.log(T.accent("  ♥ Demo complete!"));
    console.log(T.dim(`\n  Themes: ocean, forest, sunset, midnight, mono`));
    console.log(T.dim(`  Try: node scripts/dashboardDemo.js sunset\n`));
    process.exit(0);
  }},
];

for (const event of events) {
  setTimeout(event.fn, event.delay);
}
