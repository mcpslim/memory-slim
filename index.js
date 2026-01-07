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
 *   npx memory-slim --setup claude-code # Auto-configure for Claude Code CLI
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');

const MCP_NAME = 'memory-slim';
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
        console.log(`  claude mcp add ${MCP_NAME} -s project ${envFlags} -- npx -y ${PACKAGE_NAME}@latest\n`);
      } else {
        console.log(`  claude mcp add ${MCP_NAME} -s project -- npx -y ${PACKAGE_NAME}@latest\n`);
      }
      console.log('  (Windows: use "cmd /c npx" instead of "npx")\n');
      return true;
    case '4':
      console.log('\nRun this command:\n');
      console.log(`  code --add-mcp '{"name":"${MCP_NAME}","command":"npx","args":["-y","${PACKAGE_NAME}@latest"]${envJson}}'\n`);
      return true;
    case '5':
    default:
      console.log('Cancelled.');
      return false;
  }
}

function setupClaudeCode() {
  // 환경변수 플래그 생성
  const envFlags = REQUIRED_ENV_VARS.map(v => `--env ${v}=<YOUR_${v.split('_').pop()}>`).join(' ');

  // Windows에서는 cmd /c wrapper 필요
  const npxCmd = os.platform() === 'win32' ? 'cmd /c npx' : 'npx';

  let cmd = `claude mcp add ${MCP_NAME} -s project`;
  if (REQUIRED_ENV_VARS.length > 0) {
    cmd += ` ${envFlags}`;
  }
  cmd += ` -- ${npxCmd} -y ${PACKAGE_NAME}@latest`;

  console.log(`\n🔧 Adding ${MCP_NAME} to Claude Code...\n`);
  console.log(`Running: ${cmd}\n`);

  try {
    execSync(cmd, { stdio: 'inherit', shell: true });
    console.log(`\n🎉 Setup complete! ${MCP_NAME} is now available in Claude Code.\n`);
    if (REQUIRED_ENV_VARS.length > 0) {
      console.log(`⚠️  Don't forget to set environment variables:`);
      for (const envVar of REQUIRED_ENV_VARS) {
        console.log(`   - ${envVar}`);
      }
      console.log('');
    }
    return true;
  } catch (err) {
    console.error(`\n❌ Failed to add MCP. Is Claude Code CLI installed?\n`);
    console.log(`Try running manually:\n  ${cmd}\n`);
    return false;
  }
}

function setupClient(client) {
  // Claude Code CLI는 별도 처리
  if (client === 'claude-code') {
    return setupClaudeCode();
  }

  const configPath = CONFIG_PATHS[client];
  if (!configPath) {
    console.error(`❌ Unknown client: ${client}`);
    console.log('Supported: claude, claude-desktop, cursor, claude-code');
    return false;
  }

  const mcpConfig = {
    command: 'npx',
    args: ['-y', PACKAGE_NAME + '@latest']
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

  // 플랫폼별 바이너리 이름 결정
  function getBinaryName() {
    const platform = os.platform();
    const arch = os.arch();
    if (platform === 'win32') {
      return 'mcpslim-windows-x64.exe';
    } else if (platform === 'darwin') {
      return arch === 'arm64' ? 'mcpslim-darwin-arm64' : 'mcpslim-darwin-x64';
    } else {
      return 'mcpslim-linux-x64';
    }
  }

  const binName = getBinaryName();
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
