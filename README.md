# 🤖 Letta - AI-Powered Coding Assistant

Production-grade CLI tool for real-time code analysis, intelligent fixes, and automated commit generation.

## ✨ Features

- **👁️ Watch & Analyze** - Real-time code monitoring with AI-powered analysis
- **🔬 Deep Analysis** - Comprehensive project architecture and quality assessment
- **🔧 Auto Test-Fix** - Automatically fix failing tests
- **💬 Chat** - Interactive AI conversation for coding help
- **📝 Smart Commits** - AI-generated commit messages (DDMMYY format)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure API key
cp .env.example .env
# Edit .env and add your LETTA_API_KEY from https://app.letta.ai

# Launch interactive menu
npm start
```

## 📖 Usage

### Interactive Mode (Recommended)
```bash
npm start
```
Use arrow keys to navigate, Enter to select.

### Direct Commands
```bash
# Watch a project
npm run watch /path/to/project

# With auto-fix
npm run watch /path/to/project -- --auto-fix

# Auto test-fix
npm run fix /path/to/project

# Chat with AI
npm run chat
```

## 🎯 Commands

| Command | Description |
|---------|-------------|
| Watch & Analyze | Real-time code monitoring with instant feedback |
| Auto Test-Fix | Run tests and automatically fix failures |
| Chat | Ask coding questions, get explanations |
| Generate Commit | AI-powered commit message generation |
| Setup | Create or reconfigure your AI agent |
| Cleanup | Remove unused agents |

## ⚙️ Configuration

Edit `.env`:

```env
LETTA_API_KEY=sk-let-...   # Required: Get from https://app.letta.ai
AUTO_APPLY=false            # Auto-apply fixes without confirmation
MIN_CONFIDENCE=0.7          # Minimum confidence for auto-fix (0.0-1.0)
DEBUG=false                 # Enable debug logging
```

## 🔍 Analysis Capabilities

### Code Quality
- Bug detection
- Security vulnerability scanning
- Performance issue identification
- Code style and best practices

### Project Understanding
- Architecture pattern detection
- Dependency analysis
- Test coverage assessment
- Framework-specific insights

### Supported Languages
- JavaScript / TypeScript
- React / Next.js / Vue
- Node.js / Express
- Python (basic)
- Go / Rust (basic)

## 🛡️ Safety Features

- **Backups**: All auto-fixes create backups in `.letta-backups/`
- **Confidence Threshold**: Only applies fixes above minimum confidence
- **Git Integration**: Auto-adds backup folder to `.gitignore`
- **Non-destructive**: Watch mode is read-only by default

## 📊 Session Reports

After each watch session, you get:
- Files analyzed count
- Issues found/fixed
- AI-generated commit message
- Detailed logs in `logs/` folder

## 🏗️ Architecture

```
scripts/
├── cli.js           # Main entry point with interactive menu
├── assistant.js     # Watch & analyze functionality
├── autoTestFix.js   # Auto test-fix loop
├── createAgent.js   # Agent setup
├── cleanupAgents.js # Agent cleanup
├── sendMessage.js   # Chat with agent
├── generateCommitMsg.js  # Commit message generation
├── fileWatcher.js   # File change detection
└── memory.js        # Memory management
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit with format: `DDMMYY - Description`
4. Push and create a Pull Request

## 📄 License

MIT
