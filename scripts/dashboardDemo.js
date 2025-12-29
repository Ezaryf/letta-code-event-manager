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
  ║  🤖 LETTA CODING ASSISTANT - File Watcher Demo               ║
  ╚══════════════════════════════════════════════════════════════╝
`));
console.log(`  ${T.dim("Project:")}   ${chalk.bold("my-awesome-project")}`);
console.log(`  ${T.dim("Path:")}      /Users/dev/projects/my-awesome-project`);
console.log(`  ${T.dim("Framework:")} ${chalk.yellow("React")} / ${chalk.blue("TypeScript")}`);
console.log(`  ${T.dim("Files:")}     ${T.success("156")} total`);
console.log(`  ${T.dim("Auto-fix:")}  ${T.success("ON")}`);
console.log(`  ${T.dim("Theme:")}     ${T.accent(THEME_NAME)}`);
console.log("");
console.log(T.dim("  " + "─".repeat(60)));
console.log(T.dim("  Demo mode - simulating file watcher activity"));
console.log(T.dim("  " + "─".repeat(60)));
console.log("");

// Simulate events
const events = [
  { delay: 500, fn: () => log("14:30:01", T.accent("Starting file watcher...")) },
  { delay: 1500, fn: () => log("14:30:02", T.success("✓ Watcher ready! Monitoring 156 files")) },
  { delay: 2000, fn: () => log("14:30:02", T.dim("Waiting for file changes... (edit a file to trigger analysis)")) },
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
    log("14:30:18", T.warning("⚠ useAuth.ts - Found 1 issue(s) (2.0s)"));
    console.log(`     🐛 ${T.dim("[LOW]")} Missing dependency in useEffect`);
    console.log(T.dim("        Line 42"));
    console.log("");
  }},
  
  { delay: 16000, fn: () => {
    console.log("");
    log("14:30:20", T.dim("Stopping watcher..."));
    
    console.log(T.accent(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                    📊 SESSION SUMMARY                        ║
  ╚══════════════════════════════════════════════════════════════╝
`));
    console.log(`  ${T.dim("Duration:")}    ${chalk.magenta("0m 20s")}`);
    console.log(`  ${T.dim("Analyzed:")}    ${T.success("3")} files`);
    console.log(`  ${T.dim("Issues:")}      ${T.warning("3")}`);
    console.log(`  ${T.dim("Fixed:")}       ${T.accent("0")}`);
    console.log(`  ${T.dim("Skipped:")}     ${T.dim("0")}`);
    console.log("");
    console.log(T.dim("  Issue Breakdown:"));
    console.log(`     🐛 Bugs: 1  🔒 Security: 1  ⚡ Perf: 1  💅 Style: 0`);
    console.log(`     ${T.error("Critical:")} 0  ${T.warning("High:")} 1  Medium: 1  ${T.dim("Low:")} 1`);
    console.log("");
    console.log(T.accent(`  📁 Files Analyzed (3):`));
    console.log(`     ${T.success("✓")} Button.tsx`);
    console.log(`     ${T.warning("⚠")} api.ts ${T.warning("(2 issues)")}`);
    console.log(`     ${T.warning("⚠")} useAuth.ts ${T.warning("(1 issues)")}`);
    console.log("");
    console.log(T.warning(`  ⚠ Issues Found (3):`));
    console.log(`     🔒 ${T.dim("api.ts:")} API key exposed in source code`);
    console.log(`     ⚡ ${T.dim("api.ts:")} Missing error handling in fetch call`);
    console.log(`     🐛 ${T.dim("useAuth.ts:")} Missing dependency in useEffect`);
    console.log("");
  }},
  
  { delay: 17000, fn: () => {
    console.log(T.dim("  " + "─".repeat(60)));
    console.log("");
    console.log(T.accent("  📝 Generating commit message..."));
    console.log("");
    console.log(T.success("  ✓ Suggested commit message:"));
    console.log("");
    console.log(chalk.bold.white(`     "${dateStr} - Fix security issue and add auth hook"`));
    console.log("");
    console.log(T.dim("  To commit your changes, run:"));
    console.log("");
    console.log(T.accent(`     git add -A && git commit -m "${dateStr} - Fix security issue and add auth hook"`));
    console.log("");
    console.log(T.dim(`  (Message saved to .commit_msg)`));
    console.log("");
    console.log(T.dim("  " + "─".repeat(60)));
    console.log("");
    console.log(`  ${T.accent("[1]")} Return to main menu`);
    console.log(`  ${T.accent("[2]")} Exit`);
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
