#!/usr/bin/env node
// Dashboard Demo - Preview the file watcher output
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
console.log(T.accent(`
  ╔══════════════════════════════════════════════════════════════╗
  ║  🤖 LETTA CODING ASSISTANT - File Watcher                    ║
  ╚══════════════════════════════════════════════════════════════╝
`));

// Project Info Section
console.log(T.accent("  ┌─ Project Info ─────────────────────────────────────────────┐"));
console.log(`  │ ${T.dim("Project:")}   ${chalk.bold("my-awesome-project").padEnd(45)}│`);
console.log(`  │ ${T.dim("Path:")}      /Users/dev/projects/my-awesome-project${" ".repeat(8)}│`);
console.log(`  │ ${T.dim("Framework:")} ${chalk.yellow("React")} / ${chalk.blue("TypeScript")}${" ".repeat(30)}│`);
console.log(`  │ ${T.dim("Files:")}     ${T.success("156")} total (45 components, 32 utils, 28 tests)${" ".repeat(3)}│`);
console.log(T.accent("  └──────────────────────────────────────────────────────────────┘"));
console.log("");

// Git Info Section
console.log(T.accent("  ┌─ Git Status ───────────────────────────────────────────────┐"));
console.log(`  │ ${T.dim("Branch:")}    ${chalk.magenta("feature/new-dashboard").padEnd(45)}│`);
console.log(`  │ ${T.dim("Changes:")}   ${T.warning("3 modified, 1 new, 0 deleted")}${" ".repeat(17)}│`);
console.log(T.accent("  └──────────────────────────────────────────────────────────────┘"));
console.log("");

// Settings Section
console.log(T.accent("  ┌─ Current Settings ─────────────────────────────────────────┐"));
console.log(`  │ ${T.dim("Auto-fix:")}  ${T.success("ON - will auto-apply fixes")}${" ".repeat(18)}│`);
console.log(`  │ ${T.dim("Theme:")}     ${T.accent(THEME_NAME)}${" ".repeat(Math.max(0, 45 - THEME_NAME.length))}│`);
console.log(`  │ ${T.dim("Debounce:")}  1500ms${" ".repeat(39)}│`);
console.log(`  │ ${T.dim("Confidence:")} 70% minimum for auto-fix${" ".repeat(25)}│`);
console.log(T.accent("  └──────────────────────────────────────────────────────────────┘"));
console.log("");

// Instructions
console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
console.log(T.dim("  📝 Edit any file to trigger analysis"));
console.log(T.warning("  🛑 Press 'q' to stop → see session summary → commit options"));
console.log(T.dim("  ⚙️  Change settings: npm start → Settings"));
console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
console.log("");

