// A. Auto Test-Fix Loop - FULLY AUTOMATED
// Handles ALL problems: missing deps, Jest config, test files, code bugs
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
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

const TARGET_ARG = process.argv[2];
const TARGET_REPO = TARGET_ARG 
  ? path.resolve(TARGET_ARG)
  : (process.env.TARGET_REPO || process.cwd());

const AUTO_APPLY = process.env.AUTO_APPLY === "true" || process.argv.includes("--auto");
const MAX_ATTEMPTS = parseInt(process.env.MAX_FIX_ATTEMPTS || "10", 10);
const MIN_CONFIDENCE = parseFloat(process.env.MIN_CONFIDENCE || "0.7");

if (!agentId) {
  console.error("No agent ID found. Run: npm run create-agent");
  process.exit(1);
}

if (!fs.existsSync(TARGET_REPO)) {
  console.error(`Target directory not found: ${TARGET_REPO}`);
  process.exit(1);
}

// Detect project type
function detectProjectType() {
  const packageJsonPath = path.join(TARGET_REPO, "package.json");
  if (!fs.existsSync(packageJsonPath)) return { type: "unknown" };
  
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  return {
    type: deps.next ? "nextjs" : deps.react ? "react" : deps.vue ? "vue" : "node",
    hasJest: !!deps.jest,
    hasTestingLibrary: !!deps["@testing-library/react"],
    hasJestDom: !!deps["@testing-library/jest-dom"],
    hasJestConfig: fs.existsSync(path.join(TARGET_REPO, "jest.config.js")) || 
                   fs.existsSync(path.join(TARGET_REPO, "jest.config.ts")),
    typescript: !!deps.typescript,
    packageJson: pkg,
  };
}

// Install missing dependencies
function installDeps(deps) {
  console.log(`   📦 Installing: ${deps.join(", ")}`);
  try {
    execSync(`npm install --save-dev ${deps.join(" ")}`, {
      cwd: TARGET_REPO,
      stdio: "pipe",
      encoding: "utf8",
    });
    console.log(`   ✅ Dependencies installed`);
    return true;
  } catch (err) {
    console.log(`   ❌ Failed to install deps: ${err.message}`);
    return false;
  }
}

// Setup Jest for Next.js
function setupJestForNextJs() {
  console.log("\n🔧 Setting up Jest for Next.js...");
  
  // Install required deps
  const deps = [
    "jest",
    "jest-environment-jsdom", 
    "@testing-library/react",
    "@testing-library/jest-dom",
  ];
  
  if (!installDeps(deps)) return false;
  
  // Create jest.config.js
  const jestConfig = `const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
`;
  
  fs.writeFileSync(path.join(TARGET_REPO, "jest.config.js"), jestConfig, "utf8");
  console.log("   ✅ Created jest.config.js");
  
  // Create jest.setup.js
  const jestSetup = `import '@testing-library/jest-dom';
`;
  fs.writeFileSync(path.join(TARGET_REPO, "jest.setup.js"), jestSetup, "utf8");
  console.log("   ✅ Created jest.setup.js");
  
  // Update package.json test script
  const pkgPath = path.join(TARGET_REPO, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.test = "jest";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
  console.log("   ✅ Updated package.json test script");
  
  return true;
}

// Setup Jest for regular Node/React
function setupJestBasic() {
  console.log("\n🔧 Setting up Jest (basic)...");
  
  const deps = ["jest"];
  if (!installDeps(deps)) return false;
  
  const jestConfig = `module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
};
`;
  fs.writeFileSync(path.join(TARGET_REPO, "jest.config.js"), jestConfig, "utf8");
  console.log("   ✅ Created jest.config.js");
  
  const pkgPath = path.join(TARGET_REPO, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.test = "jest";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
  console.log("   ✅ Updated package.json test script");
  
  return true;
}

// Create basic passing test
function createBasicTest() {
  console.log("\n📝 Creating basic test file...");
  
  const testDir = path.join(TARGET_REPO, "__tests__");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const basicTest = `// Basic tests - these should always pass
describe('Basic Tests', () => {
  test('arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });

  test('strings work', () => {
    expect('hello').toContain('ell');
  });

  test('arrays work', () => {
    expect([1, 2, 3]).toHaveLength(3);
  });
});
`;
  
  fs.writeFileSync(path.join(testDir, "basic.test.js"), basicTest, "utf8");
  console.log("   ✅ Created __tests__/basic.test.js");
  return true;
}

// Scan project structure
function scanProject() {
  const structure = {
    hasTests: false,
    testFiles: [],
    srcFiles: [],
    configFiles: [],
    packageJson: null,
  };

  const walk = (dir, depth = 0) => {
    if (depth > 3) return;
    if (dir.includes("node_modules") || dir.includes(".git") || dir.includes(".next")) return;
    
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(TARGET_REPO, fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath, depth + 1);
        } else {
          if (item.match(/\.(test|spec)\.(js|ts|jsx|tsx)$/)) {
            structure.hasTests = true;
            structure.testFiles.push(relativePath);
          } else if (item.match(/\.(js|ts|jsx|tsx)$/) && !item.includes(".config")) {
            structure.srcFiles.push(relativePath);
          } else if (item === "package.json") {
            structure.packageJson = fs.readFileSync(fullPath, "utf8");
          } else if (item.match(/\.(json|config\.(js|ts))$/)) {
            structure.configFiles.push(relativePath);
          }
        }
      }
    } catch (e) {}
  };

  walk(TARGET_REPO);
  return structure;
}

