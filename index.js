#!/usr/bin/env node
/**
 * memory-slim - Slimmed memory MCP for Claude
 * Reduces token usage by grouping similar tools
 *
 * Usage:
 *   npx memory-slim                    # Run MCP server
 *   npx memory-slim --setup            # Auto-configure (interactive)
 *   npx memory-slim --setup claude     # Auto-configure for Claude Desktop
 *   npx memory-slim --setup cursor     # Auto-configure for Cursor
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');

const MCP_NAME = 'memory';
const PACKAGE_NAME = 'memory-slim';

// 환경변수 요구사항 (빌드 시 주입)
const REQUIRED_ENV_VARS = [];

// ============================================
// Setup Mode: Auto-configure MCP clients
// ============================================

const CONFIG_PATHS = {
  'claude': getClaudeDesktopConfigPath(),
  'claude-desktop': getClaudeDesktopConfigPath(),
  'cursor': getCursorConfigPath(),
};

function getClaudeDesktopConfigPath() {
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  } else if (os.platform() === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    return path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json');
  }
}

function getCursorConfigPath() {
  // Global config
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'mcp.json');
  } else {
    return path.join(os.homedir(), '.cursor', 'mcp.json');
  }
}

function addToConfig(configPath, mcpName, mcpConfig) {
  let config = { mcpServers: {} };

  // 디렉토리 생성
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 기존 설정 로드
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.error('⚠️  Failed to parse existing config, creating new one');
    }
  }

  // 이미 존재하는지 확인
  if (config.mcpServers[mcpName]) {
    console.log(`ℹ️  ${mcpName} already configured in ${configPath}`);
    return false;
  }

  // 새 MCP 추가
  config.mcpServers[mcpName] = mcpConfig;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Added ${mcpName} to ${configPath}`);
  return true;
}

async function interactiveSetup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n🔧 ' + PACKAGE_NAME + ' Setup\n');
  console.log('Select your MCP client:\n');
  console.log('  1. Claude Desktop');
  console.log('  2. Cursor');
  console.log('  3. Claude Code (CLI)');
  console.log('  4. VS Code (Copilot)');
  console.log('  5. Cancel\n');

  const choice = await question('Enter choice (1-5): ');
  rl.close();

  // 환경변수 플래그 생성
  const envFlags = REQUIRED_ENV_VARS.map(v => `--env ${v}=<YOUR_${v.split('_').pop()}>`).join(' ');
  const envJson = REQUIRED_ENV_VARS.length > 0
    ? `,"env":{${REQUIRED_ENV_VARS.map(v => `"${v}":"<YOUR_${v.split('_').pop()}>"`).join(',')}}`
    : '';

  switch (choice.trim()) {
    case '1':
      return setupClient('claude');
    case '2':
      return setupClient('cursor');
    case '3':
      console.log('\nRun this command:\n');
      if (REQUIRED_ENV_VARS.length > 0) {
        console.log(`  claude mcp add ${MCP_NAME} ${envFlags} -- npx -y ${PACKAGE_NAME}\n`);
      } else {
        console.log(`  claude mcp add ${MCP_NAME} -- npx -y ${PACKAGE_NAME}\n`);
      }
      return true;
    case '4':
      console.log('\nRun this command:\n');
      console.log(`  code --add-mcp '{"name":"${MCP_NAME}","command":"npx","args":["-y","${PACKAGE_NAME}"]${envJson}}'\n`);
      return true;
    case '5':
    default:
      console.log('Cancelled.');
      return false;
  }
}

function setupClient(client) {
  const configPath = CONFIG_PATHS[client];
  if (!configPath) {
    console.error(`❌ Unknown client: ${client}`);
    console.log('Supported: claude, claude-desktop, cursor');
    return false;
  }

  const mcpConfig = {
    command: 'npx',
    args: ['-y', PACKAGE_NAME]
  };

  // 환경변수가 필요한 경우 env 블록 추가 (플레이스홀더)
  if (REQUIRED_ENV_VARS.length > 0) {
    mcpConfig.env = {};
    for (const envVar of REQUIRED_ENV_VARS) {
      mcpConfig.env[envVar] = `<YOUR_${envVar.split('_').pop()}>`;
    }
  }

  const success = addToConfig(configPath, MCP_NAME, mcpConfig);

  if (success) {
    if (REQUIRED_ENV_VARS.length > 0) {
      console.log(`\n⚠️  This MCP requires environment variables!`);
      console.log(`   Edit ${configPath} and update:`);
      for (const envVar of REQUIRED_ENV_VARS) {
        console.log(`     - ${envVar}`);
      }
      console.log(`\n🎉 Setup complete! Update env vars, then restart ${client}.\n`);
    } else {
      console.log(`\n🎉 Setup complete! Restart ${client} to use ${MCP_NAME}.\n`);
    }
  }

  return success;
}

// ============================================
// Main: Check for --setup flag
// ============================================

const args = process.argv.slice(2);
const setupIndex = args.indexOf('--setup');

if (setupIndex !== -1) {
  const client = args[setupIndex + 1];

  if (client && !client.startsWith('-')) {
    // Specific client: npx xxx-slim --setup claude
    setupClient(client);
  } else {
    // Interactive: npx xxx-slim --setup
    interactiveSetup().then(() => process.exit(0));
  }
} else {
  // ============================================
  // Normal Mode: Run MCP server
  // ============================================

  const binName = os.platform() === 'win32' ? 'mcpslim.exe' : 'mcpslim';
  const mcpslimBin = path.join(__dirname, 'bin', binName);
  const recipePath = path.join(__dirname, 'recipes', 'memory.json');

  // 원본 MCP 명령어
  const originalMcp = process.env.MCPSLIM_ORIGINAL_MCP?.split(' ')
    || ["npx","-y","@modelcontextprotocol/server-memory"];

  const bridgeArgs = ['bridge', '--recipe', recipePath, '--', ...originalMcp];

  const child = spawn(mcpslimBin, bridgeArgs, {
    stdio: 'inherit',
    windowsHide: true
  });

  child.on('error', (err) => {
    console.error('Failed to start MCPSlim:', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => process.exit(code || 0));
}
