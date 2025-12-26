import fs from "fs";
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

if (!agentId) {
  console.error("No agent id found");
  process.exit(1);
}

async function remember(note) {
  if (!note) {
    console.error('Usage: node scripts/remember.js "We use ESLint rule X"');
    process.exit(1);
  }
  const resp = await client.agents.messages.create(agentId, {
    input: `/remember ${note}`,
  });
  console.log(
    "Remember response:",
    resp?.messages?.[0]?.text || JSON.stringify(resp)
  );
}

remember(process.argv.slice(2).join(" ")).catch(console.error);
