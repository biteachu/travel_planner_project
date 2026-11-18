import {z} from 'zod';

const text=z.string().max(5000);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===v},'유효한 날짜를 입력해 주세요');
export const briefSchema=z.object({country:z.string().min(1).max(100),cities:text,startDate:date,endDate:date,people:z.number().int().min(1).max(30),rooms:z.number().int().min(1).max(20),budget:z.number().positive().max(1e9),currency:z.enum(['KRW','USD','EUR','JPY','TRY']),pace:z.enum(['여유롭게','균형 있게','알차게']),interests:z.array(z.string().max(100)).max(20),preferences:text,avoid:text,arrival:text,departure:text,reservations:text}).refine(b=>b.endDate>=b.startDate,'종료일은 시작일 이후여야 합니다').refine(b=>dayCount(b.startDate,b.endDate)<=31,'한 번에 최대 31일까지 계획할 수 있습니다');
export type Brief=z.infer<typeof briefSchema>;
export const sourceSchema=z.object({id:z.string().max(100),title:text,url:z.string().max(2000),provider:z.enum(['Google Maps','웹','사용자','예시']),checkedAt:text});
export const activitySchema=z.object({id:z.string().min(1).max(100),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),duration:z.number().int().min(0).max(1440),title:z.string().min(1).max(300),kind:z.enum(['관광','식사','이동','휴식','숙박']),description:text,reason:text,transport:text,cost:z.number().min(0).max(1e9).nullable(),costStatus:z.enum(['추정','입력','조회','미확인']),locked:z.boolean(),sourceIds:z.array(z.string()).max(30),alternative:text});
export const daySchema=z.object({date,title:text,city:text,activities:z.array(activitySchema).max(30)});
export const baseSchema=z.object({city:z.string().min(1).max(200),nights:z.number().int().min(0).max(30),reason:text,neighborhood:text});
export const outlineSchema=z.object({title:text,summary:text,bases:z.array(baseSchema).min(1).max(15),questions:z.array(text).max(5)});
export type Outline=z.infer<typeof outlineSchema>;
export const tripSchema=z.object({id:z.string().min(1).max(100),version:z.number().int().positive(),title:z.string().min(1).max(300),summary:text,brief:briefSchema,bases:z.array(baseSchema).max(15),days:z.array(daySchema).min(1).max(31),tips:z.array(text).max(30),stories:z.array(z.object({title:text,body:text,sourceIds:z.array(z.string())})).max(30),sources:z.array(sourceSchema).max(300),warnings:z.array(text).max(100),status:z.enum(['초안','확인 필요','검토 완료']),isExample:z.boolean(),updatedAt:text});
export type Trip=z.infer<typeof tripSchema>;
export type Activity=z.infer<typeof activitySchema>;
export function dayCount(start:string,end:string){return Math.round((Date.parse(end)-Date.parse(start))/86400000)+1}
export function datesBetween(start:string,end:string){return Array.from({length:Math.max(0,Math.min(31,dayCount(start,end)))},(_,i)=>new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10))}
export function safeUrl(value:string){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u.href:undefined}catch{return undefined}}
export function mapUrl(name:string){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name)}
export function money(n:number,currency:string){return new Intl.NumberFormat('ko-KR',{style:'currency',currency,maximumFractionDigits:0}).format(n)}
export function costSummary(t:Trip){const a=t.days.flatMap(d=>d.activities);return {known:a.reduce((sum,x)=>sum+(x.cost??0),0),unknown:a.filter(x=>x.cost===null).length}}
export function validateTrip(t:Trip,previous?:Trip):string[]{
 const issues:string[]=[]; const expected=datesBetween(t.brief.startDate,t.brief.endDate); const actual=t.days.map(d=>d.date);
 if(new Set(actual).size!==actual.length)issues.push('중복된 여행 날짜가 있습니다.');
 if(expected.length!==actual.length||expected.some(d=>!actual.includes(d)))issues.push('여행 기간과 날짜별 일정이 일치하지 않습니다.');
 if(t.bases.reduce((n,b)=>n+b.nights,0)!==expected.length-1)issues.push('숙박 일수 합계를 확인해 주세요.');
 const ids=new Set<string>();
 for(const d of t.days){let lastEnd=0;for(const a of [...d.activities].sort((a,b)=>a.time.localeCompare(b.time))){const [h,m]=a.time.split(':').map(Number);const start=h*60+m;if(start<lastEnd)issues.push(`${d.date}: ${a.title} 시간이 겹칩니다.`);lastEnd=Math.max(lastEnd,start+a.duration);if(lastEnd>1440)issues.push(`${d.date}: 자정을 넘는 일정은 다음 날짜로 나눠 주세요.`);if(ids.has(a.id))issues.push('활동 식별자가 중복되었습니다.');ids.add(a.id);if(a.sourceIds.some(id=>!t.sources.some(s=>s.id===id)))issues.push(`${a.title}: 연결되지 않은 출처가 있습니다.`)}}
 if(previous){for(const d of previous.days)for(const a of d.activities.filter(a=>a.locked)){const n=t.days.find(x=>x.date===d.date)?.activities.find(x=>x.id===a.id);if(!n||JSON.stringify(n)!==JSON.stringify(a))issues.push(`고정 일정 '${a.title}'이 변경되었습니다.`)}}
 if(costSummary(t).known>t.brief.budget)issues.push('현재 계산된 경비가 총예산을 초과합니다.');
 return [...new Set(issues)];
}
