# memory-slim

> **Memory MCP server optimized for AI assistants** — Reduce context window tokens by 54.9% while keeping full functionality. Compatible with Claude, ChatGPT, Gemini, Cursor, and all MCP clients.

[![npm version](https://img.shields.io/npm/v/memory-slim.svg)](https://www.npmjs.com/package/memory-slim)
[![Test Status](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/mcpslim/mcpslim)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

## What is memory-slim?

A **token-optimized** version of the Memory [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

### The Problem

MCP tool schemas consume significant **context window tokens**. When AI assistants like Claude or ChatGPT load MCP tools, each tool definition takes up valuable context space.

The original `@modelcontextprotocol/server-memory` loads **9 tools** consuming approximately **~7,184 tokens** — that's space you could use for actual conversation.

### The Solution

`memory-slim` intelligently **groups 9 tools into 5 semantic operations**, reducing token usage by **54.9%** — with **zero functionality loss**.

Your AI assistant sees fewer, smarter tools. Every original capability remains available.

## Performance

| Metric | Original | Slim | Reduction |
|--------|----------|------|-----------|
| Tools | 9 | 5 | **-44%** |
| Schema Tokens | 2,054 | 388 | **81.1%** |
| Claude Code (est.) | ~7,184 | ~3,238 | **~54.9%** |

> **Benchmark Info**
> - Original: `@modelcontextprotocol/server-memory@2025.11.25`
> - Schema tokens measured with [tiktoken](https://github.com/openai/tiktoken) (cl100k_base)
> - Claude Code estimate includes ~570 tokens/tool overhead

## Quick Start

### One-Command Setup (Recommended)

```bash
# Claude Desktop - auto-configure
npx memory-slim --setup claude

# Cursor - auto-configure
npx memory-slim --setup cursor

# Interactive mode (choose your client)
npx memory-slim --setup
```

Done! Restart your app to use memory.

### CLI Tools (already have CLI?)

```bash
# Claude Code (creates .mcp.json in project root)
claude mcp add memory -s project -- npx -y memory-slim@latest

# Windows: use cmd /c wrapper
claude mcp add memory -s project -- cmd /c npx -y memory-slim@latest

# VS Code (Copilot, Cline, Roo Code)
code --add-mcp '{"name":"memory","command":"npx","args":["-y","memory-slim@latest"]}'
```

## Manual Setup

<details>
<summary>Click to expand manual configuration options</summary>

### Claude Desktop

Add to your `claude_desktop_config.json`:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "memory-slim@latest"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` (global) or `<project>/.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "memory-slim@latest"]
    }
  }
}
```

</details>

## How It Works

MCPSlim acts as a **transparent bridge** between AI models and the original MCP server:

```
┌─────────────────────────────────────────────────────────────────┐
│  Without MCPSlim                                                │
│                                                                 │
│  [AI Model] ──── reads 9 tool schemas ────→ [Original MCP]    │
│             (~7,184 tokens loaded into context)                 │
├─────────────────────────────────────────────────────────────────┤
│  With MCPSlim                                                   │
│                                                                 │
│  [AI Model] ───→ [MCPSlim Bridge] ───→ [Original MCP]           │
│       │                │                      │                 │
│   Sees 5 grouped      Translates to        Executes actual   │
│   tools only         original call       tool & returns    │
│   (~3,238 tokens)                                              │
└─────────────────────────────────────────────────────────────────┘
```

### How Translation Works

1. **AI reads slim schema** — Only 5 grouped tools instead of 9
2. **AI calls grouped tool** — e.g., `interaction({ action: "click", ... })`
3. **MCPSlim translates** — Converts to original: `browser_click({ ... })`
4. **Original MCP executes** — Real server processes the request
5. **Response returned** — Result passes back unchanged

**Zero functionality loss. 54.9% token savings.**

## Available Tool Groups

| Group | Actions |
|-------|---------|
| `create` | 2 |
| `delete` | 2 |
| `nodes` | 2 |
| `read` | 2 |

Plus **1 passthrough tool** — tools that don't group well are kept as-is with optimized descriptions.

## Compatibility

- ✅ **Full functionality** — All original `@modelcontextprotocol/server-memory` features preserved
- ✅ **All AI assistants** — Works with Claude, ChatGPT, Gemini, Copilot, and any MCP client
- ✅ **Drop-in replacement** — Same capabilities, just use grouped action names
- ✅ **Tested** — Schema compatibility verified via automated tests

## FAQ

### Does this reduce functionality?

**No.** Every original tool is accessible. Tools are grouped semantically (e.g., `click`, `hover`, `drag` → `interaction`), but all actions remain available via the `action` parameter.

### Why do AI assistants need token optimization?

AI models have limited context windows. MCP tool schemas consume tokens that could be used for conversation, code, or documents. Reducing tool schema size means more room for actual work.

### Is this officially supported?

MCPSlim is a community project. It wraps official MCP servers transparently — the original server does all the real work.

## License

MIT

---

<p align="center">
  Powered by <a href="https://github.com/mcpslim/mcpslim"><b>MCPSlim</b></a> — MCP Token Optimizer
  <br>
  <sub>Reduce AI context usage. Keep full functionality.</sub>
</p>
