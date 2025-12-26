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

async function main() {
  try {
    const agent = await client.agents.create({
      model: "openai/gpt-4o-mini",  // Better context window support
      embedding: "openai/text-embedding-ada-002",
      memory_blocks: [
        {
          label: "persona",
          description: "Agent persona: helpful, safety-first, always explain changes.",
          value:
            "You are a careful coding assistant. Produce safe diffs, propose tests, and always output a suggested git commit message in the format DDMMYY - <short message> when you present a patch.",
        },
        {
          label: "project_rules",
          description: "General best-practices and style rules for all projects.",
          value:
            "Rule: always create small commits. Rule: run tests before commit. Rule: use 'main' as default branch unless repo has 'master'. Rule: generate commit messages as DDMMYY - Proper message.",
        },
        {
          label: "dev_commands",
          description: "Dev commands: how to run tests/build locally for this project",
          value:
            "test: npm test; build: npm run build; lint: npm run lint (if present). If unknown, ask the user: how do I run tests?",
        },
      ],
    });

    fs.writeFileSync(".letta_agent_id", agent.id, "utf8");
    console.log("Created agent:", agent.id);
  } catch (err) {
    console.error("Error creating agent:", err);
  }
}

main();
