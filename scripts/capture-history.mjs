import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, cp, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';

// Reconstruct committed UI in isolated directories; never checkout or alter history.
const repo = process.cwd();
const target = process.argv[2] || 'HEAD';
const output = resolve(repo, 'screenshots');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
const commits = git('log', '--reverse', '--format=%H%x09%cI%x09%s', target).split('\n').map(line => {
  const [hash, date, ...subject] = line.split('\t');
  return { hash, date, subject: subject.join('\t') };
});
const temporary = join(tmpdir(), `travel-history-${Date.now()}`);
await mkdir(temporary, { recursive: true });
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const groups = new Map();
const manifest = { capturedAt: new Date().toISOString(), head: git('rev-parse', target), method: 'Historical source reconstruction; identical client source trees reuse captures explicitly.', runtime: { node: process.version, next: JSON.parse(await readFile('node_modules/next/package.json', 'utf8')).version }, commits: [] };
const serverOnly = /(?:^src\/app\/api\/|^src\/lib\/(?:agents|claude|open-research|agent-limit|request-body)\.ts$)/;
const sourcePaths = name => (name.startsWith('src/') || name.startsWith('public/') || /^(?:next\.config\..+|postcss\.config\..+|tsconfig\.json|package\.json|package-lock\.json)$/.test(name));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let server;
async function stop() {
  if (!server) return;
  try { execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], {stdio: 'ignore'}); } catch {}
  server = undefined;
}
async function shot(page, path) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode().catch(() => {}))));
  await page.screenshot({ path, fullPage: true, animations: 'disabled', scale: 'css' });
}
try {
  for (const [index, commit] of commits.entries()) {
    const tree = git('ls-tree', '-r', commit.hash).split('\n').map(line => {
      const [meta, name] = line.split('\t'); return { name, line, oid: meta.split(' ')[2] };
    });
    const dirName = `${String(index + 1).padStart(2, '0')}-${commit.hash.slice(0, 7)}`;
    const folder = join(output, dirName);
    await mkdir(folder, { recursive: true });
    const entry = { ...commit, folder: dirName, files: [] };
    if (!tree.some(f => f.name === 'src/app/page.tsx')) {
      entry.status = 'no-ui';
      await writeFile(join(folder, 'README.md'), `# ${commit.hash.slice(0,7)}\n\n${commit.subject}\n\n이 커밋은 README만 있으며 실행 가능한 앱 화면이 없습니다. 화면을 임의로 만들지 않았습니다.\n`);
    } else {
      const signature = createHash('sha256').update(tree.filter(f => sourcePaths(f.name) && !serverOnly.test(f.name)).map(f => f.line).join('\n')).digest('hex');
      entry.signature = signature;
      if (groups.has(signature)) {
        const original = groups.get(signature);
        for (const file of original.files) await cp(join(output, original.folder, file), join(folder, file));
        entry.files = [...original.files]; entry.status = 'identical-ui'; entry.capturedFrom = original.hash;
      } else {
        const snapshot = join(temporary, commit.hash.slice(0, 7));
        await mkdir(snapshot, { recursive: true });
        const archive = join(temporary, `${commit.hash.slice(0,7)}.tar`);
        const roots = [...new Set(tree.filter(f => sourcePaths(f.name)).map(f => f.name.startsWith('src/') ? 'src' : f.name.startsWith('public/') ? 'public' : f.name))];
        git('archive', '--format=tar', `--output=${archive}`, commit.hash, '--', ...roots);
        execFileSync('tar', ['-xf', archive, '-C', snapshot]);
        await symlink(join(repo, 'node_modules'), join(snapshot, 'node_modules'), 'junction');
        const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
        for (const key of Object.keys(env)) if (/SUPABASE|ANTHROPIC|GEMINI|GOOGLE_API_KEY|VERCEL|AGENT_LIMITER/.test(key)) delete env[key];
        server = spawn(process.execPath, [join(repo,'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname','127.0.0.1','--port','3117'], { cwd:snapshot, env, windowsHide:true, stdio:['ignore','pipe','pipe'] });
        let logs = ''; server.stdout.on('data', b => {logs = (logs + b).slice(-5000)}); server.stderr.on('data', b => {logs = (logs + b).slice(-5000)});
        let ready=false;
        for(let attempt=0;attempt<90;attempt++) { if(server.exitCode !== null) throw Error(`Server failed ${commit.hash}: ${logs}`); try { const r=await fetch('http://127.0.0.1:3117',{signal:AbortSignal.timeout(1500)}); if(r.ok){ready=true;break;} } catch {} await wait(500); }
        if(!ready) throw Error(`Server timeout ${commit.hash}: ${logs}`);
        for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
          const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
          const page = await context.newPage();
          await page.route('**/api/agent', route => route.abort());
          await page.goto('http://127.0.0.1:3117');
          const capture = async name => { const file=`${name}-${device}.png`; await shot(page,join(folder,file));entry.files.push(file); };
          await page.locator('.hero').waitFor();
          await capture('home');
          await page.getByRole('button',{name:'내 여행책 만들기',exact:true}).click();
          await capture('form-destination');
          await page.locator('.step-list button').nth(1).click();
          await capture('form-preferences');
          await page.locator('.step-list button').nth(2).click();
          await capture('form-budget');
          await page.goto('http://127.0.0.1:3117');
          await page.locator('.example-card').first().click();
          await page.getByRole('heading',{name:'바다 곁에서, 히로시마',exact:true}).waitFor();
          await capture('guidebook');
          await page.getByRole('button',{name:'일정 다듬기',exact:true}).click();
          await capture('editor');
          await page.locator('.key-button').click();
          await capture('api-settings');
          await context.close();
        }
        await stop();
        entry.status='reconstructed';entry.capturedFrom=commit.hash;
        groups.set(signature,entry);
      }
      await writeFile(join(folder,'README.md'), `# ${commit.hash.slice(0,7)}\n\n${commit.subject}\n\n- 커밋 시각: ${commit.date}\n- 재현 캡처 실행 시작: ${manifest.capturedAt}\n- 상태: ${entry.status}\n- 실제 캡처 코드 커밋: ${entry.capturedFrom}\n- PC 1440×1000 / 모바일 390×844, 전체 페이지 PNG\n- 사용자 로그인·API 키 없이 체험용 예시로 촬영했습니다. 연결 완료 상태를 조작하지 않았습니다.\n- 당시 촬영본이 아니라 커밋 소스의 사후 재현입니다. 동일 UI 트리 재사용은 manifest.json에 명시합니다.\n`);
    }
    manifest.commits.push(entry);
    await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(`${index+1}/${commits.length} ${commit.hash.slice(0,7)} ${entry.status} ${entry.files.length} screenshots`);
  }
} finally { await stop(); await browser.close(); }
console.log(`Completed ${commits.length} commits, ${groups.size} reconstructed UI trees.`);
