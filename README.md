# 🤖 Letta Coding Assistant

AI-powered CLI coding assistant with real-time code analysis, auto-fixes, and commit generation.

## Features

- **👁️ Watch & Analyze** - Real-time code monitoring with AI analysis
- **🔧 Auto Test-Fix** - Automatically fix failing tests
- **💬 Chat** - Interactive chat with your AI agent
- **📝 Commit Generation** - AI-generated commit messages (DDMMYY format)

## Quick Start

```bash
# Install
npm install

# Configure API key
cp .env.example .env
# Edit .env and add your LETTA_API_KEY

# Launch interactive menu
npm start
```

## Usage

### Interactive Menu (Recommended)
```bash
npm start
```
This opens a user-friendly menu to select actions.

### Direct Commands
```bash
# Watch a project
npm run watch /path/to/project

# With auto-fix enabled
npm run watch /path/to/project -- --auto-fix

# Run test-fix loop
npm run fix /path/to/project

# Chat with agent
npm run chat
```

## Menu Options

| Option | Description |
|--------|-------------|
| Watch & Analyze | Monitor code changes in real-time |
| Auto Test-Fix | Run tests and auto-fix failures |
| Chat with Agent | Ask questions or get help |
| Generate Commit | Create commit message from git diff |
| Setup Agent | Create or reconfigure your AI agent |
| Cleanup Agents | Remove unused agents |

## Configuration

Edit `.env`:

```env
LETTA_API_KEY=sk-let-...   # Required: Get from https://app.letta.ai
AUTO_APPLY=false            # Auto-apply fixes without confirmation
MIN_CONFIDENCE=0.7          # Minimum confidence for auto-fix
```

## Watch Options

When using Watch & Analyze, you can enable:
- **Auto-fix issues** - Automatically apply suggested fixes
- **Auto-commit** - Generate commit messages after fixes
- **Watch all files** - Monitor entire project (not just standard folders)
- **Debug mode** - Verbose logging

## Backups

When auto-fix is enabled, backups are saved to `.letta-backups/` in your project directory (automatically added to .gitignore).

## Supported Projects

Works with any JavaScript/TypeScript project:
- Next.js / React
- Node.js
- Vue.js
- Standard folder structures (src/, app/, components/, etc.)

## License

MIT
