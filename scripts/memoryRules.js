// C. Strong Memory Rules System
// Global best practices, per-project rules, auto-remember filters
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";

dotenv.config();

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

const agentId = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;

const MEMORY_DIR = "memory";
const GLOBAL_RULES_FILE = path.join(MEMORY_DIR, "global_rules.json");
const PROJECT_RULES_FILE = path.join(MEMORY_DIR, "project_rules.json");
const AUTO_REMEMBER_PATTERNS = path.join(MEMORY_DIR, "auto_remember_patterns.json");

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

// Initialize files if they don't exist
function initFile(filepath, defaultContent) {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(defaultContent, null, 2), "utf8");
  }
}

initFile(GLOBAL_RULES_FILE, {
  coding_style: [],
  security: [],
  testing: [],
  git: [],
  general: [],
});

initFile(PROJECT_RULES_FILE, {});

initFile(AUTO_REMEMBER_PATTERNS, [
  { pattern: "^Best practice:", category: "general" },
  { pattern: "^Rule:", category: "coding_style" },
  { pattern: "^Security:", category: "security" },
  { pattern: "^Always:", category: "general" },
  { pattern: "^Never:", category: "security" },
  { pattern: "^Remember:", category: "general" },
]);

// Load functions
function loadGlobalRules() {
  return JSON.parse(fs.readFileSync(GLOBAL_RULES_FILE, "utf8"));
}

function loadProjectRules(projectName) {
  const rules = JSON.parse(fs.readFileSync(PROJECT_RULES_FILE, "utf8"));
  return rules[projectName] || [];
}

function loadAutoRememberPatterns() {
  return JSON.parse(fs.readFileSync(AUTO_REMEMBER_PATTERNS, "utf8"));
}

// Save functions
function saveGlobalRules(rules) {
  fs.writeFileSync(GLOBAL_RULES_FILE, JSON.stringify(rules, null, 2), "utf8");
}

function saveProjectRules(projectName, rules) {
  const allRules = JSON.parse(fs.readFileSync(PROJECT_RULES_FILE, "utf8"));
  allRules[projectName] = rules;
  fs.writeFileSync(PROJECT_RULES_FILE, JSON.stringify(allRules, null, 2), "utf8");
}

// Add a global rule
export function addGlobalRule(category, rule) {
  const rules = loadGlobalRules();
  if (!rules[category]) {
    rules[category] = [];
  }
  if (!rules[category].includes(rule)) {
    rules[category].push(rule);
    saveGlobalRules(rules);
    console.log(`✅ Added global rule to [${category}]: ${rule}`);
  } else {
    console.log(`ℹ️ Rule already exists in [${category}]`);
  }
}

// Add a project-specific rule
export function addProjectRule(projectName, rule) {
  const rules = loadProjectRules(projectName);
  if (!rules.includes(rule)) {
    rules.push(rule);
    saveProjectRules(projectName, rules);
    console.log(`✅ Added project rule for [${projectName}]: ${rule}`);
  }
}

// Auto-remember: scan text for patterns and extract rules
export function autoRemember(text, projectName = null) {
  const patterns = loadAutoRememberPatterns();
  const extracted = [];

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    for (const { pattern, category } of patterns) {
      if (new RegExp(pattern, "i").test(trimmed)) {
        const rule = trimmed.replace(new RegExp(pattern, "i"), "").trim();
        if (rule.length > 10) {
          extracted.push({ rule, category });
          addGlobalRule(category, rule);
        }
      }
    }
  }

  return extracted;
}

// Get all rules for context injection
export function getAllRulesForContext(projectName = null) {
  const global = loadGlobalRules();
  const project = projectName ? loadProjectRules(projectName) : [];

  let context = "## Coding Rules & Best Practices\n\n";

  for (const [category, rules] of Object.entries(global)) {
    if (rules.length > 0) {
      context += `### ${category.replace("_", " ").toUpperCase()}\n`;
      rules.forEach((r) => (context += `- ${r}\n`));
      context += "\n";
    }
  }

  if (project.length > 0) {
    context += `### PROJECT-SPECIFIC (${projectName})\n`;
    project.forEach((r) => (context += `- ${r}\n`));
  }

  return context;
}

// Sync rules to Letta agent memory
export async function syncToAgent() {
  if (!agentId) {
    console.error("No agent ID found");
    return;
  }

  const rulesContext = getAllRulesForContext();
  
  const response = await client.agents.messages.create(agentId, {
    input: `/remember ${rulesContext}`,
  });

  console.log("✅ Rules synced to agent memory");
  return response;
}

// CLI
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
  case "add-global":
    if (arg1 && arg2) {
      addGlobalRule(arg1, arg2);
    } else {
      console.log("Usage: node scripts/memoryRules.js add-global <category> <rule>");
    }
    break;

  case "add-project":
    if (arg1 && arg2) {
      addProjectRule(arg1, arg2);
    } else {
      console.log("Usage: node scripts/memoryRules.js add-project <project_name> <rule>");
    }
    break;

  case "show":
    console.log(getAllRulesForContext(arg1));
    break;

  case "sync":
    syncToAgent().catch(console.error);
    break;

  case "auto-scan":
    if (arg1 && fs.existsSync(arg1)) {
      const text = fs.readFileSync(arg1, "utf8");
      const extracted = autoRemember(text, arg2);
      console.log(`Extracted ${extracted.length} rules`);
    } else {
      console.log("Usage: node scripts/memoryRules.js auto-scan <file> [project_name]");
    }
    break;

  default:
    console.log("Memory Rules System");
    console.log("Commands:");
    console.log("  add-global <category> <rule>  - Add a global rule");
    console.log("  add-project <name> <rule>     - Add project-specific rule");
    console.log("  show [project_name]           - Show all rules");
    console.log("  sync                          - Sync rules to Letta agent");
    console.log("  auto-scan <file> [project]    - Extract rules from text file");
    console.log("\nCategories: coding_style, security, testing, git, general");
}
