#!/usr/bin/env node
// Dashboard Demo - Preview the file watcher output with new modern design
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

// Show new modern header
console.clear();
console.log("");
console.log(T.accent("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
console.log(T.accent("  ┃") + chalk.bold.white("  🤖 LETTA CODE WATCHER                                        ") + T.accent("┃"));
console.log(T.accent("  ┃") + T.dim("     Real-time AI code analysis & smart commits                ") + T.accent("┃"));
console.log(T.accent("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
console.log("");

// Project Overview - Simple clean layout without box alignment issues
console.log(T.dim("  ─── Project ───────────────────────────────────────────────────────"));
console.log(`  📁 ${chalk.bold.white("my-awesome-project")} ${T.dim("v2.1.0")}`);
console.log(`     ${chalk.bgBlue.white(" React ")} ${chalk.bgBlue.white(" TS ")}`);
console.log("");

// File stats with visual bar
const fileBar = `${T.success("■■■■■■■■")}${T.dim("□□")}`;
console.log(`  ${T.dim("Files")}    ${chalk.white("156")} ${fileBar}`);
console.log(`  ${T.dim("Structure")} ${chalk.magenta("45")} components · ${chalk.blue("32")} utils · ${chalk.cyan("12")} hooks · ${chalk.green("28")} tests`);
console.log(`  ${T.dim("Tools")}    ${chalk.gray("◆ Jest  ◆ ESLint  ◆ Prettier  ◆ TypeScript")}`);
console.log(`  ${T.dim("Scripts")}  ${T.accent("dev")} │ ${T.accent("build")} │ ${T.accent("test")} │ ${T.accent("lint")}`);
console.log("");

// Git Status - Compact
console.log(T.dim("  ─── Git ───────────────────────────────────────────────────────────"));
console.log(`  🔀 ${chalk.magenta("feature/new-dashboard")} ${T.warning("●")} ${T.warning("4 changes")}`);
console.log(T.dim("     3 modified, 1 new"));
console.log(T.dim(`     Last: ${chalk.gray("a1b2c3d")} Add user authentication (2 hours ago)`));
console.log("");

// Session Settings - Minimal badges
console.log(T.dim("  ─── Session ───────────────────────────────────────────────────────"));
console.log(`  ${chalk.bgGreen.black(" AUTO-FIX ON ")} ${chalk.bgBlack.white(` ${THEME_NAME.toUpperCase()} `)} ${T.dim("Debounce: 1500ms")}`);
console.log("");

// Controls - Single line
console.log(T.dim("  ─── Controls ──────────────────────────────────────────────────────"));
console.log(`  ${T.accent("q")} ${T.dim("quit + summary")}    ${T.accent("Ctrl+C")} ${T.dim("quick exit")}    ${T.accent("npm start")} ${T.dim("settings")}`);
console.log("");
console.log(T.dim("  ═══════════════════════════════════════════════════════════════════"));
console.log("");

// Simulate events
const events = [
  { delay: 500, fn: () => log("14:30:01", T.accent("Starting file watcher...")) },
  { delay: 1500, fn: () => log("14:30:02", T.success("✓ Watcher ready! Monitoring 156 files")) },
  { delay: 2000, fn: () => log("14:30:02", T.dim("Waiting for file changes...")) },
  { delay: 2200, fn: () => log("14:30:02", T.success("Press 'q' for full summary + commit options (recommended)")) },
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
    
    // Session Summary - Clean design
    console.log("");
    console.log(T.accent("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
    console.log(T.accent("  ┃") + chalk.bold.white("  📊 SESSION COMPLETE                                          ") + T.accent("┃"));
    console.log(T.accent("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
    console.log("");
    
    // Stats in a clean row
    console.log(`  ${chalk.magenta("⏱ 20s")}  ${T.success("3 analyzed")}  ${T.warning("2 issues")}  ${T.accent("0 fixed")}`);
    console.log("");
    
    // Issue breakdown
    console.log(T.dim("  Issues: ") + `🔒 ${T.warning("1")} security  ⚡ ${chalk.white("1")} perf`);
    console.log("");
    
    // Files
    console.log(T.accent("  Files:"));
    console.log(`     ${T.success("✓")} Button.tsx`);
    console.log(`     ${T.warning("⚠")} api.ts ${T.dim("(2 issues)")}`);
    console.log(`     ${T.success("✓")} useAuth.ts`);
    console.log("");
  }},
  
  { delay: 17000, fn: () => {
    console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
    console.log("");
    
    // Commit section
    console.log(T.accent("  📝 Commit Message:"));
    console.log("");
    console.log(chalk.bgBlack.white(`     ${dateStr} - Fix API security and add auth hook     `));
    console.log("");
    console.log(T.dim("  Quick command:"));
    console.log(T.accent(`  git add -A && git commit -m "${dateStr} - Fix API security and add auth hook"`));
    console.log("");
    
    console.log(T.dim("  ─────────────────────────────────────────────────────────────────"));
    console.log("");
    console.log(`  ${T.accent("[1]")} Menu  ${T.accent("[2]")} Commit now  ${T.accent("[3]")} Exit`);
    console.log("");
    console.log(T.accent("  ♥ Demo complete!"));
    console.log(T.dim(`\n  Themes: ocean, forest, sunset, midnight, mono`));
    console.log(T.dim(`  Try: node scripts/dashboardDemo.js sunset\n`));
    process.exit(0);
  }},
];

for (const event of events) {
  setTimeout(event.fn, event.delay);
}
