# 🤖 LETTA - AI-Powered Developer Cognitive Engine

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

**Transform your coding workflow with an AI assistant that thinks alongside you.**

*Real-time code analysis • Intelligent auto-fixes • Smart commit generation • Flow protection*

[Quick Start](#-quick-start) • [Features](#-features) • [Cognitive Engine](#-cognitive-engine) • [Configuration](#-configuration) • [IDE Integration](#-ide-integration)

</div>

---

## 📖 Table of Contents

1. [What is Letta?](#-what-is-letta)
2. [Quick Start](#-quick-start)
3. [Features](#-features)
4. [The Cognitive Engine](#-cognitive-engine)
5. [File Watcher](#-file-watcher)
6. [Commit Assistant](#-commit-assistant)
7. [IDE Integration](#-ide-integration)
8. [Themes & Customization](#-themes--customization)
9. [Configuration Reference](#-configuration-reference)
10. [CLI Commands](#-cli-commands)
11. [Keyboard Shortcuts](#-keyboard-shortcuts)
12. [Architecture](#-architecture)
13. [Troubleshooting](#-troubleshooting)
14. [FAQ](#-faq)

---

## 🎯 What is Letta?

Letta is a **Developer Cognitive Engine** - an AI-powered coding assistant that goes beyond simple code analysis. It's designed to be a cognitive partner that:

- **Watches** your code in real-time and catches issues before they become bugs
- **Understands** your intent and adapts its assistance accordingly
- **Protects** your flow state by knowing when to help and when to stay silent
- **Learns** your patterns and predicts problems before they happen
- **Generates** intelligent commit messages based on actual code changes
- **Collaborates** seamlessly with AI-powered IDEs like Kiro, Cursor, and Windsurf

### Why Letta?

| Traditional Tools | Letta Cognitive Engine |
|-------------------|------------------------|
| React to errors after they happen | Predict problems before you write them |
| Interrupt constantly with suggestions | Protect your flow state, queue suggestions |
| One-size-fits-all assistance | Adapt to your intent and coding style |
| Static analysis only | Multi-dimensional signal analysis |
| Manual commit messages | AI-generated contextual commits |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn**
- **Git** (for commit features)
- **Letta API Key** from [app.letta.ai](https://app.letta.ai)

### Installation

```bash
# Clone or download the repository
git clone <repository-url>
cd letta

# Install dependencies
npm install

# Start the interactive CLI
npm start
```

### First-Time Setup

1. **Launch Letta:**
   ```bash
   npm start
   ```

2. **Select "🚀 Quick Setup"** from the menu

3. **Enter your API key** when prompted (get it from [app.letta.ai](https://app.letta.ai))

4. **Wait for agent creation** (automatic)

5. **You're ready!** Select "👁️ Watch & Analyze" to start monitoring your code

### One-Liner Start

```bash
# After setup, watch any project:
npm run watch /path/to/your/project
```

---

## ✨ Features

### 🔍 Real-Time Code Analysis

Letta watches your files and analyzes them as you code:

- **Bug Detection** - Catches null pointer risks, unhandled promises, race conditions
- **Security Scanning** - Identifies XSS vulnerabilities, SQL injection risks, unsafe eval()
- **Performance Analysis** - Spots inefficient patterns, memory leaks, unnecessary re-renders
- **Style Checking** - Enforces best practices, catches loose equality, empty catch blocks

### 🔧 Intelligent Auto-Fix

When enabled, Letta can automatically fix safe issues:

```bash
# Enable auto-fix mode
npm run watch /path/to/project --auto-fix
```

- Only applies fixes with high confidence (configurable threshold)
- Creates backups before modifying files
- Respects your fix type preferences (bugs, security, performance)

### 📝 Smart Commit Assistant

Never write a commit message again:

- **Analyzes actual code changes** - Not just file names
- **Uses conventional commit format** - Feat:, Fix:, Refactor:, etc.
- **Includes date prefix** - Format: DDMMYY (e.g., 311225)
- **Three commit modes:**
  - **Guided** - Step-by-step with review
  - **Auto** - Stage → Commit → Push automatically
  - **Skip** - Commit later manually

### 🧠 Cognitive Engine

The brain of Letta - a six-pillar system that thinks alongside you:

1. **Intent Awareness** - Knows what you're trying to do
2. **Predictive Analysis** - Catches bugs before you write them
3. **Flow Optimizer** - Protects your deep work
4. **Self-Learning** - Adapts to your patterns
5. **Self-Explaining Code** - Living documentation (coming soon)
6. **Why-First Debugging** - Root cause analysis (coming soon)

### 🖥️ IDE Detection

Automatically detects and optimizes for your IDE:

**Agentic IDEs (Full AI Collaboration):**
- Kiro (AWS AI IDE)
- Cursor
- Windsurf (Codeium)
- Antigravity

**Traditional IDEs:**
- VS Code
- JetBrains (IntelliJ, WebStorm, PyCharm)
- Neovim / Vim
- Sublime Text
- Zed

---

## 🧠 Cognitive Engine

The Cognitive Engine is what makes Letta different from traditional linters and analyzers. It's a multi-dimensional intelligence system that understands context, intent, and flow.

### Pillar 1: Intent Awareness Engine

**What it does:** Detects what you're trying to accomplish through multi-signal analysis.

**Detected Intents:**
| Intent | Description | Letta's Response |
|--------|-------------|------------------|
| `WRITING_NEW_FEATURE` | Creating new functionality | Proactive API docs, patterns |
| `DEBUGGING_ERROR` | Fixing a bug | Detailed causal analysis |
| `REFACTORING_CODE` | Improving structure | Safety checks, impact analysis |
| `WRITING_TESTS` | Creating tests | Test patterns, edge cases |
| `EXPLORING_CODEBASE` | Learning the code | Navigation help, architecture |
| `STUCK_AND_SEARCHING` | Struggling with something | Immediate comprehensive help |
| `FLOW_STATE_DEEP_WORK` | In the zone | **Complete silence** |

**How it works:**
```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNAL COLLECTION                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   TEMPORAL      │    SEMANTIC     │      BEHAVIORAL         │
│ • Typing speed  │ • Code patterns │ • Git actions           │
│ • Pause freq    │ • API usage     │ • Test runs             │
│ • Edit rate     │ • Error density │ • File navigation       │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           ▼
                  ┌─────────────────┐
                  │ INTENT CLASSIFIER│
                  │   (ML-based)    │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │ ADAPTIVE UI     │
                  │ CONFIGURATION   │
                  └─────────────────┘
```

### Pillar 2: Predictive Assistance Engine

**What it does:** Catches bugs before you write them using pattern analysis.

**Prediction Types:**
- `NULL_POINTER` - Property access without null checks
- `ASYNC_ISSUE` - Unhandled promises, race conditions
- `MEMORY_LEAK` - Event listeners without cleanup
- `SECURITY_VULNERABILITY` - eval(), innerHTML, SQL injection
- `PERFORMANCE_BOTTLENECK` - Inefficient loops, unnecessary operations
- `ERROR_PRONE_PATTERN` - Loose equality, empty catch blocks

**Risk Scoring System:**
```
Risk Score = Σ (Factor × Weight)

Factors:
├── Code Complexity (25%)
├── Task Complexity (25%)
├── Test Coverage (15%)
├── Change Size (10%)
├── External Dependencies (10%)
├── Concurrency Level (10%)
└── Developer Fatigue (5%)
```

**Risk Levels:**
| Level | Score | Action |
|-------|-------|--------|
| LOW | 0-30% | Minimal suggestions |
| MEDIUM | 30-60% | Contextual help available |
| HIGH | 60-80% | Proactive warnings |
| CRITICAL | 80-100% | Immediate intervention |

### Pillar 6: Flow Optimizer

**What it does:** Protects your deep work by knowing when to help and when to stay silent.

**Flow States:**
| State | Description | Letta's Behavior |
|-------|-------------|------------------|
| `DEEP_FLOW` | Peak productivity | **No interruptions** |
| `FLOW` | Good focus | Minimal suggestions only |
| `ENGAGED` | Working normally | Standard assistance |
| `DISTRACTED` | Losing focus | Focus assistance |
| `STRUGGLING` | Needs help | Comprehensive support |

**Flow Detection Metrics:**
- Typing speed and consistency
- Pause frequency and duration
- Edit patterns and velocity
- Error rate
- Task switching frequency

**Cognitive Load Monitoring:**
```
Cognitive Load = f(
  code_complexity,
  task_complexity,
  context_switches,
  open_files,
  pending_tasks,
  time_working
)
```

### Enabling/Disabling Cognitive Features

In your `.env` file:

```bash
# Master switch
COGNITIVE_ENGINE=true

# Individual features
FLOW_PROTECTION=true      # Protect deep work
INTENT_DETECTION=true     # Detect developer intent
PREDICTIVE_ANALYSIS=true  # Predict problems
```

---

## 👁️ File Watcher

The file watcher is Letta's real-time monitoring system.

### Starting the Watcher

```bash
# Basic usage
npm run watch /path/to/project

# With auto-fix enabled
npm run watch /path/to/project --auto-fix

# With debug output
npm run watch /path/to/project --debug
```

### What Gets Watched

**Default Extensions:**
`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.scss`, `.md`

**Ignored Paths:**
- `node_modules/`
- `.git/`
- `dist/`, `build/`
- `.next/`
- `coverage/`
- `*.min.js`, `*.map`

### Watcher Output

```
  ╭─────────────────────────────────────────────────────────────────╮
  │  🤖 LETTA CODE WATCHER                                         │
  ╰─────────────────────────────────────────────────────────────────╯

  my-project v1.0.0
  A sample project description

  ⬢ node JS  │  42 files  │  12+8 deps  │  156KB

  15 core · 8 scripts · 12 tests · 5 configs

  Tools Jest · ESLint · TypeScript
  npm   dev │ start │ build │ test

  ─────────────────────────────────────────────────────────────────

  git ● main ◆ 3 uncommitted
      abc1234 Last commit message

  🤖 Kiro  AI  collaboration enabled

  ─────────────────────────────────────────────────────────────────

   WATCH   🧠 COGNITIVE  Theme: ocean │ Debounce: 2000ms
  Cognitive: Intent · Prediction · Flow

  ─────────────────────────────────────────────────────────────────
  q quit & commit  │  Ctrl+C quick exit  │  npm start menu
  ─────────────────────────────────────────────────────────────────

  14:32:15 Starting watcher...
  14:32:16 ✓ Ready — watching 42 files

  14:32:20 ~ Button.jsx
  14:32:21 ● Button.jsx...
  14:32:23 ✓ Button.jsx (2.1s)

  14:32:45 ~ utils.js
  14:32:46 ● utils.js...
  14:32:48 ⚠ utils.js (2 issues, 1.8s)
       ! Potential null pointer at line 15
       · Consider using optional chaining
```

### Skip Analysis for Specific Files

Add `@letta-ignore` comment to skip analysis:

```javascript
// @letta-ignore
// This file is auto-generated, skip analysis
export const generated = { ... };
```

---

## 📝 Commit Assistant

The commit assistant helps you create meaningful commit messages.

### Accessing the Commit Assistant

1. **Press `q`** while the watcher is running
2. **Or** let the watcher detect uncommitted changes on exit

### Commit Flow

```
┌─────────────────────────────────────────────────────────────────╮
│  📝 COMMIT ASSISTANT                                           │
╰─────────────────────────────────────────────────────────────────╯

  git ● main

  3 uncommitted changes (2 modified, 1 new)

  ~ Button.jsx
  ~ utils.js
  + NewComponent.tsx

  ─────────────────────────────────────────────────────────────────

  ❯ Guided commit     — step by step
    Auto commit       — stage, commit, push
    Skip              — commit later

  ↑/↓ move  Enter select  Esc cancel
```

### Commit Message Format

Letta generates messages in this format:
```
DDMMYY - Type: Description
```

**Examples:**
- `311225 - Feat: Add arrow key navigation to settings menu`
- `311225 - Fix: Resolve null pointer in user authentication`
- `311225 - Refactor: Simplify dashboard header layout`
- `311225 - Docs: Update README with cognitive engine details`

**Conventional Commit Types:**
| Type | When to Use |
|------|-------------|
| `Feat:` | New features |
| `Fix:` | Bug fixes |
| `Refactor:` | Code restructuring |
| `Style:` | Formatting, CSS |
| `Docs:` | Documentation |
| `Test:` | Adding tests |
| `Chore:` | Maintenance, deps |
| `Perf:` | Performance |

---

## 🖥️ IDE Integration

Letta automatically detects your IDE and adjusts its behavior.

### Agentic IDE Collaboration

When using AI-powered IDEs (Kiro, Cursor, Windsurf), Letta enables:

- **Reduced verbosity** - Your IDE's AI handles explanations
- **Complementary analysis** - Focuses on what your IDE might miss
- **Shared context** - Works alongside your IDE's AI
- **Non-overlapping suggestions** - Avoids duplicate recommendations

### Detection Indicators

In the watcher header:
```
🤖 Kiro  AI  collaboration enabled    # Agentic IDE detected
⚡ VS Code                             # Modern IDE
📝 Vim                                 # Traditional editor
💻 Terminal                            # No IDE detected
```

### Force IDE Detection

```bash
# In .env
LETTA_IDE=kiro
```

---

## 🎨 Themes & Customization

### Available Themes

| Theme | Description | Best For |
|-------|-------------|----------|
| `ocean` | Cyan accents, calm blues | Default, easy on eyes |
| `forest` | Green tones, natural | Nature lovers |
| `sunset` | Warm oranges and reds | Evening coding |
| `midnight` | Purple accents, dark | Night owls |
| `mono` | Grayscale, minimal | Distraction-free |

### Setting a Theme

```bash
# In .env
LETTA_THEME=midnight
```

### Theme Preview

```bash
# Run the theme demo
npm run demo

# Or specific theme
npm run demo:forest
npm run demo:sunset
npm run demo:midnight
```

### Theme Colors

```javascript
// ocean (default)
accent: cyan, success: green, warning: yellow, error: red

// forest
accent: green, success: lime, warning: yellow, error: red

// sunset
accent: coral, success: palegreen, warning: gold, error: crimson

// midnight
accent: purple, success: springgreen, warning: gold, error: orangered

// mono
accent: white, success: white, warning: gray, error: white
```

---

## ⚙️ Configuration Reference

### Environment Variables (.env)

```bash
# ═══════════════════════════════════════════════════════════════
# API CONFIGURATION
# ═══════════════════════════════════════════════════════════════
LETTA_API_KEY=sk-let-your-api-key-here    # Required
LETTA_PROJECT_ID=                          # Optional

# ═══════════════════════════════════════════════════════════════
# THEME & DISPLAY
# ═══════════════════════════════════════════════════════════════
LETTA_THEME=ocean                # ocean|forest|sunset|midnight|mono
SHOW_TIMESTAMPS=true             # Show time on log lines
VERBOSE_OUTPUT=false             # Detailed analysis output

# ═══════════════════════════════════════════════════════════════
# COGNITIVE ENGINE
# ═══════════════════════════════════════════════════════════════
COGNITIVE_ENGINE=true            # Master switch
FLOW_PROTECTION=true             # Protect deep work states
INTENT_DETECTION=true            # Detect developer intent
PREDICTIVE_ANALYSIS=true         # Predict problems

# ═══════════════════════════════════════════════════════════════
# WATCHER SETTINGS
# ═══════════════════════════════════════════════════════════════
WATCHER_DEBOUNCE=2000            # ms delay before analysis
WATCHER_DEPTH=20                 # Folder depth to watch
WATCH_ALL=false                  # Watch all vs common folders
WATCH_EXTENSIONS=.js,.jsx,.ts,.tsx,.json,.css,.scss,.md

# ═══════════════════════════════════════════════════════════════
# AUTO-FIX SETTINGS
# ═══════════════════════════════════════════════════════════════
AUTO_APPLY=false                 # Auto-apply fixes
MIN_CONFIDENCE=0.7               # 0.0-1.0, higher = safer
MAX_FIX_ATTEMPTS=10              # Prevent infinite loops
BACKUP_BEFORE_FIX=true           # Create backups
FIX_TYPES=bug,security,performance  # What to auto-fix

# ═══════════════════════════════════════════════════════════════
# IDE DETECTION
# ═══════════════════════════════════════════════════════════════
IDE_COLLABORATION=true           # Enable AI IDE collaboration
# LETTA_IDE=kiro                 # Force specific IDE

# ═══════════════════════════════════════════════════════════════
# DEBUG
# ═══════════════════════════════════════════════════════════════
DEBUG=false                      # Enable debug logging
```

### Configuration Tips

**For Faster Analysis:**
```bash
WATCHER_DEBOUNCE=1000    # Faster response
VERBOSE_OUTPUT=false     # Less output
```

**For Thorough Analysis:**
```bash
WATCHER_DEBOUNCE=3000    # More time to finish typing
VERBOSE_OUTPUT=true      # See everything
MIN_CONFIDENCE=0.9       # Only very safe fixes
```

**For Flow Protection:**
```bash
COGNITIVE_ENGINE=true
FLOW_PROTECTION=true
INTENT_DETECTION=true
```

---

## 💻 CLI Commands

### Main Commands

| Command | Description |
|---------|-------------|
| `npm start` | Launch interactive CLI menu |
| `npm run watch <path>` | Start file watcher |
| `npm run watch <path> --auto-fix` | Watch with auto-fix |
| `npm run fix <path>` | Run auto test-fix |
| `npm run chat` | Chat with AI agent |
| `npm run setup` | Create/setup agent |
| `npm run setup:force` | Force recreate agent |
| `npm run setup:upgrade` | Upgrade agent template |
| `npm run cleanup` | Remove old agents |
| `npm run demo` | Run theme demo |
| `npm test` | Run tests |

### CLI Menu Options

```
🚀 Quick Setup         - API key + Agent (first time)
────────────────────────────────────────────
👁️  Watch & Analyze     - Monitor code changes
🔧 Auto Test-Fix       - Fix failing tests
🔍 Analyze Project     - Deep code analysis
💬 Chat with Agent     - Ask questions
────────────────────────────────────────────
📄 Code Tools          - Review, explain, refactor
🧪 Generate Tests      - Create tests for code
🐛 Find Bugs           - Scan for potential issues
📝 Git Tools           - Commit, diff, status
────────────────────────────────────────────
📊 Agent Status        - View agent info & memory
⚙️  Settings            - Configure options
❓ Help                 - Documentation
────────────────────────────────────────────
✖  Exit
```

---

## ⌨️ Keyboard Shortcuts

### In File Watcher

| Key | Action |
|-----|--------|
| `q` | Quit with full commit assistant |
| `Ctrl+C` | Quick exit with summary |

### In Menus

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate options |
| `W` / `K` | Move up (alternative) |
| `S` / `J` | Move down (alternative) |
| `Enter` | Select option |
| `Esc` | Go back / Cancel |
| `Ctrl+C` | Exit application |

### In Commit Assistant

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate options |
| `Enter` | Select |
| `Esc` | Cancel |

---

## 🏗️ Architecture

### Project Structure

```
letta/
├── scripts/
│   ├── cli.js              # Main CLI interface
│   ├── assistant.js        # File watcher & commit assistant
│   ├── analyzer.js         # Project analysis utilities
│   ├── createAgent.js      # Agent setup
│   ├── autoTestFix.js      # Auto test fixer
│   ├── dashboardDemo.js    # Theme demo
│   └── ...
├── src/
│   ├── cognitive/
│   │   ├── index.js            # Module exports
│   │   ├── cognitiveEngine.js  # Main orchestrator
│   │   ├── intentEngine.js     # Intent detection (Pillar 1)
│   │   ├── predictiveEngine.js # Predictive analysis (Pillar 2)
│   │   └── flowOptimizer.js    # Flow protection (Pillar 6)
│   └── core/
│       ├── ideDetector.js      # IDE detection
│       └── ...
├── templates/              # Agent templates
├── tests/                  # Test files
├── .env                    # Configuration (create from .env.example)
├── .env.example            # Configuration template
└── package.json
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER CODE                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FILE WATCHER                               │
│                    (chokidar-based)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ INTENT ENGINE   │ │ FLOW OPTIMIZER  │ │ PREDICTIVE      │
│ (What are they  │ │ (Should we      │ │ ENGINE          │
│  trying to do?) │ │  intervene?)    │ │ (What might     │
└────────┬────────┘ └────────┬────────┘ │  go wrong?)     │
         │                   │          └────────┬────────┘
         └───────────────────┼───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COGNITIVE ENGINE                             │
│              (Orchestrates all pillars)                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LETTA API                                  │
│                 (AI-powered analysis)                           │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER FEEDBACK                                │
│           (Console output, suggestions, fixes)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Common Issues

#### "API Key not configured"

```bash
# Solution 1: Run quick setup
npm start
# Select "🚀 Quick Setup"

# Solution 2: Manually add to .env
echo "LETTA_API_KEY=sk-let-your-key-here" >> .env
```

#### "No agent configured"

```bash
# Create a new agent
npm run setup

# Or force recreate
npm run setup:force
```

#### Watcher not detecting changes

```bash
# Check if file extension is watched
# Default: .js,.jsx,.ts,.tsx,.json,.css,.scss,.md

# Add more extensions in .env
WATCH_EXTENSIONS=.js,.jsx,.ts,.tsx,.json,.css,.scss,.md,.vue,.py

# Increase debounce if changes are too fast
WATCHER_DEBOUNCE=3000
```

#### Arrow keys not working in menus

This can happen on some Windows terminals. Use alternatives:
- `W` or `K` to move up
- `S` or `J` to move down
- `Enter` to select
- `Esc` to go back

#### "Permission denied" on .env

```bash
# Fix permissions (Unix/Mac)
chmod 600 .env

# On Windows, check file isn't read-only
```

#### High CPU usage

```bash
# Increase debounce
WATCHER_DEBOUNCE=3000

# Reduce watch depth
WATCHER_DEPTH=10

# Disable verbose output
VERBOSE_OUTPUT=false
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# In .env
DEBUG=true

# Or via command line
npm run watch /path/to/project --debug
```

---

## ❓ FAQ

### General

**Q: Is my code sent to external servers?**
A: Code is sent to the Letta API for analysis. The API is secure and doesn't store your code permanently. For sensitive projects, review Letta's privacy policy.

**Q: Can I use Letta offline?**
A: No, Letta requires an internet connection to communicate with the Letta API for AI-powered analysis.

**Q: Does Letta work with any programming language?**
A: Letta works best with JavaScript/TypeScript but can analyze any text-based code file. Language-specific features are optimized for JS/TS.

### Cognitive Engine

**Q: What is "deep flow" and why does Letta protect it?**
A: Deep flow is a state of peak productivity where you're fully immersed in coding. Research shows interruptions during deep flow can take 15-25 minutes to recover from. Letta detects this state and queues suggestions for later.

**Q: How does intent detection work?**
A: Letta analyzes multiple signals: typing speed, pause patterns, code semantics, file navigation, git actions, and error rates. These signals are combined to predict what you're trying to accomplish.

**Q: Can I disable the cognitive engine?**
A: Yes, set `COGNITIVE_ENGINE=false` in your `.env` file. You can also disable individual features like `FLOW_PROTECTION=false`.

### Commits

**Q: Why does the commit message start with a date?**
A: The DDMMYY format helps track when changes were made and makes commit history easier to scan chronologically.

**Q: Can I customize the commit message format?**
A: Currently, the format is fixed (DDMMYY - Type: Description). Custom formats may be added in future versions.

### Performance

**Q: Letta is slow to analyze files. How can I speed it up?**
A: 
1. Reduce `WATCHER_DEBOUNCE` (but not below 1000ms)
2. Disable `VERBOSE_OUTPUT`
3. Disable cognitive features you don't need
4. Ensure stable internet connection

**Q: How much memory does Letta use?**
A: Typically 50-150MB depending on project size and features enabled.

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with [Letta AI](https://letta.ai) for intelligent code analysis
- Uses [Chokidar](https://github.com/paulmillr/chokidar) for file watching
- Styled with [Chalk](https://github.com/chalk/chalk) for beautiful terminal output

---

<div align="center">

**Made with ♥ for developers who want to code smarter, not harder.**

[Report Bug](../../issues) • [Request Feature](../../issues) • [Contribute](../../pulls)

</div>
