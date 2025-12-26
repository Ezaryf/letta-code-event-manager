import { execSync } from "child_process";
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

const AUTO_APPLY = process.env.AUTO_APPLY === "true";
const MAX_ATTEMPTS = 3;

async function sendToLetta(payload) {
  const response = await client.agents.messages.create(agentId, {
    input: payload,
  });
  return response?.messages?.map((m) => m.text || m.content).join("\n") || "";
}

export async function autoFix() {
  if (!agentId) {
    console.error("No agent id found. Run createAgent.js first.");
    return;
  }

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    console.log(`\n--- Attempt ${i + 1}/${MAX_ATTEMPTS} ---`);

    try {
      const result = execSync("npm test", { stdio: "pipe", encoding: "utf8" });
      console.log("✅ Tests passed!");
      console.log(result);
      return true;
    } catch (err) {
      const logs = err.stdout?.toString() || err.stderr?.toString() || "";
      console.log("❌ Tests failed. Asking Letta for help...");

      const prompt = `Tests are failing. Here are the logs:

${logs}

Please analyze and return a JSON response with this structure:
{
  "diagnosis": "what went wrong",
  "root_cause": "why it happened",
  "fix_steps": ["step 1", "step 2"],
  "code_patch": "unified diff patch if applicable",
  "risk": "low/medium/high",
  "confidence": 0.0-1.0
}

Only output valid JSON.`;

      const response = await sendToLetta(prompt);
      console.log("\nLetta response:", response);

      // Try to parse JSON response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          if (parsed.code_patch && AUTO_APPLY && parsed.confidence >= 0.8) {
            console.log("Applying patch (confidence:", parsed.confidence, ")");
            fs.writeFileSync("temp_fix.patch", parsed.code_patch, "utf8");
            try {
              execSync("git apply temp_fix.patch", { stdio: "inherit" });
              console.log("Patch applied. Re-running tests...");
            } catch (applyErr) {
              console.log("Failed to apply patch:", applyErr.message);
            }
          } else if (parsed.code_patch) {
            console.log("\n📋 Suggested patch (AUTO_APPLY=false):");
            console.log(parsed.code_patch);
            fs.writeFileSync("suggested_fix.patch", parsed.code_patch, "utf8");
            console.log("Saved to suggested_fix.patch - review and apply manually.");
            return false;
          }
        }
      } catch (parseErr) {
        console.log("Could not parse JSON response. Manual review needed.");
        return false;
      }
    }
  }

  console.log(`\n⚠️ Max attempts (${MAX_ATTEMPTS}) reached. Manual intervention needed.`);
  return false;
}

// Run if called directly
if (process.argv[1].includes("autoFixLoop")) {
  autoFix().catch(console.error);
}