// Simulate events
const events = [
  { delay: 500, fn: () => log("14:30:01", T.accent("Starting file watcher...")) },
  { delay: 1500, fn: () => log("14:30:02", T.success("✓ Watcher ready! Monitoring 156 files")) },
  { delay: 2000, fn: () => log("14:30:02", T.dim("Waiting for file changes... (edit a file to trigger analysis)")) },
  { delay: 2200, fn: () => log("14:30:02", T.dim("Press 'q' to stop and see session summary + commit options")) },
  { delay: 2500, fn: () => console.log("") },
  
  { delay: 3500, fn: () => log("14:30:05", T.accent("📝 File changed: src/components/Button.tsx")) },
  { delay: 4000, fn: () => log("14:30:06", T.accent("⏳ Analyzing: Button.tsx...")) },
  { delay: 6000, fn: () => {
    log("14:30:08", T.success("✓ Button.tsx - Clean component, no issues found (2.0s)"));
    console.log("");
  }},
  
  { delay: 7500, fn: () => log("14:30:10", T.accent("📝 File changed: src/utils/api.ts")) },
  { delay: 8000, fn: () => log("14:30:11", T.accent("⏳ Analyzing: api.ts...")) },
  { delay: 10500, fn: () => {
    log("14:30:13", T.warning("⚠ api.ts - Found 2 issue(s) (2.5s)"));
    console.log(`     🔒 ${T.warning("[HIGH]")} API key exposed in source code`);
    console.log(T.dim("        Line 15"));
    console.log(`     ⚡ ${chalk.white("[MEDIUM]")} Missing error handling in fetch call`);
    console.log(T.dim("        Line 28"));
    console.log("");
  }},
  
  { delay: 12000, fn: () => log("14:30:15", T.success("➕ File added: src/hooks/useAuth.ts")) },
  { delay: 12500, fn: () => log("14:30:16", T.accent("⏳ Analyzing: useAuth.ts...")) },
  { delay: 14500, fn: () => {
    log("14:30:18", T.success("✓ useAuth.ts - Looks good! (2.0s)"));
    console.log("");
  }},
  
  { delay: 16000, fn: () => {
    console.log("");
    log("14:30:20", T.dim("Stopping watcher..."));
    
    // Session Summary
    console.log(T.accent(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                    📊 SESSION SUMMARY                        ║
  ╚══════════════════════════════════════════════════════════════╝
`));
    console.log(`  ${T.dim("Duration:")}    ${chalk.magenta("0m 20s")}`);
    console.log(`  ${T.dim("Analyzed:")}    ${T.success("3")} files`);
    console.log(`  ${T.dim("Issues:")}      ${T.warning("2")}`);
    console.log(`  ${T.dim("Fixed:")}       ${T.accent("0")}`);
    console.log(`  ${T.dim("Skipped:")}     ${T.dim("0")}`);
    console.log("");
    console.log(T.dim("  Issue Breakdown:"));
    console.log(`     🐛 Bugs: 0  🔒 Security: 1  ⚡ Perf: 1  💅 Style: 0`);
    console.log(`     ${T.error("Critical:")} 0  ${T.warning("High:")} 1  Medium: 1  ${T.dim("Low:")} 0`);
    console.log("");
    console.log(T.accent(`  📁 Files Analyzed (3):`));
    console.log(`     ${T.success("✓")} Button.tsx`);
    console.log(`     ${T.warning("⚠")} api.ts ${T.warning("(2 issues)")}`);
    console.log(`     ${T.success("✓")} useAuth.ts`);
    console.log("");
    console.log(T.warning(`  ⚠ Issues Found (2):`));
    console.log(`     🔒 ${T.dim("api.ts:")} API key exposed in source code`);
    console.log(`     ⚡ ${T.dim("api.ts:")} Missing error handling in fetch call`);
    console.log("");
  }},
  
  { delay: 17000, fn: () => {
    console.log(T.dim("  " + "─".repeat(60)));
    console.log("");
    
    // Git status
    console.log(T.accent("  📊 Git Status:"));
    console.log(`     Branch: ${chalk.magenta("feature/new-dashboard")}`);
    console.log(`     ${T.warning("4 uncommitted changes")}`);
    console.log("");
    
    console.log(T.accent("  📝 Generating commit message..."));
    console.log("");
    console.log(T.success("  ✓ Suggested commit message:"));
    console.log("");
    console.log(chalk.bgBlack.white(`     ${dateStr} - Fix API security and add auth hook     `));
    console.log("");
    console.log(T.dim(`  (Saved to .commit_msg)`));
    console.log("");
    console.log(T.accent("  📋 Quick Commands:"));
    console.log("");
    console.log(T.dim("  Stage all & commit:"));
    console.log(T.accent(`     git add -A && git commit -m "${dateStr} - Fix API security and add auth hook"`));
    console.log("");
    console.log(T.dim("  Stage, commit & push:"));
    console.log(T.accent(`     git add -A && git commit -m "${dateStr} - Fix API security and add auth hook" && git push`));
    console.log("");
    console.log(T.dim("  " + "─".repeat(60)));
    console.log("");
    console.log(T.accent("  What would you like to do next?"));
    console.log("");
    console.log(`  ${T.accent("[1]")} Return to main menu`);
    console.log(`  ${T.accent("[2]")} Run git commit now (opens prompt)`);
    console.log(`  ${T.accent("[3]")} Exit`);
    console.log("");
    console.log(T.accent("  ♥ Demo complete!"));
    console.log(T.dim(`\n  Available themes: ocean, forest, sunset, midnight, mono`));
    console.log(T.dim(`  Try: node scripts/dashboardDemo.js sunset\n`));
    process.exit(0);
  }},
];

for (const event of events) {
  setTimeout(event.fn, event.delay);
}
