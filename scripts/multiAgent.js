// Multi-Agent Architecture with Tool Broker
// Based on audit recommendations for clean agent separation
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";

dotenv.config();

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

// Agent role definitions with optimized prompts
const AGENT_ROLES = {
  router: {
    name: "EchoHarbor-Router",
    persona: "You are the Router agent. Analyze incoming requests and determine which specialist agent should handle them. Respond with JSON: {\"route_to\": \"agent_name\", \"reason\": \"why\"}",
    goal: "Route requests to appropriate specialist agents",
  },
  planner: {
    name: "EchoHarbor-Planner", 
    persona: "You are the Planner agent. Break complex tasks into sequential steps. Respond with JSON: {\"steps\": [{\"action\": \"...\", \"agent\": \"...\"}], \"dependencies\": []}",
    goal: "Decompose tasks into actionable steps",
  },
  executor: {
    name: "EchoHarbor-Executor",
    persona: "You are the Executor agent. Carry out planned actions using available tools. Focus on one step at a time. Report results clearly.",
    goal: "Execute planned actions",
  },
  fixer: {
    name: "EchoHarbor-Fixer",
    persona: "You are the Fixer agent. Analyze errors and bugs, then provide minimal safe fixes. Always output structured JSON with diagnosis, root_cause, and fix_steps.",
    goal: "Fix bugs with minimal safe changes",
  },
  reviewer: {
    name: "EchoHarbor-Reviewer",
    persona: "You are the Reviewer agent. Check code quality, security, and best practices. Be constructive but thorough. Flag risks clearly.",
    goal: "Review code for quality and security",
  },
  memory_steward: {
    name: "EchoHarbor-Memory",
    persona: "You are the Memory Steward. Manage memory blocks, extract learnings from conversations, and maintain project knowledge. Store important patterns and rules.",
    goal: "Manage persistent memory and knowledge",
  },
};

// Event to agent routing rules
const ROUTING_RULES = {
  test_failure: ["fixer", "reviewer"],
  runtime_error: ["fixer"],
  lint_error: ["fixer"],
  code_review: ["reviewer"],
  refactor_request: ["planner", "executor", "reviewer"],
  complex_task: ["planner", "executor"],
  memory_update: ["memory_steward"],
  general: ["router"],
};

// Store for created agent IDs
const AGENTS_FILE = ".letta_agents.json";

function loadAgents() {
  if (fs.existsSync(AGENTS_FILE)) {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, "utf8"));
  }
  return {};
}

function saveAgents(agents) {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf8");
}

async function createAgent(role) {
  const config = AGENT_ROLES[role];
  if (!config) throw new Error(`Unknown role: ${role}`);

  console.log(`   Creating ${config.name}...`);
  
  const agent = await client.agents.create({
    name: config.name,
    model: "openai/gpt-4o-mini",
    embedding: "openai/text-embedding-ada-002",
    memory_blocks: [
      {
        label: "persona",
        description: "Agent role and behavior",
        value: config.persona,
      },
      {
        label: "goal",
        description: "Primary objective",
        value: config.goal,
      },
    ],
  });

  return agent.id;
}

async function getOrCreateAgent(role) {
  const agents = loadAgents();
  
  if (agents[role]) {
    return agents[role];
  }
  
  const agentId = await createAgent(role);
  agents[role] = agentId;
  saveAgents(agents);
  
  return agentId;
}

async function sendToAgent(role, message) {
  const agentId = await getOrCreateAgent(role);
  
  console.log(`\n🤖 [${role.toUpperCase()}]`);
  
  const response = await client.agents.messages.create(agentId, { input: message });
  const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
  
  return { role, agentId, response: text };
}

// Route event to appropriate agents
export function routeEvent(eventType) {
  return ROUTING_RULES[eventType] || ROUTING_RULES.general;
}

// Orchestrate multi-agent workflow
export async function orchestrate(eventType, content) {
  const roles = routeEvent(eventType);
  
  console.log(`\n📨 Event: ${eventType}`);
  console.log(`   Routing to: ${roles.join(" → ")}`);
  
  const results = [];
  let context = content;
  
  // Sequential orchestration with context passing
  for (const role of roles) {
    const enrichedMessage = roles.length > 1 
      ? `Previous context:\n${context}\n\nYour task as ${role}:\n${content}`
      : content;
    
    const result = await sendToAgent(role, enrichedMessage);
    results.push(result);
    
    console.log(`   Response: ${result.response.slice(0, 200)}...`);
    
    // Pass context to next agent
    context += `\n\n[${role}]: ${result.response}`;
  }
  
  // Extract learnings via memory steward
  if (!roles.includes("memory_steward") && results.length > 0) {
    const learnings = await sendToAgent(
      "memory_steward",
      `Extract any best practices or rules to remember from this conversation:\n${context}`
    );
    results.push(learnings);
  }
  
  return results;
}

// Simple single-agent call
export async function callAgent(role, message) {
  return sendToAgent(role, message);
}

// CLI interface
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
  case "create-all":
    console.log("🔧 Creating all specialist agents...\n");
    (async () => {
      for (const role of Object.keys(AGENT_ROLES)) {
        await getOrCreateAgent(role);
        console.log(`   ✅ ${role}`);
      }
      console.log("\n✅ All agents created!");
      console.log("   Config saved to:", AGENTS_FILE);
    })();
    break;

  case "list":
    console.log("Available roles:", Object.keys(AGENT_ROLES).join(", "));
    console.log("Event types:", Object.keys(ROUTING_RULES).join(", "));
    const existing = loadAgents();
    console.log("Created agents:", Object.keys(existing).join(", ") || "none");
    break;

  case "call":
    if (arg1 && arg2) {
      const content = fs.existsSync(arg2) ? fs.readFileSync(arg2, "utf8") : arg2;
      callAgent(arg1, content).then(r => console.log(r.response)).catch(console.error);
    } else {
      console.log("Usage: node scripts/multiAgent.js call <role> <message|file>");
    }
    break;

  case "orchestrate":
    if (arg1 && arg2) {
      const content = fs.existsSync(arg2) ? fs.readFileSync(arg2, "utf8") : arg2;
      orchestrate(arg1, content).catch(console.error);
    } else {
      console.log("Usage: node scripts/multiAgent.js orchestrate <event_type> <content|file>");
    }
    break;

  default:
    console.log("Multi-Agent System");
    console.log("==================");
    console.log("Commands:");
    console.log("  create-all                    Create all specialist agents");
    console.log("  list                          Show available roles and events");
    console.log("  call <role> <message>         Call a specific agent");
    console.log("  orchestrate <event> <content> Run multi-agent workflow");
    console.log("");
    console.log("Roles:", Object.keys(AGENT_ROLES).join(", "));
    console.log("Events:", Object.keys(ROUTING_RULES).join(", "));
}
