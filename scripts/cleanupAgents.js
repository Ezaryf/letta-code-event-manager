// Cleanup old/unused Letta agents
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";

dotenv.config();

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

// Get current active agent ID
const CURRENT_AGENT = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;

async function listAllAgents() {
  try {
    const agents = await client.agents.list();
    return agents || [];
  } catch (err) {
    console.error("Failed to list agents:", err.message);
    return [];
  }
}

async function cleanup() {
  console.log("🧹 Letta Agent Cleanup\n");
  
  if (!CURRENT_AGENT) {
    console.log("⚠️ No active agent found (.letta_agent_id missing)");
    console.log("   Run: npm run setup first\n");
  } else {
    console.log(`✅ Current active agent: ${CURRENT_AGENT}\n`);
  }
  
  const agents = await listAllAgents();
  
  if (agents.length === 0) {
    console.log("No agents found in your Letta account.");
    return;
  }
  
  console.log(`Found ${agents.length} agent(s):\n`);
  
  const toDelete = [];
  
  for (const agent of agents) {
    const isCurrent = agent.id === CURRENT_AGENT;
    const status = isCurrent ? "✅ KEEP (active)" : "🗑️ DELETE";
    console.log(`   ${status}: ${agent.name || "Unnamed"} (${agent.id})`);
    
    if (!isCurrent) {
      toDelete.push(agent);
    }
  }
  
  if (toDelete.length === 0) {
    console.log("\n✅ No agents to delete. All clean!");
    return;
  }
  
  if (!process.argv.includes("--confirm")) {
    console.log(`\n⚠️ ${toDelete.length} agent(s) will be deleted.`);
    console.log("   To confirm, run: npm run cleanup -- --confirm");
    return;
  }
  
  console.log(`\n🗑️ Deleting ${toDelete.length} agent(s)...\n`);
  
  for (const agent of toDelete) {
    try {
      await client.agents.delete(agent.id);
      console.log(`   ✅ Deleted: ${agent.name || agent.id}`);
    } catch (err) {
      console.log(`   ❌ Failed: ${agent.name || agent.id} - ${err.message}`);
    }
  }
  
  console.log("\n✅ Cleanup complete!");
}

cleanup().catch(console.error);
