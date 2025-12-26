import fs from "fs";

// Map event types to agent roles
const routingRules = {
  test_failure: ["debugger", "tester"],
  runtime_error: ["debugger"],
  lint_error: ["reviewer"],
  refactor_request: ["refactorer", "reviewer"],
  ci_failure: ["debugger", "reviewer"],
};

export function route(eventType) {
  return routingRules[eventType] || ["debugger"];
}

export function loadAgentConfig(role) {
  const configPath = `agents/${role}.agent.json`;
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  return { role, goal: "General assistance", output: ["response"] };
}

// CLI usage: node scripts/router.js test_failure
if (process.argv[2]) {
  const eventType = process.argv[2];
  const agents = route(eventType);
  console.log(`Event: ${eventType}`);
  console.log(`Routed to agents: ${agents.join(", ")}`);
  agents.forEach((role) => {
    const config = loadAgentConfig(role);
    console.log(`\n${role}:`, config);
  });
}

export default route;
