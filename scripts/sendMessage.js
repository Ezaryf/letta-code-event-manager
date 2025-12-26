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
const agentId = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;

if (!agentId) {
  console.error("Agent id not found. Run scripts/createAgent.js first.");
  process.exit(1);
}

// Load template if type provided
function loadTemplate(type) {
  const mapping = JSON.parse(fs.readFileSync("mapping.json", "utf-8"));
  const file = mapping[type];
  if (!file) return null;
  return fs.readFileSync(file, "utf-8");
}

function fillTemplate(template, vars) {
  let output = template;
  for (const key in vars) {
    output = output.replaceAll(`{{${key}}}`, vars[key] || "");
  }
  return output;
}

async function send(input) {
  const response = await client.agents.messages.create(agentId, { input });

  if (response && response.messages) {
    for (const m of response.messages) {
      console.log("AGENT:", m.text || m.content || JSON.stringify(m));
    }
  }
  return response;
}

// CLI usage:
// node scripts/sendMessage.js "Hello"
// node scripts/sendMessage.js test_failure path/to/log.txt
const arg1 = process.argv[2];
const arg2 = process.argv[3];

let payload;

// Check if arg1 is a template type
const template = arg1 ? loadTemplate(arg1) : null;
if (template && arg2) {
  const logs = fs.existsSync(arg2) ? fs.readFileSync(arg2, "utf-8") : "";
  payload = fillTemplate(template, {
    LOGS: logs,
    CODE: logs,
    PROJECT_CONTEXT: "Node.js project using CI automation",
  });
} else {
  payload = process.argv.slice(2).join(" ") || "Hello, what do you remember about this repo?";
}

send(payload).catch(console.error);
