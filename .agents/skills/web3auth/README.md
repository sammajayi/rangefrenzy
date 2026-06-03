# Web3Auth Agent Skill

Agent skill for **MetaMask Embedded Wallets (Web3Auth)**. Teaches your AI coding assistant the SDK's architecture, authentication concepts, key derivation rules, platform quirks, and common mistakes — things that aren't obvious from the docs alone.

## Install

```bash
npx skills add web3auth/skill -y
```

Works with Cursor, Claude Code, Copilot, Kiro, Cline, Codex, Antigravity, Windsurf, and [40+ more agents](https://skills.sh).

To install globally (available in all projects) or target a specific agent:

```bash
npx skills add web3auth/skill -g -y            # global
npx skills add web3auth/skill -a cursor -y     # Cursor only
npx skills add web3auth/skill -a claude-code -y # Claude Code only
```

## Pair with the MCP server

The skill teaches the mental model. The [MCP server](https://mcp.web3auth.io) gives your AI real-time access to live docs, examples, and SDK source — use both together for best results.

Add to your MCP config:

```json
{
  "mcpServers": {
    "web3auth": {
      "url": "https://mcp.web3auth.io"
    }
  }
}
```

See the [full setup guide](https://github.com/Web3Auth/web3auth-mcp#readme) for one-click installs for every IDE (Cursor, VS Code, JetBrains, Claude, Windsurf, and more).

## Source

`SKILL.md` in this repo is auto-synced from [`Web3Auth/web3auth-mcp/skills/web3auth/SKILL.md`](https://github.com/Web3Auth/web3auth-mcp/blob/main/skills/web3auth/SKILL.md) on every push to that file.
