import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('키 없이 예시를 편집·보관·다운로드하고 오프라인 열람한다',async({page,context},testInfo)=>{
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('당신의 취향');
 await page.screenshot({path:`docs/process/before/home-${testInfo.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:/한 도시에서, 조금 더 깊이 Hiroshima/}).click();
 await expect(page.getByRole('heading',{name:'바다 곁에서, 히로시마',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'일정 다듬기',exact:true}).click();
 await page.getByRole('textbox',{name:'활동 1 이름',exact:true}).fill('나만의 산책');
 await page.getByRole('button',{name:'보관',exact:true}).click();
 await page.getByRole('button',{name:'가이드북',exact:true}).click();
 await expect(page.getByRole('heading',{name:'나만의 산책',exact:true})).toBeVisible();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'HTML 다운로드',exact:true}).click();const file=await downloaded;const path=await file.path();expect(path).toBeTruthy();const html=await fs.readFile(path!,'utf8');expect(html).toContain('나만의 산책');expect(html).not.toContain('<script');
 const offline=await context.newPage();await context.setOffline(true);await offline.setContent(html);await expect(offline.getByRole('heading',{name:'나만의 산책',exact:true})).toBeVisible();expect(await offline.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await offline.screenshot({path:`docs/process/before/guidebook-${testInfo.project.name}.png`,fullPage:true});await context.setOffline(false);
 await page.reload();await page.getByRole('button',{name:'내 여행책',exact:true}).click();await expect(page.getByRole('button',{name:/바다 곁에서, 히로시마.*버전/})).toBeVisible();
});
test('키는 영구 저장하지 않고 새로고침 시 지운다',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'API 키 설정',exact:true}).click();await page.getByLabel('API 키',{exact:true}).fill('test-only-not-a-real-key');await page.getByRole('button',{name:'닫기',exact:true}).click();expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('test-only');await page.reload();await page.getByRole('button',{name:'API 키 설정',exact:true}).click();await expect(page.getByLabel('API 키',{exact:true})).toHaveValue('');
});
test('잘못된 여행 날짜는 API 호출 전에 거절한다',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'내 여행책 만들기'}).click();await page.getByLabel('어느 나라로 떠나시나요?').fill('일본');await page.getByLabel('여행 시작일').fill('2027-01-10');await page.getByLabel('여행 종료일').fill('2027-01-01');await page.getByRole('button',{name:'다음 단계'}).click();await page.getByRole('button',{name:'다음 단계'}).click();await page.getByRole('button',{name:'여행 골격 제안받기'}).click();await expect(page.getByRole('alert').filter({hasText:'종료일'})).toContainText('종료일');
});
