// Shared Analysis Engine - Deep code intelligence for watcher and auto-fix
// Provides context-aware analysis that understands project structure
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export function detectProjectType(projectPath) {
  const pkgPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { type: "unknown", framework: null, language: "javascript" };
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  const hasTS = !!deps.typescript || fs.existsSync(path.join(projectPath, "tsconfig.json"));
  
  return {
    type: deps.next ? "nextjs" : deps.react ? "react" : deps.vue ? "vue" : deps.express ? "express" : "node",
    framework: deps.next ? "Next.js" : deps.react ? "React" : deps.vue ? "Vue" : deps.express ? "Express" : null,
    language: hasTS ? "typescript" : "javascript",
    hasJest: !!deps.jest,
    hasVitest: !!deps.vitest,
    hasMocha: !!deps.mocha,
    hasEslint: !!deps.eslint,
    hasPrettier: !!deps.prettier,
    packageJson: pkg,
    scripts: pkg.scripts || {},
  };
}

export function scanProjectStructure(projectPath, maxDepth = 4) {
  const structure = {
    files: [],
    testFiles: [],
    configFiles: [],
    components: [],
    utils: [],
    hooks: [],
    types: [],
    totalFiles: 0,
  };
  
  const IGNORE = ["node_modules", ".git", ".next", "dist", "build", "coverage", ".letta-backups"];
  
  const walk = (dir, depth = 0) => {
    if (depth > maxDepth) return;
    
    const dirName = path.basename(dir);
    if (IGNORE.includes(dirName)) return;
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(projectPath, fullPath);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (stat.isFile()) {
            structure.totalFiles++;
            
            const ext = path.extname(item);
            if (![".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".scss"].includes(ext)) continue;
            
            const info = { path: relativePath, name: item, ext, size: stat.size };
            
            if (item.match(/\.(test|spec)\.(js|ts|jsx|tsx)$/)) {
              structure.testFiles.push(info);
            } else if (item.match(/\.config\.(js|ts|json)$/) || item === "package.json") {
              structure.configFiles.push(info);
            } else if (relativePath.includes("component") || item.match(/^[A-Z].*\.(jsx|tsx)$/)) {
              structure.components.push(info);
            } else if (relativePath.includes("hook") || item.startsWith("use")) {
              structure.hooks.push(info);
            } else if (relativePath.includes("util") || relativePath.includes("lib") || relativePath.includes("helper")) {
              structure.utils.push(info);
            } else if (relativePath.includes("type") || item.endsWith(".d.ts")) {
              structure.types.push(info);
            } else {
              structure.files.push(info);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  };
  
  walk(projectPath);
  return structure;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeFileContent(filePath, content) {
  const ext = path.extname(filePath);
  const analysis = {
    imports: [],
    exports: [],
    functions: [],
    components: [],
    hooks: [],
    dependencies: [],
    hasTests: false,
    complexity: "low",
    issues: [],
  };
  
  // Extract imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*from\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    analysis.imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    analysis.imports.push(match[1]);
  }
  
  // Categorize imports
  analysis.dependencies = analysis.imports.filter(i => !i.startsWith(".") && !i.startsWith("@/"));
  const localImports = analysis.imports.filter(i => i.startsWith(".") || i.startsWith("@/"));
  
  // Extract exports
  const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|let|var)?\s*(\w+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    analysis.exports.push(match[1]);
  }
  
  // Extract functions
  const funcRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|const\s+(\w+)\s*=\s*(?:async\s*)?function)/g;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1] || match[2] || match[3];
    if (name) {
      if (name.startsWith("use") && name.length > 3) {
        analysis.hooks.push(name);
      } else if (name[0] === name[0].toUpperCase()) {
        analysis.components.push(name);
      } else {
        analysis.functions.push(name);
      }
    }
  }
  
  // Check for test patterns
  analysis.hasTests = /\b(describe|test|it|expect)\s*\(/.test(content);
  
  // Estimate complexity
  const lines = content.split("\n").length;
  const conditions = (content.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
  const loops = (content.match(/\b(for|while|do|map|forEach|reduce|filter)\b/g) || []).length;
  
  if (lines > 300 || conditions > 20 || loops > 10) {
    analysis.complexity = "high";
  } else if (lines > 100 || conditions > 10 || loops > 5) {
    analysis.complexity = "medium";
  }
  
  // Basic issue detection
  if (content.includes("console.log")) {
    analysis.issues.push({ type: "style", message: "Contains console.log statements" });
  }
  if (content.includes("// TODO") || content.includes("// FIXME")) {
    analysis.issues.push({ type: "todo", message: "Contains TODO/FIXME comments" });
  }
  if (content.includes("any") && ext.includes("ts")) {
    analysis.issues.push({ type: "typescript", message: "Uses 'any' type" });
  }
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
    analysis.issues.push({ type: "bug", message: "Empty catch block" });
  }
  
  return { ...analysis, localImports, lineCount: lines };
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATED FILES
// ═══════════════════════════════════════════════════════════════════════════

export function findRelatedFiles(filePath, projectPath, structure) {
  const related = {
    imports: [],      // Files this file imports
    importedBy: [],   // Files that import this file
    tests: [],        // Test files for this file
    types: [],        // Type definition files
    styles: [],       // Related CSS/SCSS files
  };
  
  const fileName = path.basename(filePath, path.extname(filePath));
  const relativePath = path.relative(projectPath, filePath);
  const dirPath = path.dirname(filePath);
  
  // Find test files
  const testPatterns = [
    `${fileName}.test`,
    `${fileName}.spec`,
    `__tests__/${fileName}`,
  ];
  
  for (const testFile of structure.testFiles) {
    for (const pattern of testPatterns) {
      if (testFile.path.includes(pattern)) {
        related.tests.push(testFile.path);
      }
    }
  }
  
  // Find type files
  for (const typeFile of structure.types) {
    if (typeFile.name.includes(fileName) || typeFile.path.includes(path.dirname(relativePath))) {
      related.types.push(typeFile.path);
    }
  }
  
  // Find style files
  const styleExts = [".css", ".scss", ".module.css", ".module.scss"];
  for (const ext of styleExts) {
    const stylePath = path.join(dirPath, `${fileName}${ext}`);
    if (fs.existsSync(stylePath)) {
      related.styles.push(path.relative(projectPath, stylePath));
    }
  }
  
  return related;
}

// ═══════════════════════════════════════════════════════════════════════════
// GIT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export function getGitContext(projectPath, filePath) {
  const context = {
    isGitRepo: false,
    branch: null,
    recentChanges: [],
    fileHistory: [],
    uncommittedChanges: [],
  };
  
  try {
    // Check if git repo
    execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "pipe" });
    context.isGitRepo = true;
    
    // Get branch
    context.branch = execSync("git branch --show-current", { cwd: projectPath, encoding: "utf8" }).trim();
    
    // Get uncommitted changes
    const status = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf8" });
    context.uncommittedChanges = status.split("\n").filter(Boolean).map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3),
    }));
    
    // Get recent commits affecting this file (if specified)
    if (filePath) {
      const relativePath = path.relative(projectPath, filePath);
      try {
        const log = execSync(`git log --oneline -5 -- "${relativePath}"`, { cwd: projectPath, encoding: "utf8" });
        context.fileHistory = log.split("\n").filter(Boolean);
      } catch (e) {}
    }
    
  } catch (e) {
    // Not a git repo or git not available
  }
  
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export function parseErrorOutput(output) {
  const errors = [];
  const lines = output.split("\n");
  
  // Common error patterns
  const patterns = [
    // Jest/Vitest
    { regex: /FAIL\s+(.+)/, type: "test_fail", extract: (m) => ({ file: m[1] }) },
    { regex: /●\s+(.+)/, type: "test_error", extract: (m) => ({ message: m[1] }) },
    { regex: /Expected:?\s*(.+)\s*Received:?\s*(.+)/i, type: "assertion", extract: (m) => ({ expected: m[1], received: m[2] }) },
    
    // TypeScript
    { regex: /(.+)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)/, type: "typescript", extract: (m) => ({ file: m[1], line: m[2], col: m[3], code: m[4], message: m[5] }) },
    
    // ESLint
    { regex: /(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/, type: "eslint", extract: (m) => ({ line: m[1], col: m[2], severity: m[3], message: m[4], rule: m[5] }) },
    
    // Node/Runtime
    { regex: /Error:\s*(.+)/, type: "runtime", extract: (m) => ({ message: m[1] }) },
    { regex: /at\s+(.+)\s+\((.+):(\d+):(\d+)\)/, type: "stack", extract: (m) => ({ func: m[1], file: m[2], line: m[3], col: m[4] }) },
    
    // Module errors
    { regex: /Cannot find module '([^']+)'/, type: "module_not_found", extract: (m) => ({ module: m[1] }) },
    { regex: /Module not found:\s*(.+)/, type: "module_not_found", extract: (m) => ({ module: m[1] }) },
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        errors.push({
          type: pattern.type,
          raw: line,
          ...pattern.extract(match),
        });
        break;
      }
    }
  }
  
  return errors;
}

