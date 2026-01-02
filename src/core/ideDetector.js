/**
 * IDE Detector - Detects the user's IDE/editor environment
 * Supports agentic IDEs (Kiro, Antigravity) and traditional editors
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// IDE definitions with detection methods
const IDE_DEFINITIONS = {
  // Agentic IDEs (AI-native)
  kiro: {
    name: "Kiro",
    type: "agentic",
    description: "AWS AI-powered IDE",
    features: ["ai-native", "specs", "steering", "hooks", "mcp"],
    detection: {
      folders: [".kiro"],
      files: [".kiro/settings/mcp.json", ".kiro/steering"],
      envVars: ["KIRO_SESSION", "KIRO_WORKSPACE"],
      processes: ["kiro", "Kiro"],
    },
    collaboration: {
      canShare: true,
      protocol: "kiro-collab",
      suggestionsPath: ".kiro/suggestions",
    },
  },
  
  antigravity: {
    name: "Antigravity",
    type: "agentic",
    description: "Antigravity AI IDE",
    features: ["ai-native", "autonomous", "multi-agent"],
    detection: {
      folders: [".antigravity", ".ag"],
      files: [".antigravity/config.json", "antigravity.json"],
      envVars: ["ANTIGRAVITY_SESSION", "AG_WORKSPACE"],
      processes: ["antigravity", "ag-ide"],
    },
    collaboration: {
      canShare: true,
      protocol: "ag-collab",
      suggestionsPath: ".antigravity/suggestions",
    },
  },
  
  cursor: {
    name: "Cursor",
    type: "agentic",
    description: "AI-first code editor",
    features: ["ai-native", "chat", "composer"],
    detection: {
      folders: [".cursor"],
      files: [".cursor/settings.json", ".cursorignore"],
      envVars: ["CURSOR_SESSION"],
      processes: ["Cursor", "cursor"],
    },
    collaboration: {
      canShare: true,
      protocol: "cursor-collab",
      suggestionsPath: ".cursor/suggestions",
    },
  },
  
  windsurf: {
    name: "Windsurf",
    type: "agentic",
    description: "Codeium's agentic IDE",
    features: ["ai-native", "cascade", "flows"],
    detection: {
      folders: [".windsurf", ".codeium"],
      files: [".windsurf/config.json"],
      envVars: ["WINDSURF_SESSION", "CODEIUM_API_KEY"],
      processes: ["windsurf", "Windsurf"],
    },
    collaboration: {
      canShare: true,
      protocol: "windsurf-collab",
      suggestionsPath: ".windsurf/suggestions",
    },
  },
  
  // Traditional IDEs with AI extensions
  vscode: {
    name: "VS Code",
    type: "traditional",
    description: "Visual Studio Code",
    features: ["extensions", "terminal", "git"],
    detection: {
      folders: [".vscode"],
      files: [".vscode/settings.json", ".vscode/extensions.json"],
      envVars: ["VSCODE_PID", "VSCODE_CWD", "TERM_PROGRAM=vscode"],
      processes: ["code", "Code"],
    },
    collaboration: {
      canShare: false,
      suggestionsPath: ".vscode/codemind-suggestions",
    },
  },
  
  jetbrains: {
    name: "JetBrains IDE",
    type: "traditional",
    description: "IntelliJ, WebStorm, PyCharm, etc.",
    features: ["refactoring", "debugging", "git"],
    detection: {
      folders: [".idea"],
      files: [".idea/workspace.xml", ".idea/modules.xml"],
      envVars: ["JETBRAINS_IDE", "IDEA_INITIAL_DIRECTORY"],
      processes: ["idea", "webstorm", "pycharm", "phpstorm", "rider"],
    },
    collaboration: {
      canShare: false,
      suggestionsPath: ".idea/codemind-suggestions",
    },
  },
  
  neovim: {
    name: "Neovim",
    type: "traditional",
    description: "Neovim editor",
    features: ["lua", "lsp", "treesitter"],
    detection: {
      folders: [],
      files: [],
      envVars: ["NVIM", "NVIM_LISTEN_ADDRESS"],
      processes: ["nvim"],
    },
    collaboration: {
      canShare: false,
      suggestionsPath: ".nvim/codemind-suggestions",
    },
  },
  
  vim: {
    name: "Vim",
    type: "traditional",
    description: "Vim editor",
    features: ["modal", "lightweight"],
    detection: {
      folders: [],
      files: [],
      envVars: ["VIM", "VIMRUNTIME"],
      processes: ["vim", "gvim"],
    },
    collaboration: {
      canShare: false,
      suggestionsPath: ".vim/codemind-suggestions",
    },
  },
  
  sublime: {
    name: "Sublime Text",
    type: "traditional",
    description: "Sublime Text editor",
    features: ["fast", "plugins"],
    detection: {
      folders: [".sublime-project"],
      files: ["*.sublime-project", "*.sublime-workspace"],
      envVars: [],
      processes: ["sublime_text", "subl"],
    },
    collaboration: {
      canShare: false,
      suggestionsPath: ".sublime/codemind-suggestions",
    },
  },
  
  zed: {
    name: "Zed",
    type: "modern",
    description: "High-performance code editor",
    features: ["fast", "collaborative", "ai-assistant"],
    detection: {
      folders: [".zed"],
      files: [".zed/settings.json"],
      envVars: ["ZED_TERM"],
      processes: ["zed", "Zed"],
    },
    collaboration: {
      canShare: true,
      protocol: "zed-collab",
      suggestionsPath: ".zed/codemind-suggestions",
    },
  },
};

/**
 * Check if a process is running
 */
