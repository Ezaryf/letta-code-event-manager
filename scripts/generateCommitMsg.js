import fs from "fs";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";

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

async function generate(summary) {
  if (!summary) {
    console.error(
      'Usage: node scripts/generateCommitMsg.js "Short description of change"'
    );
    process.exit(1);
  }

  const response = await client.agents.messages.create(agentId, {
    input: `Prepare a git commit subject for this change: ${summary}\nRemember: the commit message must be a single short line formatted as DDMMYY - <message>. Only output the commit message line.`,
  });

  const agentText =
    response?.messages?.map((m) => m.text || m.content).join("\n") || "";

  const today = dayjs().format("DDMMYY");
  let final = agentText.split("\n").find(Boolean) || `${today} - ${summary}`;

  // Ensure it starts with date
  if (!/^\d{6}\s*-\s*/.test(final)) {
    final = `${today} - ${final}`;
  }

  fs.writeFileSync(".git_commit_message.txt", final, "utf8");
  console.log("Commit message prepared in .git_commit_message.txt:");
  console.log(final);
}

generate(process.argv.slice(2).join(" ")).catch(console.error);