export function categorizeErrors(errors) {
  const categories = {
    testFailures: errors.filter(e => e.type === "test_fail" || e.type === "test_error" || e.type === "assertion"),
    typeErrors: errors.filter(e => e.type === "typescript"),
    lintErrors: errors.filter(e => e.type === "eslint"),
    moduleErrors: errors.filter(e => e.type === "module_not_found"),
    runtimeErrors: errors.filter(e => e.type === "runtime" || e.type === "stack"),
  };
  
  // Determine primary issue
  if (categories.moduleErrors.length > 0) {
    categories.primaryIssue = "missing_dependency";
  } else if (categories.typeErrors.length > 0) {
    categories.primaryIssue = "type_error";
  } else if (categories.testFailures.length > 0) {
    categories.primaryIssue = "test_failure";
  } else if (categories.lintErrors.length > 0) {
    categories.primaryIssue = "lint_error";
  } else if (categories.runtimeErrors.length > 0) {
    categories.primaryIssue = "runtime_error";
  } else {
    categories.primaryIssue = "unknown";
  }
  
  return categories;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildAnalysisContext(filePath, projectPath, options = {}) {
  const content = fs.readFileSync(filePath, "utf8");
  const projectType = detectProjectType(projectPath);
  const structure = scanProjectStructure(projectPath);
  const fileAnalysis = analyzeFileContent(filePath, content);
  const relatedFiles = findRelatedFiles(filePath, projectPath, structure);
  const gitContext = options.includeGit ? getGitContext(projectPath, filePath) : null;
  
  // Read related file contents (limited)
  const relatedContents = {};
  const MAX_RELATED_SIZE = 3000;
  
  for (const testPath of relatedFiles.tests.slice(0, 2)) {
    const fullPath = path.join(projectPath, testPath);
    if (fs.existsSync(fullPath)) {
      const testContent = fs.readFileSync(fullPath, "utf8");
      if (testContent.length < MAX_RELATED_SIZE) {
        relatedContents[testPath] = testContent;
      }
    }
  }
  
  return {
    file: {
      path: path.relative(projectPath, filePath),
      content: content.slice(0, 15000), // Truncate large files
      truncated: content.length > 15000,
      ...fileAnalysis,
    },
    project: projectType,
    structure: {
      totalFiles: structure.totalFiles,
      components: structure.components.length,
      utils: structure.utils.length,
      tests: structure.testFiles.length,
      hooks: structure.hooks.length,
    },
    related: relatedFiles,
    relatedContents,
    git: gitContext,
  };
}
