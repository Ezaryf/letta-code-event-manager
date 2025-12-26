// Send messages to Letta agent with proper payload structure
import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";

dotenv.config();

const apiKey = process.env.LETTA_API_KEY;
const projectID = process.env.LETTA_PROJECT_ID || undefined;

if (!apiKey || apiKey === "sk-...") {
  console.error("Please set LETTA_API_KEY in .env");
  process.exit(1);
}

const client = new Letta({ apiKey, projectID });

// Load agent ID
const agentId = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;

if (!agentId) {
  console.error("Agent ID not found. Run: npm run create-agent");
  process.exit(1);
}

// Agent name mapping for future multi-agent support
const agentMap = {
  "EchoHarbor": agentId,
  "SpiritedIsland": agentId, // Legacy name support
  "default": agentId,
};

// Load template if type provided
function loadTemplate(type) {
  const mappingPath = "mapping.json";
  if (!fs.existsSync(mappingPath)) return null;
  
  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
  const file = mapping[type];
  if (!file || !fs.existsSync(file)) return null;
  
  return fs.readFileSync(file, "utf-8");
}

function fillTemplate(template, vars) {
  let output = template;
  for (const key in vars) {
    output = output.replaceAll(`{{${key}}}`, vars[key] || "");
  }
  return output;
}

async function send(input, options = {}) {
  const targetAgent = agentMap[options.agent] || agentId;
  
  try {
    const response = await client.agents.messages.create(targetAgent, { input });

    if (response && response.messages) {
      for (const m of response.messages) {
        const text = m.text || m.content || JSON.stringify(m);
        console.log("AGENT:", text);
      }
    }
    
    return response;
  } catch (err) {
    console.error("Error sending message:", err.message);
    throw err;
  }
}

// CLI usage
const args = process.argv.slice(2);
const arg1 = args[0];
const arg2 = args[1];

let payload;

// Check if arg1 is a template type
const template = arg1 ? loadTemplate(arg1) : null;

if (template && arg2) {
  // Template mode: node sendMessage.js test_failure path/to/log.txt
  const logs = fs.existsSync(arg2) ? fs.readFileSync(arg2, "utf-8") : "";
  payload = fillTemplate(template, {
    LOGS: logs,
    CODE: logs,
    PROJECT_CONTEXT: "Node.js project",
  });
} else {
  // Direct message mode: node sendMessage.js "Hello"
  payload = args.join(" ") || "Hello, what can you help me with?";
}

send(payload).catch(console.error);
