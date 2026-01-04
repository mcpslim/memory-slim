# memory-slim

> 🚀 Memory MCP with **91.2% token reduction** for AI models

[![npm version](https://img.shields.io/npm/v/memory-slim.svg)](https://www.npmjs.com/package/memory-slim)
[![Test Status](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/palan-k/mcpslim)

## Performance

| Metric | Original | Slim | Improvement |
|--------|----------|------|-------------|
| Tools | 9 | 5 | **-44%** |
| Tokens | 2,054 | 181 | **91.2%** |

> **Version Info**
> - Original: `@modelcontextprotocol/server-memory@2025.11.25`
> - Slim version synced with original
> - Tokens measured with [tiktoken](https://github.com/openai/tiktoken) v1.0.21 (cl100k_base)

## Installation

```bash
npx memory-slim
```

## Usage

### Claude Desktop

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "memory-slim"]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add memory -- npx -y memory-slim
```

### Gemini CLI

```bash
gemini mcp add memory -- npx -y memory-slim
```

### VS Code (Copilot, Cline, etc.)

```bash
code --add-mcp '{"name":"memory","command":"npx","args":["-y","memory-slim"]}'
```

### Cursor

Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "memory-slim"]
    }
  }
}
```

## How It Works

MCPSlim acts as a **transparent bridge** between AI models and the original MCP server.

```
┌─────────────────────────────────────────────────────────────────┐
│  Without MCPSlim                                                │
│                                                                 │
│  [AI Model] ──── reads 9 tool schemas ────→ [Original MCP]    │
│             (2,054 tokens loaded into context)                    │
├─────────────────────────────────────────────────────────────────┤
│  With MCPSlim                                                   │
│                                                                 │
│  [AI Model] ───→ [MCPSlim Bridge] ───→ [Original MCP]           │
│       │                │                      │                 │
│   Sees 5 grouped      Translates to        Executes actual   │
│   tools only         original call       tool & returns    │
│   (181 tokens)                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Translation Flow

1. **AI reads slim schema** - Only 5 grouped tools instead of 9 (saves tokens)
2. **AI calls grouped tool** - e.g., `page({ action: "navigate", url: "..." })`
3. **MCPSlim translates** - Converts to: `navigate_page({ url: "..." })`
4. **Original MCP executes** - Real server processes the request
5. **Response returned** - Result passes back unchanged

**Zero functionality loss. 91.2% token savings.**

### Tool Groups

- `create`: 2 actions
- `delete`: 2 actions
- `nodes`: 2 actions
- `read`: 2 actions

- Plus 1 passthrough tool (ungrouped, but description slimmed)

## Compatibility

- ✅ All original `@modelcontextprotocol/server-memory` functionality preserved
- ✅ Works with Claude, Gemini, ChatGPT, Qwen, and any MCP-compatible AI
- ✅ Same API - just use grouped action names
- ✅ Schema compatibility verified via automated tests

## License

MIT

---

Powered by [MCPSlim](https://github.com/palan-k/mcpslim) - MCP Token Compression Bridge
