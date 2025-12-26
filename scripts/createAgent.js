// Create optimized Letta agent based on audit recommendations
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

// Optimized system prompt (reduced from ~1200 to ~400 tokens)
const SYSTEM_PROMPT = `<role>
You are EchoHarbor, a self-improving technical agent specializing in code analysis and repository maintenance.
</role>

<core_capabilities>
- MEMORY: You maintain persistent memory blocks for user preferences, project rules, and procedures
- ANALYSIS: You analyze code, tests, and errors to provide actionable fixes
- AUTONOMY: You execute tasks continuously until completion or until user input is required
</core_capabilities>

<workflow_rules>
1. For code changes: create small, test-verified commits with DDMMYY format messages
2. Always verify tests pass before committing
3. Default to 'main' branch unless specified otherwise
4. Provide structured JSON responses when analyzing errors
5. Keep responses concise and actionable
</workflow_rules>

<output_format>
When analyzing errors, respond with JSON:
{
  "diagnosis": "what went wrong",
  "root_cause": "why it happened",
  "fix_steps": ["step 1", "step 2"],
  "confidence": 0.0-1.0
}
</output_format>`;

async function main() {
  try {
    console.log("Creating optimized EchoHarbor agent...");
    
    const agent = await client.agents.create({
      name: "EchoHarbor",
      model: "openai/gpt-4o-mini",
      embedding: "openai/text-embedding-ada-002",
      system: SYSTEM_PROMPT,
      memory_blocks: [
        {
          label: "persona",
          description: "Agent behavior and communication style",
          value: "Technical assistant. Concise responses. Focus on actionable fixes. Use structured JSON for error analysis.",
        },
        {
          label: "project_rules",
          description: "Repository and coding standards",
          value: "Commits: DDMMYY - message format. Run tests before commit. Small atomic changes. Default branch: main.",
        },
        {
          label: "dev_commands",
          description: "Project-specific development commands",
          value: "test: npm test | build: npm run build | lint: npm run lint | dev: npm run dev",
        },
        {
          label: "user_prefs",
          description: "User preferences and context",
          value: "User prefers minimal explanations, direct fixes, and JSON-structured responses for errors.",
        },
      ],
    });

    // Save agent ID
    fs.writeFileSync(".letta_agent_id", agent.id, "utf8");
    
    // Save agent config for reference
    const agentConfig = {
      id: agent.id,
      name: "EchoHarbor",
      created: new Date().toISOString(),
      model: "openai/gpt-4o-mini",
      capabilities: ["code_analysis", "test_fixing", "memory_persistence"],
    };
    fs.writeFileSync(".letta_agent_config.json", JSON.stringify(agentConfig, null, 2), "utf8");
    
    console.log("✅ Agent created successfully!");
    console.log(`   ID: ${agent.id}`);
    console.log(`   Name: EchoHarbor`);
    console.log(`   Config saved to: .letta_agent_config.json`);
    
  } catch (err) {
    console.error("Error creating agent:", err.message);
    process.exit(1);
  }
}

main();
