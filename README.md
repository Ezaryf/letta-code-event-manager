# Letta Coding Assistant

AI-powered coding assistant that watches your code, analyzes changes, suggests fixes, and generates commit messages.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure your API key
cp .env.example .env
# Edit .env and add your LETTA_API_KEY from https://app.letta.ai

# 3. Create your agent (one-time)
npm run setup

# 4. Start the assistant on any project
npm run assist /path/to/your/project
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Create your Letta agent (one-time) |
| `npm run assist <path>` | Watch + Analyze + Fix + Commit |
| `npm run fix <path>` | Auto test-fix loop |
| `npm run cleanup` | Remove old agents |
| `npm run help` | Show all commands |

## Options

```bash
# Watch and analyze only (default)
npm run assist ../my-project

# Auto-apply fixes
npm run assist ../my-project -- --auto-fix

# Auto-apply + auto-commit messages
npm run assist ../my-project -- --auto-fix --auto-commit
```

## Configuration

All settings in `.env`:

```env
LETTA_API_KEY=sk-let-...     # Required: Your Letta API key
AUTO_APPLY=false              # Auto-apply fixes without confirmation
MIN_CONFIDENCE=0.7            # Minimum confidence to auto-apply
MAX_FIX_ATTEMPTS=10           # Max retry attempts for test-fix loop
```

## How It Works

1. **Watch** - Monitors your project folders for file changes
2. **Analyze** - Sends changed code to Letta for analysis
3. **Suggest** - Shows issues, bugs, and improvements
4. **Fix** - Optionally auto-applies fixes (with backups)
5. **Commit** - Generates commit messages in DDMMYY format

## Backups

When auto-fix is enabled, backups are saved to `.letta-backups/` in your project (auto-added to .gitignore).

## Works With Any Project

- Next.js / React
- Node.js
- TypeScript / JavaScript
- Vue.js
- Any project with standard folder structure (src/, app/, components/, etc.)
