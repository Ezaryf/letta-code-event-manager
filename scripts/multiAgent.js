// B. Multi-Agent System
// Routes events to specialized agents: reviewer, fixer, architect, memory curator
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";

dotenv.config();

const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
  projectID: process.env.LETTA_PROJECT_ID,
});

// Agent role definitions
const AGENT_ROLES = {
  reviewer: {
    persona: "You are a code reviewer. Focus on: code quality, potential bugs, security issues, and best practices. Be constructive but thorough.",
    goal: "Review code and identify issues",
  },
  fixer: {
    persona: "You are a bug fixer. Focus on: minimal changes, safe fixes, clear explanations. Always produce unified diff patches.",
    goal: "Fix bugs with minimal safe changes",
  },
  architect: {
    persona: "You are a software architect. Focus on: system design, patterns, scalability, maintainability. Suggest structural improvements.",
    goal: "Improve code architecture",
  },
  curator: {
    persona: "You are a memory curator. Focus on: extracting best practices, coding rules, and project patterns from conversations. Store important learnings.",
    goal: "Curate and organize project knowledge",
  },
};

// Event to agent routing
const EVENT_ROUTING = {
  test_failure: ["fixer", "reviewer"],
  lint_error: ["fixer"],
  runtime_error: ["fixer", "architect"],
  refactor_request: ["architect", "reviewer"],
  code_review: ["reviewer"],
  memory_update: ["curator"],
  ci_failure: ["fixer", "reviewer"],
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

  console.log(`Creating ${role} agent...`);
  
  const agent = await client.agents.create({
    model: "openai/gpt-4o-mini",
    embedding: "openai/text-embedding-ada-002",
    memory_blocks: [
      {
        label: "persona",
        description: `Agent role: ${role}`,
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
  
  console.log(`\n🤖 [${role.toUpperCase()}] Processing...`);
  
  const response = await client.agents.messages.create(agentId, { input: message });
  const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
  
  return { role, response: text };
}

export async function routeEvent(eventType, content) {
  const roles = EVENT_ROUTING[eventType] || ["fixer"];
  
  console.log(`\n📨 Event: ${eventType}`);
  console.log(`   Routing to: ${roles.join(", ")}`);
  
  const results = [];
  
  for (const role of roles) {
    const result = await sendToAgent(role, content);
    results.push(result);
    console.log(`\n--- ${role.toUpperCase()} Response ---`);
    console.log(result.response);
  }
  
  return results;
}

export async function orchestrate(eventType, content) {
  // Sequential orchestration with context passing
  const roles = EVENT_ROUTING[eventType] || ["fixer"];
  let context = content;
  const results = [];
  
  for (const role of roles) {
    const enrichedMessage = `Previous context:\n${context}\n\nYour task as ${role}:\n${content}`;
    const result = await sendToAgent(role, enrichedMessage);
    results.push(result);
    context += `\n\n[${role}]: ${result.response}`;
  }
  
  // Always end with curator to extract learnings
  if (!roles.includes("curator")) {
    const curatorResult = await sendToAgent(
      "curator",
      `Review this conversation and extract any best practices or rules to remember:\n${context}`
    );
    results.push(curatorResult);
  }
  
  return results;
}

// CLI usage
const eventType = process.argv[2];
const contentFile = process.argv[3];

if (eventType && contentFile && fs.existsSync(contentFile)) {
  const content = fs.readFileSync(contentFile, "utf8");
  orchestrate(eventType, content).catch(console.error);
} else if (eventType === "list") {
  console.log("Available roles:", Object.keys(AGENT_ROLES).join(", "));
  console.log("Event types:", Object.keys(EVENT_ROUTING).join(", "));
} else if (eventType === "create-all") {
  (async () => {
    for (const role of Object.keys(AGENT_ROLES)) {
      await getOrCreateAgent(role);
    }
    console.log("All agents created:", loadAgents());
  })();
} else {
  console.log("Usage:");
  console.log("  node scripts/multiAgent.js <event_type> <content_file>");
  console.log("  node scripts/multiAgent.js list");
  console.log("  node scripts/multiAgent.js create-all");
}