function isProcessRunning(processName) {
  try {
    const platform = process.platform;
    let cmd;
    
    if (platform === "win32") {
      cmd = `tasklist /FI "IMAGENAME eq ${processName}.exe" 2>NUL | find /I "${processName}"`;
    } else if (platform === "darwin") {
      cmd = `pgrep -x "${processName}" 2>/dev/null`;
    } else {
      cmd = `pgrep -x "${processName}" 2>/dev/null`;
    }
    
    execSync(cmd, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvVars(envVars) {
  for (const envVar of envVars) {
    if (envVar.includes("=")) {
      const [key, value] = envVar.split("=");
      if (process.env[key] === value) return true;
    } else {
      if (process.env[envVar]) return true;
    }
  }
  return false;
}

/**
 * Check for IDE-specific folders
 */
function checkFolders(folders, projectPath) {
  for (const folder of folders) {
    if (fs.existsSync(path.join(projectPath, folder))) {
      return true;
    }
  }
  return false;
}

/**
 * Check for IDE-specific files
 */
function checkFiles(files, projectPath) {
  for (const file of files) {
    if (file.includes("*")) {
      // Glob pattern - check if any matching file exists
      const dir = path.dirname(file) || ".";
      const pattern = path.basename(file);
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      
      try {
        const dirPath = path.join(projectPath, dir);
        if (fs.existsSync(dirPath)) {
          const items = fs.readdirSync(dirPath);
          if (items.some(item => regex.test(item))) return true;
        }
      } catch {}
    } else {
      if (fs.existsSync(path.join(projectPath, file))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate detection confidence score
 */
function calculateConfidence(ide, projectPath) {
  const detection = ide.detection;
  let score = 0;
  let maxScore = 0;
  
  // Folder detection (weight: 30)
  if (detection.folders.length > 0) {
    maxScore += 30;
    if (checkFolders(detection.folders, projectPath)) score += 30;
  }
  
  // File detection (weight: 25)
  if (detection.files.length > 0) {
    maxScore += 25;
    if (checkFiles(detection.files, projectPath)) score += 25;
  }
  
  // Environment variable detection (weight: 25)
  if (detection.envVars.length > 0) {
    maxScore += 25;
    if (checkEnvVars(detection.envVars)) score += 25;
  }
  
  // Process detection (weight: 20)
  if (detection.processes.length > 0) {
    maxScore += 20;
    for (const proc of detection.processes) {
      if (isProcessRunning(proc)) {
        score += 20;
        break;
      }
    }
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

/**
 * Detect the current IDE
 */
export function detectIDE(projectPath = process.cwd()) {
  const results = [];
  
  for (const [id, ide] of Object.entries(IDE_DEFINITIONS)) {
    const confidence = calculateConfidence(ide, projectPath);
    if (confidence > 0) {
      results.push({
        id,
        ...ide,
        confidence,
      });
    }
  }
  
  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  
  // Return the best match or unknown
  if (results.length > 0 && results[0].confidence >= 25) {
    return {
      detected: true,
      primary: results[0],
      alternatives: results.slice(1),
      isAgentic: results[0].type === "agentic",
    };
  }
  
  return {
    detected: false,
    primary: {
      id: "unknown",
      name: "Unknown/Terminal",
      type: "terminal",
      description: "Running from terminal or unknown IDE",
      features: [],
      confidence: 0,
      collaboration: {
        canShare: false,
        suggestionsPath: ".codemind/suggestions",
      },
    },
    alternatives: results,
    isAgentic: false,
  };
}

/**
 * Get IDE-specific configuration
 */
export function getIDEConfig(ideId) {
  return IDE_DEFINITIONS[ideId] || null;
}

/**
 * Check if running in an agentic IDE
 */
export function isAgenticIDE(projectPath = process.cwd()) {
  const result = detectIDE(projectPath);
  return result.isAgentic;
}

/**
 * Get collaboration settings for the detected IDE
 */
export function getCollaborationSettings(projectPath = process.cwd()) {
  const result = detectIDE(projectPath);
  const ide = result.primary;
  
  return {
    ide: ide.name,
    ideType: ide.type,
    canCollaborate: ide.collaboration?.canShare || false,
    protocol: ide.collaboration?.protocol || null,
    suggestionsPath: ide.collaboration?.suggestionsPath || ".codemind/suggestions",
    features: ide.features || [],
  };
}

/**
 * Get all supported IDEs
 */
export function getSupportedIDEs() {
  return Object.entries(IDE_DEFINITIONS).map(([id, ide]) => ({
    id,
    name: ide.name,
    type: ide.type,
    description: ide.description,
    features: ide.features,
  }));
}

/**
 * Format IDE info for display
 */
export function formatIDEInfo(ideResult) {
  const ide = ideResult.primary;
  const lines = [];
  
  lines.push(`IDE: ${ide.name}`);
  lines.push(`Type: ${ide.type === "agentic" ? "🤖 Agentic AI IDE" : ide.type === "modern" ? "⚡ Modern Editor" : "📝 Traditional Editor"}`);
  
  if (ide.confidence > 0) {
    lines.push(`Confidence: ${ide.confidence.toFixed(0)}%`);
  }
  
  if (ide.features?.length > 0) {
    lines.push(`Features: ${ide.features.join(", ")}`);
  }
  
  if (ide.collaboration?.canShare) {
    lines.push(`Collaboration: ✓ Supported`);
  }
  
  return lines;
}

export default {
  detectIDE,
  getIDEConfig,
  isAgenticIDE,
  getCollaborationSettings,
  getSupportedIDEs,
  formatIDEInfo,
};