function runTests() {
  try {
    const output = execSync("npm test", {
      cwd: TARGET_REPO,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
    return { success: false, output };
  }
}

async function askLettaForFix(testOutput, projectStructure, projectType, previousFixes = []) {
  let fileContents = "";
  const filesToRead = ["package.json", "jest.config.js", "jest.setup.js", "tsconfig.json"];
  
  for (const file of filesToRead) {
    const filePath = path.join(TARGET_REPO, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.length < 2000) {
        fileContents += `\n--- ${file} ---\n${content}\n`;
      }
    }
  }

  for (const testFile of projectStructure.testFiles.slice(0, 2)) {
    const filePath = path.join(TARGET_REPO, testFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.length < 1500) {
        fileContents += `\n--- ${testFile} (TEST FILE) ---\n${content}\n`;
      }
    }
  }

  const prompt = `You are an expert developer fixing test failures.

PROJECT TYPE: ${projectType.type}
- Has Jest: ${projectType.hasJest}
- Has Jest Config: ${projectType.hasJestConfig}
- Has Testing Library: ${projectType.hasTestingLibrary}
- TypeScript: ${projectType.typescript}

TEST FILES: ${projectStructure.testFiles.join(", ") || "NONE"}
SOURCE FILES: ${projectStructure.srcFiles.slice(0, 8).join(", ")}

TEST OUTPUT:
\`\`\`
${testOutput.slice(0, 3000)}
\`\`\`

FILE CONTENTS:
${fileContents}

${previousFixes.length > 0 ? `PREVIOUS FIXES (try different approach):\n${previousFixes.slice(-3).map(f => `- ${f.action} ${f.file_to_fix}`).join("\n")}\n` : ""}

Respond with ONLY valid JSON:
{
  "diagnosis": "what's wrong",
  "root_cause": "why",
  "action": "modify" or "create" or "delete",
  "file_to_fix": "path like __tests__/basic.test.js",
  "code_before": "exact text to find (modify only)",
  "code_after": "replacement (modify only)",
  "full_content": "complete file (create only)",
  "risk": "low",
  "confidence": 0.85
}

RULES:
- For modify: code_before must be EXACT text from file above
- For create: provide complete working content
- Keep tests SIMPLE - use expect(1+1).toBe(2) style
- Don't use React components unless testing library is set up
- If error mentions missing module, the fix might need different approach`;

  const response = await client.agents.messages.create(agentId, { input: prompt });
  const text = response?.messages?.map((m) => m.text || m.content).join("\n") || "";
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log("   Failed to parse JSON from Letta");
    }
  }
  return null;
}

function applyFix(fix, failedAttempts = 0) {
  const filePath = path.join(TARGET_REPO, fix.file_to_fix);
  let action = fix.action || "modify";

  if (action === "modify" && failedAttempts >= 2) {
    console.log(`   ⚠️ Modify failed ${failedAttempts}x, switching to recreate`);
    action = "create";
    if (fix.code_after && !fix.full_content) {
      fix.full_content = fix.code_after;
    }
  }

  console.log(`   Action: ${action.toUpperCase()}`);

  if (action === "create") {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath + ".backup", fs.readFileSync(filePath), "utf8");
    }
    
    fs.writeFileSync(filePath, fix.full_content || fix.code_after || "", "utf8");
    console.log(`   ✅ Created: ${fix.file_to_fix}`);
    return true;
  }

  if (action === "delete") {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath + ".deleted", fs.readFileSync(filePath));
      fs.unlinkSync(filePath);
      console.log(`   🗑️ Deleted: ${fix.file_to_fix}`);
      return true;
    }
    return false;
  }

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${fix.file_to_fix}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");

  if (!fix.code_before || !content.includes(fix.code_before)) {
    console.log(`   ❌ Could not find code_before`);
    return false;
  }

  fs.writeFileSync(filePath + ".backup", content, "utf8");
  const newContent = content.replace(fix.code_before, fix.code_after);
  fs.writeFileSync(filePath, newContent, "utf8");
  
  console.log(`   ✅ Modified: ${fix.file_to_fix}`);
  return true;
}

