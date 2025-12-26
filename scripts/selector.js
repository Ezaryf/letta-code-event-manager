import fs from "fs";
import path from "path";
import { readFile } from "fs/promises";
import { minimatch } from "minimatch";

const mapping = JSON.parse(fs.readFileSync("mapping.json", "utf-8"));

// Extended mapping with pattern rules
const patternRules = [
  {
    name: "failing-test",
    match: {
      pathPattern: "tests/*.test.js",
      contentRegex: "FAIL|failing|AssertionError",
    },
    template: "templates/test_failure.txt",
    priority: 10,
  },
  {
    name: "lint-error",
    match: {
      pathPattern: "ci/lint-report.json",
      contentRegex: "eslint|lint",
    },
    template: "templates/lint.txt",
    priority: 9,
  },
  {
    name: "runtime-error",
    match: {
      pathPattern: "logs/errors.log",
      contentRegex: "TypeError|ReferenceError|uncaught",
    },
    template: "templates/runtime.txt",
    priority: 8,
  },
];

export async function selectTemplate(eventPath) {
  const content = await readFile(eventPath, "utf8");
  const candidates = [];

  for (const rule of patternRules) {
    const pathMatch = minimatch(
      path.basename(eventPath),
      rule.match.pathPattern || "*"
    );
    const regex = rule.match.contentRegex
      ? new RegExp(rule.match.contentRegex, "i")
      : null;
    const contentMatch = regex ? regex.test(content) : true;
    if (pathMatch && contentMatch) {
      candidates.push(rule);
    }
  }

  candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return candidates.length ? candidates[0].template : null;
}

export default selectTemplate;
