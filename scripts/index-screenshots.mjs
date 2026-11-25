import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
const root = 'screenshots';
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stages = [
  { prefix: 'fa4b5fc', title: '1. 초기 디자인', reason: '크림색 배경·청록색 표지·기본 글꼴로 구성한 첫 화면.' },
  { prefix: '879e294', title: '2. 흰색·파랑 디자인', reason: '기본 글꼴과 누런 파스텔 톤을 바꿔 달라는 요청 → Pretendard·선명한 파랑·유리 질감 적용.' },
  { prefix: 'c3222f9', title: '3. 세계 여행 사진 디자인', reason: '두 지역만 지원하는 서비스처럼 보인다는 지적 → 세계 여행 문구와 다양한 여행지 사진 적용.' },
].map(s => ({ ...s, commit: manifest.commits.find(c => c.hash.startsWith(s.prefix)) }));
let count = 0, bytes = 0;
for (const entry of manifest.commits) {
  if (entry.files.some(f => !['home-desktop.png','home-mobile.png'].includes(f))) throw Error('Unexpected detailed screenshot');
  for (const file of entry.files) {
    const path = join(root, entry.folder, file);
    const meta = await sharp(path).metadata();
    if (meta.format !== 'png' || meta.width !== (file.includes('mobile') ? 390 : 1440)) throw Error(path);
    count++; bytes += (await stat(path)).size;
  }
}
const labels = {'no-ui':'화면 없음', reconstructed:'해당 커밋 재현', 'identical-ui':'동일 UI 재사용'};
const stageLinks = stages.map(s => `| ${s.title} | ${s.reason} | [PC](${s.commit.folder}/home-desktop.png) | [모바일](${s.commit.folder}/home-mobile.png) |`).join('\n');
const table = manifest.commits.map(e => `| ${e.hash.slice(0,7)} | ${e.subject.replaceAll('|','/')} | ${labels[e.status]} | ${e.files.length ? `[PC](${e.folder}/home-desktop.png) · [모바일](${e.folder}/home-mobile.png)` : '—'} |`).join('\n');
await writeFile(join(root,'README.md'), `# 디자인 변화 기록\n\n[대표 디자인 3단계 비교 열기](index.html)\n\n## 과정 영상에 사용할 대표 화면\n\n큰 디자인 변화는 두 번이며, 초기 상태까지 세 단계입니다. **아래 PC 3장 또는 PC·모바일 총 6장만 먼저 보시면 됩니다.** 영상은 아직 제작하지 않습니다.\n\n| 단계 | 바뀐 내용과 이유 | PC | 모바일 |\n|---|---|---|---|\n${stageLinks}\n\n## 커밋별 보관 규칙\n\n- 각 커밋에는 전체 첫 화면 PC·모바일 2장만 보관합니다. 세부 입력·편집·설정·가이드북 화면과 추가 시안 캡처는 현재 폴더에서 제외했습니다. 삭제 전 자료는 Git 커밋 6e7c50d에 남아 있습니다.\n- 대상은 ${manifest.head.slice(0,7)}까지 ${manifest.commits.length}개 커밋입니다. 화면이 없는 첫 커밋은 설명만 있습니다. 커밋별 ${count}장 + 최초 보존 원본 2장 = ${count + 2}장입니다.\n- 모든 커밋의 사진을 영상에 넣을 필요는 없습니다. 커밋별 폴더는 이력 확인용이고, 대표 화면은 위 세 단계입니다.\n- 커밋별 PNG는 과거 코드를 현재 환경에서 실행한 사후 재현본입니다. 동일 UI의 캡처 재사용은 manifest.json의 capturedFrom에 표시합니다.\n- PC 1440×1000 / 모바일 390×844 뷰포트의 전체 페이지이며 높이는 스크롤 길이에 따라 다릅니다. 현재 Node ${manifest.runtime.node}, Next ${manifest.runtime.next}, 설치된 Chrome을 사용했습니다. 개발 서버 표시가 포함될 수 있습니다.\n- 최초 구현 당시 보존 파일은 [original-initial](original-initial/README.md)에 별도 보관합니다.\n- 촬영 실행 시작(UTC): ${manifest.capturedAt}. 실제 사용자 키·로그인 없이 공개 예시를 사용했습니다.\n- 최신 화면의 사진 출처: [CREDITS](../public/travel-photos/CREDITS.md).\n\n## 전체 커밋 목록\n\n| 커밋 | 내용 | 상태 | 첫 화면 |\n|---|---|---|---|\n${table}\n`);
const cards = stages.map(s => `<section><h2>${escape(s.title)}</h2><p>${escape(s.reason)}</p><small>커밋 ${s.prefix} · 과거 코드 재현본</small><div class="views">${['desktop','mobile'].map(d => `<a href="${s.commit.folder}/home-${d}.png"><h3>${d === 'desktop' ? 'PC' : '모바일'}</h3><img src="${s.commit.folder}/home-${d}.png" alt="${escape(s.title)} ${d}"><span>전체 이미지 열기</span></a>`).join('')}</div></section>`).join('');
const rows = manifest.commits.map(e => `<tr><td>${e.hash.slice(0,7)}</td><td>${escape(e.subject)}</td><td>${labels[e.status]}</td><td>${e.files.map(f => `<a href="${e.folder}/${f}">${f.includes('mobile') ? '모바일' : 'PC'}</a>`).join(' · ')}</td></tr>`).join('');
await writeFile(join(root,'index.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>디자인 변화 · 세 단계</title><style>body{margin:0;background:#f4f6fb;color:#142139;font-family:system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:32px}h1{font-size:34px}section,details{padding:24px;background:white;border:1px solid #d9e0eb;border-radius:16px;margin:24px 0}a{color:#0754f8}.views{display:grid;grid-template-columns:2fr 1fr;gap:24px}.views img{width:100%;height:380px;object-fit:cover;object-position:top;border:1px solid #ddd}small{color:#526078}summary{cursor:pointer;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:12px 5px;border-bottom:1px solid #eee}.table-wrap{overflow:auto}@media(max-width:600px){main{padding:16px}.views{grid-template-columns:1fr}.views img{height:280px}}</style><main><h1>큰 디자인 변화는 두 번입니다.</h1><p>초기 화면 → 흰색·파랑 → 세계 여행 사진. 과정 영상은 이 세 단계의 PC 3장 또는 PC·모바일 6장을 중심으로 구성하면 됩니다.</p><p>미리보기는 위쪽 일부입니다. 누르면 전체 페이지 PNG가 열립니다. <a href="README.md">기록 안내</a> · <a href="original-initial/home-desktop.png">최초 보존 원본</a></p>${cards}<details><summary>전체 ${manifest.commits.length}개 커밋의 첫 화면 보기 — 이력 확인용</summary><div class="table-wrap"><table><tr><th>커밋</th><th>내용</th><th>상태</th><th>이미지</th></tr>${rows}</table></div></details></main></html>`);
const updateFolder = '2026-11-25-motion';
await stat(join(root, updateFolder, 'home-desktop.png'));
await stat(join(root, updateFolder, 'home-mobile.png'));
const readmePath = join(root, 'README.md');
await writeFile(readmePath, (await readFile(readmePath, 'utf8')).replace('## 커밋별 보관 규칙', `## 후속 동작 개선 · 2026-11-25\n\n기존 세계 여행 화면에 등장 효과를 추가했습니다. 전체 디자인을 다시 바꾼 단계는 아닙니다. [PC](${updateFolder}/home-desktop.png) · [모바일](${updateFolder}/home-mobile.png) · [기록](${updateFolder}/README.md). 아래 역사 캡처 90장 외에 이번 작업 2장이 추가되어 전체 92장입니다.\n\n## 커밋별 보관 규칙`));
const indexPath = join(root, 'index.html');
await writeFile(indexPath, (await readFile(indexPath, 'utf8')).replace('<details><summary>전체', `<p>후속 동작 개선: <a href="${updateFolder}/home-desktop.png">2026-11-25 PC</a> · <a href="${updateFolder}/home-mobile.png">모바일</a> · <a href="${updateFolder}/README.md">기록</a>. 기존 사진 구성에 등장 효과를 더한 개선입니다.</p><details><summary>전체`));
console.log(JSON.stringify({commitScreenshots: count,totalScreenshots:count+4,representativeScreenshots:6,megabytes:Math.round(bytes/1024/1024)}));
