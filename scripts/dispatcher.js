import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import { Letta } from "@letta-ai/letta-client";
import dayjs from "dayjs";
import { selectTemplate } from "./selector.js";

dotenv.config();

const apiKey = process.env.LETTA_API_KEY;
const projectID = process.env.LETTA_PROJECT_ID;
const agentId = fs.existsSync(".letta_agent_id")
  ? fs.readFileSync(".letta_agent_id", "utf8").trim()
  : null;
const client = new Letta({ apiKey, projectID });

if (!agentId) {
  console.error("No .letta_agent_id found. Run createAgent.js first.");
  process.exit(1);
}

function replaceTokens(template, tokens) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, k) => tokens[k.trim()] || "");
}

export async function dispatch(eventFilePath, repoRoot = ".") {
  const tplPath = await selectTemplate(eventFilePath);
  if (!tplPath) {
    console.log("No matching template for", eventFilePath);
    return null;
  }

  const tplRaw = await fs.readFile(tplPath, "utf8");
  const filled = replaceTokens(tplRaw, {
    event_file: eventFilePath,
    repo_root: repoRoot,
    LOGS: await fs.readFile(eventFilePath, "utf8"),
    PROJECT_CONTEXT: "Node.js project",
  });

  console.log("Using template:", tplPath);
  const response = await client.agents.messages.create(agentId, {
    input: filled,
  });

  // Create suggestions folder
  const stamp = dayjs().format("YYYYMMDD_HHmmss");
  const outDir = path.join("suggestions", stamp);
  await fs.ensureDir(outDir);

  // Save raw inputs and agent replies
  await fs.writeFile(path.join(outDir, "template.txt"), filled, "utf8");
  await fs.writeFile(
    path.join(outDir, "event.txt"),
    await fs.readFile(eventFilePath, "utf8"),
    "utf8"
  );

  // Save messages
  const text =
    response?.messages
      ?.map((m) => m.text || m.content || JSON.stringify(m))
      .join("\n\n---\n\n") || "";
  await fs.writeFile(path.join(outDir, "agent-response.txt"), text, "utf8");

  // If agent included a unified diff block, try extract and save
  const diffMatch = text.match(/(^---\s*a\/[\s\S]*?)(?=\n\n|$)/m);
  if (diffMatch) {
    await fs.writeFile(
      path.join(outDir, "suggested.patch"),
      diffMatch[0],
      "utf8"
    );
  }

  // If agent output contains Best practice lines, save them
  const bestPractices = text
    .split("\n")
    .filter((l) => /^Best practice:/i.test(l));
  if (bestPractices.length) {
    await fs.writeFile(
      path.join(outDir, "best-practices.txt"),
      bestPractices.join("\n"),
      "utf8"
    );
  }

  console.log("Saved suggestion to", outDir);
  return outDir;
}

// CLI usage: node scripts/dispatcher.js path/to/event.txt
if (process.argv[2]) {
  dispatch(process.argv[2], process.cwd()).catch(console.error);
}

export default dispatch;
