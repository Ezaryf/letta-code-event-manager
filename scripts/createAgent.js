#!/usr/bin/env node
// Create CodeMind agent from template with version tracking
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Paths
const TEMPLATE_PATH = path.join(ROOT, "templates/agent/code_agent.json");
const AGENT_ID_FILE = path.join(ROOT, ".codemind_agent_id");
const AGENT_CONFIG_FILE = path.join(ROOT, ".codemind_agent_config.json");

// CLI flags
const FORCE_RECREATE = process.argv.includes("--force");
const UPGRADE = process.argv.includes("--upgrade");
const SHOW_HELP = process.argv.includes("--help") || process.argv.includes("-h");

if (SHOW_HELP) {
  console.log(`
CodeMind Agent Setup
====================

Usage:
  npm run setup              Create agent from template (if none exists)
  npm run setup -- --force   Delete existing agent and create new one
  npm run setup -- --upgrade Upgrade existing agent to latest template version

The agent is created from: templates/agent/code_agent.json
You can customize this template for your needs.
`);
  process.exit(0);
}

// Load and validate template
function loadTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error("❌ Agent template not found:", TEMPLATE_PATH);
    console.error("   Please ensure templates/agent/code_agent.json exists");
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
    const template = JSON.parse(content);
    
    // Validate required fields
    const required = ["version", "name", "system_prompt", "memory_blocks"];
    for (const field of required) {
      if (!template[field]) {
        console.error(`❌ Template missing required field: ${field}`);
        process.exit(1);
      }
    }
    
    return template;
  } catch (err) {
    console.error("❌ Failed to parse template:", err.message);
    process.exit(1);
  }
}

// Load existing agent config
function loadExistingConfig() {
  if (!fs.existsSync(AGENT_CONFIG_FILE)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(AGENT_CONFIG_FILE, "utf8"));
  } catch {
    return null;
  }
}

// Compare versions (returns: -1 if a < b, 0 if equal, 1 if a > b)
function compareVersions(a, b) {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (partsA[i] > partsB[i]) return 1;
    if (partsA[i] < partsB[i]) return -1;
  }
  return 0;
}

// Delete existing agent
async function deleteAgent(client, agentId) {
  try {
    await client.agents.delete(agentId);
    console.log("   Deleted old agent:", agentId.slice(0, 20) + "...");
    return true;
  } catch (err) {
    console.warn("   Warning: Could not delete old agent:", err.message);
    return false;
  }
}

// Create agent from template
async function createAgent(client, template) {
  const agent = await client.agents.create({
    name: template.name,
    model: template.model || "openai/gpt-4o-mini",
    embedding: template.embedding || "openai/text-embedding-ada-002",
    system: template.system_prompt,
    memory_blocks: template.memory_blocks,
  });
  
  return agent;
}

// Save agent configuration
function saveAgentConfig(agent, template) {
  // Save agent ID
  fs.writeFileSync(AGENT_ID_FILE, agent.id, "utf8");
  
  // Save full config
  const config = {
    id: agent.id,
    name: template.name,
    template_version: template.version,
    created: new Date().toISOString(),
    model: template.model || "openai/gpt-4o-mini",
    memory_blocks: template.memory_blocks.map(b => b.label),
    metadata: template.metadata || {},
  };
  
  fs.writeFileSync(AGENT_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  
  return config;
}

async function main() {
  // Check API key
  const apiKey = process.env.LETTA_API_KEY;
  const projectID = process.env.LETTA_PROJECT_ID || undefined;

  if (!apiKey || apiKey === "sk-let-your-api-key-here") {
    console.error("❌ LETTA_API_KEY not configured");
    console.error("   Run: npm start → Configure API Key");
    console.error("   Or edit .env file directly");
    process.exit(1);
  }

  const client = new Letta({ apiKey, projectID });
  const template = loadTemplate();
  const existingConfig = loadExistingConfig();
  
  console.log(`\n🧠 CodeMind Agent Setup`);
  console.log(`   Template: ${template.name} v${template.version}`);
  console.log("");

  // Check if agent already exists
  if (existingConfig && fs.existsSync(AGENT_ID_FILE)) {
    const currentVersion = existingConfig.template_version || "0.0.0";
    const templateVersion = template.version;
    const needsUpgrade = compareVersions(templateVersion, currentVersion) > 0;
    
    console.log(`   Existing agent: ${existingConfig.name} v${currentVersion}`);
    console.log(`   Agent ID: ${existingConfig.id.slice(0, 20)}...`);
    
    if (FORCE_RECREATE) {
      console.log("\n   --force flag: Recreating agent...\n");
      await deleteAgent(client, existingConfig.id);
    } else if (UPGRADE && needsUpgrade) {
      console.log(`\n   Upgrading from v${currentVersion} to v${templateVersion}...\n`);
      await deleteAgent(client, existingConfig.id);
    } else if (needsUpgrade) {
      console.log(`\n   ⚠️  New template version available: v${templateVersion}`);
      console.log(`   Run: npm run setup -- --upgrade`);
      console.log(`\n   Current agent is still functional.\n`);
      process.exit(0);
    } else {
      console.log(`\n   ✓ Agent is up to date (v${currentVersion})`);
      console.log(`   Use --force to recreate anyway.\n`);
      process.exit(0);
    }
  }

  // Create new agent
  try {
    console.log("   Creating agent from template...");
    
    const agent = await createAgent(client, template);
    const config = saveAgentConfig(agent, template);
    
    console.log("");
    console.log("   ✅ Agent created successfully!");
    console.log(`   Name: ${config.name}`);
    console.log(`   ID: ${config.id}`);
    console.log(`   Version: ${config.template_version}`);
    console.log(`   Model: ${config.model}`);
    console.log(`   Memory: ${config.memory_blocks.join(", ")}`);
    console.log("");
    console.log("   Config saved to: .codemind_agent_config.json");
    console.log("");
    
  } catch (err) {
    console.error("\n   ❌ Failed to create agent:", err.message);
    
    if (err.message.includes("401") || err.message.includes("unauthorized")) {
      console.error("   Check your CODEMIND_API_KEY in .env");
    } else if (err.message.includes("model")) {
      console.error("   The model specified in the template may not be available");
    }
    
    process.exit(1);
  }
}

main();
