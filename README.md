# 🤖 Letta Coding Assistant

> **AI-Powered Code Analysis, Auto-Fixes & Intelligent Commit Generation**

Letta is a powerful command-line coding assistant that watches your code in real-time, analyzes it for bugs, security issues, and performance problems, automatically fixes failing tests, and generates intelligent commit messages. It integrates seamlessly with modern AI-native IDEs like Kiro, Cursor, and Windsurf.

---

## 📑 Table of Contents

1. [Features](#-features)
2. [Requirements](#-requirements)
3. [Installation](#-installation)
4. [Quick Start](#-quick-start)
5. [Configuration](#-configuration)
6. [Usage Guide](#-usage-guide)
   - [CLI Menu](#cli-menu)
   - [Code Watcher](#code-watcher)
   - [Auto Test-Fix](#auto-test-fix)
   - [Chat with Agent](#chat-with-agent)
   - [Git Tools](#git-tools)
7. [IDE Integration](#-ide-integration)
8. [Themes](#-themes)
9. [Agent System](#-agent-system)
10. [Keyboard Shortcuts](#-keyboard-shortcuts)
11. [Troubleshooting](#-troubleshooting)
12. [Advanced Configuration](#-advanced-configuration)
13. [Project Structure](#-project-structure)
14. [Contributing](#-contributing)
15. [License](#-license)

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| 🔍 **Real-time Code Watching** | Monitors your project files and analyzes changes instantly |
| 🐛 **Bug Detection** | Identifies bugs, security vulnerabilities, and performance issues |
| 🔧 **Auto Test-Fix** | Automatically fixes failing tests with AI-powered solutions |
| 📝 **Smart Commits** | Generates context-aware commit messages with conventional prefixes |
| 🎨 **5 Color Themes** | Ocean, Forest, Sunset, Midnight, and Mono themes |
| 💻 **IDE Detection** | Detects and integrates with 10+ IDEs including AI-native ones |
| 🧠 **Persistent Memory** | Agent remembers project context across sessions |
| ⌨️ **Arrow Key Navigation** | Modern menu navigation with keyboard support |

### Supported IDEs

**Agentic (AI-Native) IDEs:**
- 🤖 **Kiro** - AWS AI-powered IDE (full collaboration)
- 🤖 **Antigravity** - Autonomous AI IDE
- 🤖 **Cursor** - AI-first code editor
- 🤖 **Windsurf** - Codeium's agentic IDE

**Traditional IDEs:**
- 📝 VS Code
- 📝 JetBrains (IntelliJ, WebStorm, PyCharm)
- 📝 Neovim / Vim
- 📝 Sublime Text
- ⚡ Zed

---

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **npm** or **yarn**
- **Letta API Key** (get it from [app.letta.ai](https://app.letta.ai))
- **Git** (optional, for commit features)

---

## 🚀 Installation

### 1. Clone or Download

```bash
git clone https://github.com/your-repo/letta-coding-assistant.git
cd letta-coding-assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Letta API key:

```env
LETTA_API_KEY=sk-let-your-actual-api-key-here
```

### 4. Create Your AI Agent

```bash
npm run setup
```

This creates a personalized AI agent that learns your coding patterns.

---

## ⚡ Quick Start

### Option 1: Interactive CLI (Recommended)

```bash
npm start
```

This opens the main menu where you can:
- Set up your API key and agent
- Watch and analyze code
- Auto-fix failing tests
- Chat with your AI agent
- Access all features

### Option 2: Direct Commands

```bash
# Watch a project
npm run watch /path/to/your/project

# Auto-fix tests
npm run fix /path/to/your/project

# Chat with agent
npm run chat
```

---

## ⚙️ Configuration

All configuration is done through the `.env` file. Here's a complete reference:

### API Configuration

```env
# Required: Your Letta API key
LETTA_API_KEY=sk-let-your-api-key-here

# Optional: Project ID for organization
LETTA_PROJECT_ID=
```

### Theme & Display

```env
# Color theme: ocean, forest, sunset, midnight, mono
LETTA_THEME=ocean

# Show timestamps on log lines
SHOW_TIMESTAMPS=true

# Show detailed analysis output
VERBOSE_OUTPUT=false
```

### Watcher Settings

```env
# Delay before analyzing after file change (ms)
WATCHER_DEBOUNCE=2000

# How many folder levels deep to watch
WATCHER_DEPTH=20

# File extensions to watch
WATCH_EXTENSIONS=.js,.jsx,.ts,.tsx,.json,.css,.scss,.md
```

### Auto-Fix Settings

```env
# Automatically apply fixes
AUTO_APPLY=false

# Minimum confidence to apply fix (0.0 to 1.0)
MIN_CONFIDENCE=0.7

# Maximum fix attempts per file
MAX_FIX_ATTEMPTS=10

# Create backup before modifying
BACKUP_BEFORE_FIX=true

# Issue types to auto-fix
FIX_TYPES=bug,security,performance
```

### IDE Collaboration

```env
# Force specific IDE (auto-detected by default)
# LETTA_IDE=kiro

# Enable AI collaboration with agentic IDEs
IDE_COLLABORATION=true
```

---

## 📖 Usage Guide

### CLI Menu

Launch the interactive menu:

```bash
npm start
```

**Main Menu Options:**

| Option | Description |
|--------|-------------|
| 🚀 Quick Setup | Configure API key and create agent (first time) |
| 👁️ Watch & Analyze | Monitor code changes in real-time |
| 🔧 Auto Test-Fix | Automatically fix failing tests |
| 🔍 Analyze Project | Deep code analysis of entire project |
| 💬 Chat with Agent | Ask questions, get help |
| 📄 Code Tools | Review, explain, refactor code |
| 🧪 Generate Tests | Create tests for your code |
| 🐛 Find Bugs | Scan for potential issues |
| 📝 Git Tools | Commit, diff, status |
| 📊 Agent Status | View agent info & memory |
| ⚙️ Settings | Configure options |

**Navigation:**
- Use **↑/↓ arrow keys** to move
- Press **Enter** to select
- Press **Esc** to go back
- Press **Ctrl+C** to exit

---

### Code Watcher

The code watcher monitors your project and analyzes files as you edit them.

**Start Watching:**

```bash
# From CLI menu
npm start → Watch & Analyze → Select project

# Direct command
npm run watch /path/to/project

# With auto-fix enabled
npm run watch /path/to/project --auto-fix

# With debug output
npm run watch /path/to/project --debug
```

**What It Shows:**

```
╭─────────────────────────────────────────────────────────────────╮
│  🤖 LETTA CODE WATCHER                                         │
╰─────────────────────────────────────────────────────────────────╯

  my-project v1.0.0
  A cool project description

  ⬢ node JS  │  150 files  │  25+10 deps  │  500KB

  5 core · 12 scripts · 3 templates · 8 tests
  4 configs

  Tools Jest · ESLint · TypeScript
  npm   start │ test │ build

  ─────────────────────────────────────────────────────────────────

  git ● main ◆ 3 uncommitted
      abc1234 311225 - Fix: Resolve login bug

  🤖 Kiro  AI  collaboration enabled

  ─────────────────────────────────────────────────────────────────

   WATCH  Theme: ocean │ Debounce: 2000ms

  ─────────────────────────────────────────────────────────────────
  q quit & commit  │  Ctrl+C quick exit  │  npm start menu
  ─────────────────────────────────────────────────────────────────

  14:30:15 ✓ Ready — watching 150 files

  14:30:20 ~ utils.js
  14:30:22 ● utils.js...
  14:30:25 ✓ utils.js (2.3s)

  14:31:00 ~ api.js
  14:31:02 ● api.js...
  14:31:06 ⚠ api.js (2 issues, 3.5s)
       ! Missing error handling on line 45
       · Consider using async/await on line 23
```

**File Status Icons:**
- `~` Modified file
- `+` New file added
- `-` File deleted
- `●` Analyzing...
- `✓` Analysis passed
- `⚠` Issues found

**Quitting the Watcher:**

Press **`q`** for the full experience:
1. Shows session summary
2. Opens commit assistant (if changes exist)
3. Offers to continue watching, return to menu, or exit

Press **Ctrl+C** for quick exit with summary.

---

### Auto Test-Fix

Automatically diagnose and fix failing tests.

**Usage:**

```bash
# Interactive mode (shows suggestions)
npm run fix /path/to/project

# Auto-apply mode (applies fixes automatically)
npm run fix /path/to/project --auto
```

**How It Works:**

1. **Runs your tests** (Jest, Vitest, or Mocha)
2. **Analyzes failures** - parses error output
3. **Generates fixes** - AI creates targeted solutions
4. **Applies changes** - modifies files (with backup)
5. **Re-runs tests** - verifies the fix worked
6. **Repeats** - up to 10 attempts until all pass

**Example Output:**

```
Letta Auto Test-Fix
==================================================
Target: /home/user/my-project
Auto: ON
==================================================

Project: React
Files: 150
Tests: 25

----------------------------------------
ATTEMPT 1/10
----------------------------------------

Running tests...
Tests failed
Issue: test_failure

Analyzing...
Diagnosis: Missing mock for API call
Confidence: 0.85

Applying fix...
  MODIFY src/api.test.js
  Modified

Re-running tests...

----------------------------------------
ATTEMPT 2/10
----------------------------------------

Running tests...

ALL TESTS PASSED! 🎉
```

**Supported Test Runners:**
- Jest
- Vitest
- Mocha

---

### Chat with Agent

Have a conversation with your AI coding assistant.

```bash
npm run chat
```

Or from the CLI menu: **Chat with Agent**

**Example Conversation:**

```
💬 CHAT WITH AGENT
  Type your message and press Enter
  Commands: 'exit' to quit, 'clear' to clear screen

  You: How do I fix a memory leak in React?

  🤖 Agent: Memory leaks in React typically occur when:

  1. **Subscriptions not cleaned up** - Always return cleanup functions:
     ```javascript
     useEffect(() => {
       const subscription = api.subscribe();
       return () => subscription.unsubscribe();
     }, []);
     ```

  2. **Timers not cleared**:
     ```javascript
     useEffect(() => {
       const timer = setInterval(doSomething, 1000);
       return () => clearInterval(timer);
     }, []);
     ```

  3. **Event listeners not removed**...

  You: exit
  Returning to main menu...
```

---

### Git Tools

Access git-related features from the CLI menu: **Git Tools**

| Tool | Description |
|------|-------------|
| 📝 Generate Commit | AI-generated commit message |
| 📊 Git Status | View uncommitted changes |
| 📜 View Diff | See what changed |
| 🌿 Branch Info | Current branch details |
| 📋 Recent Commits | View commit history |

**Commit Message Format:**

Letta generates commit messages in this format:
```
DDMMYY - Type: Description
```

Examples:
- `311225 - Feat: Add user authentication`
- `311225 - Fix: Resolve null pointer in login`
- `311225 - Refactor: Simplify database queries`
- `311225 - Docs: Update API documentation`
- `311225 - Test: Add unit tests for utils`

**Conventional Commit Types:**
- `Feat:` - New feature
- `Fix:` - Bug fix
- `Refactor:` - Code restructuring
- `Style:` - Formatting, styling
- `Docs:` - Documentation
- `Test:` - Tests
- `Chore:` - Maintenance
- `Perf:` - Performance
- `Build:` - Build system
- `CI:` - CI/CD changes

---

## 💻 IDE Integration

Letta automatically detects your IDE and adjusts its behavior accordingly.

### Detection Methods

Letta uses multiple signals to detect your IDE:
1. **Folder presence** - `.kiro/`, `.vscode/`, `.idea/`
2. **Config files** - IDE-specific configuration files
3. **Environment variables** - Set by the IDE
4. **Running processes** - IDE process detection

### Agentic IDE Features

When running in an AI-native IDE (Kiro, Cursor, Windsurf, Antigravity):

- **AI Collaboration** - Letta can share suggestions with your IDE
- **Shared Context** - Both tools understand your project
- **Coordinated Actions** - Avoid conflicting changes

### View IDE Info

From Settings menu: **IDE Detection**

```
IDE: Kiro
Type: 🤖 Agentic AI IDE
Confidence: 85%
Features: ai-native, specs, steering, hooks, mcp
Collaboration: ✓ Supported
```

---

## 🎨 Themes

Letta includes 5 beautiful color themes.

### Available Themes

| Theme | Description |
|-------|-------------|
| 🌊 **ocean** | Cyan accents, calm and professional (default) |
| 🌲 **forest** | Green tones, nature-inspired |
| 🌅 **sunset** | Warm reds and oranges |
| 🌙 **midnight** | Purple and gold, elegant dark theme |
| ⬜ **mono** | Monochrome, minimal and clean |

### Change Theme

**Option 1: Environment Variable**

Edit `.env`:
```env
LETTA_THEME=forest
```

**Option 2: Settings Menu**

```bash
npm start → Settings → Theme & Display
```

### Preview Themes

```bash
# Default (ocean)
npm run demo

# Specific theme
npm run demo:forest
npm run demo:sunset
npm run demo:midnight
```

---

## 🧠 Agent System

Letta uses a persistent AI agent that learns and remembers.

### Agent Memory Blocks

Your agent maintains several memory blocks:

| Block | Purpose |
|-------|---------|
| **persona** | Agent identity and communication style |
| **project_context** | Current project info and conventions |
| **coding_standards** | Code style and commit conventions |
| **dev_commands** | Project-specific commands |
| **user_preferences** | Your working style preferences |
| **learned_patterns** | Patterns learned from your codebase |

### Agent Commands

```bash
# Create new agent
npm run setup

# Force recreate (delete and create new)
npm run setup:force

# Upgrade to latest template
npm run setup:upgrade

# Clean up old agents
npm run cleanup

# Confirm cleanup
npm run cleanup -- --confirm
```

### Agent Template

The agent is created from `templates/agent/code_agent.json`. You can customize:
- System prompt
- Memory blocks
- Model selection
- Behavior rules

---

## ⌨️ Keyboard Shortcuts

### In Menus

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate options |
| W / K | Move up |
| S / J | Move down |
| Enter | Select option |
| Esc | Go back / Cancel |
| Ctrl+C | Exit |

### In Code Watcher

| Key | Action |
|-----|--------|
| q | Quit with full summary + commit assistant |
| Ctrl+C | Quick exit with summary |
| Esc | Quit |

### In Commit Assistant

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate options |
| Enter | Select |
| Esc | Cancel |

---

## 🔧 Troubleshooting

### Common Issues

#### "LETTA_API_KEY not configured"

**Solution:** Add your API key to `.env`:
```env
LETTA_API_KEY=sk-let-your-actual-key-here
```

Get your key from [app.letta.ai](https://app.letta.ai)

#### "No agent. Run: npm run setup"

**Solution:** Create an agent:
```bash
npm run setup
```

#### Arrow keys not working in menus

**Possible causes:**
1. Terminal doesn't support raw mode
2. Running in non-TTY environment

**Solutions:**
- Use W/S or K/J keys instead
- Run in a proper terminal (not piped)
- On Windows, use PowerShell or Windows Terminal

#### Tests not detected

**Solution:** Ensure you have a test runner installed:
```bash
# For Jest
npm install --save-dev jest

# For Vitest
npm install --save-dev vitest
```

#### Watcher not detecting changes

**Possible causes:**
1. File extension not in watch list
2. File in ignored directory
3. Debounce delay

**Solutions:**
- Check `WATCH_EXTENSIONS` in `.env`
- Ensure file isn't in `node_modules`, `.git`, etc.
- Wait for debounce period (default 2 seconds)

#### "Git status error"

**Solution:** Ensure you're in a git repository:
```bash
git init
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Via environment
DEBUG=true npm run watch /path/to/project

# Via flag
npm run watch /path/to/project --debug
```

### Reset Everything

If things are broken, reset to defaults:

```bash
# Delete agent
rm .letta_agent_id .letta_agent_config.json

# Reset config
cp .env.example .env

# Recreate agent
npm run setup
```

---

## 🔬 Advanced Configuration

### Custom Watch Patterns

Edit `.env` to customize what files are watched:

```env
# Watch more file types
WATCH_EXTENSIONS=.js,.jsx,.ts,.tsx,.json,.css,.scss,.md,.py,.go

# Increase depth for monorepos
WATCHER_DEPTH=30

# Faster response (lower debounce)
WATCHER_DEBOUNCE=1000
```

### Auto-Fix Tuning

```env
# More aggressive fixing
MIN_CONFIDENCE=0.5
MAX_FIX_ATTEMPTS=20

# Conservative fixing
MIN_CONFIDENCE=0.9
MAX_FIX_ATTEMPTS=5

# Only fix bugs and security issues
FIX_TYPES=bug,security
```

### Custom Agent Template

Edit `templates/agent/code_agent.json` to customize your agent:

```json
{
  "version": "1.0.0",
  "name": "MyCustomAgent",
  "model": "openai/gpt-4o",
  "system_prompt": "Your custom instructions...",
  "memory_blocks": [
    {
      "label": "custom_block",
      "value": "Custom memory content"
    }
  ]
}
```

Then recreate your agent:
```bash
npm run setup:force
```

---

## 📁 Project Structure

```
letta-coding-assistant/
├── scripts/                 # Main application scripts
│   ├── cli.js              # Interactive CLI menu
│   ├── assistant.js        # Code watcher & commit assistant
│   ├── autoTestFix.js      # Auto test-fix engine
│   ├── analyzer.js         # Code analysis utilities
│   ├── createAgent.js      # Agent creation
│   ├── cleanupAgents.js    # Agent cleanup
│   ├── dashboardDemo.js    # Theme demo
│   └── ...
├── src/
│   └── core/               # Core modules
│       ├── ideDetector.js  # IDE detection
│       ├── ideCoordinator.js
│       ├── configManager.js
│       └── ...
├── templates/
│   ├── agent/
│   │   └── code_agent.json # Agent template
│   ├── test_failure.txt    # Analysis templates
│   ├── runtime.txt
│   └── ...
├── tests/                   # Test files
├── .env.example            # Configuration template
├── .env                    # Your configuration (gitignored)
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   ```
5. **Commit with conventional format**
   ```bash
   git commit -m "Feat: Add amazing feature"
   ```
6. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Development Commands

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests
npm run test:property
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Letta AI](https://letta.ai) for the powerful AI agent platform
- [Chokidar](https://github.com/paulmillr/chokidar) for file watching
- [Chalk](https://github.com/chalk/chalk) for terminal styling
- All contributors and users!

---

<div align="center">

**Made with ♥ by the Letta Community**

[Report Bug](https://github.com/your-repo/issues) · [Request Feature](https://github.com/your-repo/issues) · [Documentation](https://docs.letta.ai)

</div>
