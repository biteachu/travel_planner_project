import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
if (process.platform !== 'win32') throw new Error('이 실행기는 Windows DPAPI를 사용합니다.');
// A single process owns this host's rotating credentials and fixed loopback port.
const probe = createServer();
const openBrowser = () => spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Start-Process 'http://127.0.0.1:3417/'"], { windowsHide: true, stdio: 'ignore' });
try {
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(3417, '127.0.0.1', resolve); });
} catch (error) {
  if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    const response = await fetch('http://127.0.0.1:3417/api/chatgpt/status', { signal: AbortSignal.timeout(5000) });
    if ((await response.json()).available === true) { openBrowser(); process.exit(0); }
  }
  throw new Error('3417 포트를 사용할 수 없습니다. 기존 실행 창을 확인해 주세요.');
}
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3417'], { stdio: 'inherit', windowsHide: true, env: { ...process.env, TRAVEL_LOCAL_CHATGPT: '1' } });
child.on('exit', code => process.exit(code ?? 1));
if (process.argv.includes('--open')) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:3417/', { signal: AbortSignal.timeout(2000) });
      if (response.ok) { openBrowser(); break; }
    } catch { /* Wait for Next to accept local connections. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