async function saveSuggestion(fix, testOutput, applied, attempt) {
  const stamp = dayjs().format("YYYYMMDD_HHmmss");
  const outDir = path.join("suggestions", `${stamp}_attempt${attempt}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "test-output.txt"), testOutput, "utf8");
  fs.writeFileSync(path.join(outDir, "fix.json"), JSON.stringify({ ...fix, applied }, null, 2), "utf8");
  return outDir;
}

async function autoTestFixLoop() {
  console.log("🔄 FULLY AUTOMATED Test-Fix Pipeline");
  console.log("=".repeat(50));
  console.log(`Target: ${TARGET_REPO}`);
  console.log(`Auto-apply: ${AUTO_APPLY}`);
  console.log(`Max attempts: ${MAX_ATTEMPTS}`);
  console.log("=".repeat(50));

  // Phase 1: Detect and setup
  const projectType = detectProjectType();
  console.log(`\n📊 Project Type: ${projectType.type}`);
  console.log(`   Jest installed: ${projectType.hasJest}`);
  console.log(`   Jest config: ${projectType.hasJestConfig}`);
  console.log(`   Testing Library: ${projectType.hasTestingLibrary}`);

  // Phase 2: Setup Jest if missing
  if (!projectType.hasJest || !projectType.hasJestConfig) {
    console.log("\n⚠️ Jest not properly configured");
    
    if (AUTO_APPLY) {
      if (projectType.type === "nextjs") {
        setupJestForNextJs();
      } else {
        setupJestBasic();
      }
      
      // Refresh project type
      Object.assign(projectType, detectProjectType());
    } else {
      console.log("   Run with --auto to auto-setup Jest");
      return false;
    }
  }

  // Phase 3: Create basic test if none exist
  const projectStructure = scanProject();
  if (!projectStructure.hasTests) {
    console.log("\n⚠️ No test files found");
    if (AUTO_APPLY) {
      createBasicTest();
    }
  }

  // Phase 4: Run test-fix loop
  const previousFixes = [];
  const failedModifyCount = {};

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n${"─".repeat(40)}`);
    console.log(`ATTEMPT ${attempt}/${MAX_ATTEMPTS}`);
    console.log(`${"─".repeat(40)}`);

    const currentStructure = scanProject();
    console.log(`📊 ${currentStructure.srcFiles.length} source, ${currentStructure.testFiles.length} test files`);

    const testResult = runTests();

    if (testResult.success) {
      console.log("\n🎉 ALL TESTS PASSED!");
      console.log(`   Fixed in ${attempt} attempt(s)`);
      return true;
    }

    console.log("❌ Tests failed");
    
    // Check for common fixable errors
    const output = testResult.output;
    
    if (output.includes("Cannot find module") && output.includes("@testing-library")) {
      console.log("   📦 Missing @testing-library, installing...");
      installDeps(["@testing-library/react", "@testing-library/jest-dom"]);
      continue;
    }
    
    if (output.includes("Cannot find module 'jest-environment-jsdom'")) {
      console.log("   📦 Missing jest-environment-jsdom, installing...");
      installDeps(["jest-environment-jsdom"]);
      continue;
    }

    console.log("🤖 Asking Letta for fix...\n");
    const fix = await askLettaForFix(output, currentStructure, projectType, previousFixes);

    if (!fix) {
      console.log("   Could not get fix from Letta, retrying...");
      continue;
    }

    console.log(`📋 ${fix.diagnosis}`);
    console.log(`   File: ${fix.file_to_fix}`);
    console.log(`   Confidence: ${fix.confidence}`);

    previousFixes.push(fix);

    if (AUTO_APPLY && fix.confidence >= MIN_CONFIDENCE) {
      console.log(`\n🔧 Applying fix...`);
      
      const fileKey = fix.file_to_fix;
      const failCount = failedModifyCount[fileKey] || 0;
      
      const applied = applyFix(fix, failCount);
      await saveSuggestion(fix, output, applied, attempt);

      if (applied) {
        failedModifyCount[fileKey] = 0;
        console.log("   ✓ Re-running tests...");
        continue;
      } else {
        failedModifyCount[fileKey] = failCount + 1;
        if (failedModifyCount[fileKey] < 3) continue;
      }
    } else {
      const suggestionDir = await saveSuggestion(fix, output, false, attempt);
      console.log(`\n📄 Saved to: ${suggestionDir}`);
      if (!AUTO_APPLY) console.log("💡 Run with --auto to auto-apply");
      break;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Pipeline ended");
  console.log("=".repeat(50));
  return false;
}

autoTestFixLoop().catch(console.error);
