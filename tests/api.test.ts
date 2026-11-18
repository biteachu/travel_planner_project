import {it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
const mocked=vi.hoisted(()=>({run:vi.fn()}));
vi.mock('../src/lib/agents',async()=>{const {z}=await import('zod');return {runAgent:mocked.run,stageSchema:z.enum(['check'])}});
import {POST} from '../src/app/api/agent/route';
it('UTF-8 바이트 한도를 넘는 본문은 모델 호출 없이 413으로 거절한다', async () => {
  const req = new NextRequest('http://localhost:3000/api/agent', {
    method: 'POST', headers: { origin: 'http://localhost:3000' },
    body: JSON.stringify({ key: 'test-only-large-request', stage: 'check', payload: '한'.repeat(120000) }),
  });
  expect((await POST(req)).status).toBe(413);
  expect(mocked.run).not.toHaveBeenCalled();
});
const request=(key='test-fake-api-key-123')=>new NextRequest('http://localhost:3000/api/agent',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({key,stage:'check',payload:{}})});
beforeEach(()=>{mocked.run.mockReset()});
it('제공사 오류 원문에서 키가 노출되어도 응답에 돌려주지 않는다',async()=>{mocked.run.mockRejectedValue(new Error('provider secret test-fake-api-key-123'));const response=await POST(request());expect(response.status).toBe(502);expect(await response.text()).not.toContain('test-fake-api-key-123')});
it('외부 출처 요청은 모델을 호출하지 않는다',async()=>{const req=new NextRequest('http://localhost:3000/api/agent',{method:'POST',headers:{origin:'https://other.example'},body:'{}'});expect((await POST(req)).status).toBe(403);expect(mocked.run).not.toHaveBeenCalled()});
it('동시 요청 거절이 실행 중 요청의 잠금을 해제하지 않는다',async()=>{let finish!:(value:unknown)=>void;mocked.run.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));const first=POST(request('test-only-concurrency-key'));await vi.waitFor(()=>expect(mocked.run).toHaveBeenCalledTimes(1));expect((await POST(request('test-only-concurrency-key'))).status).toBe(429);expect((await POST(request('test-only-concurrency-key'))).status).toBe(429);finish({connected:true});expect((await first).status).toBe(200)});
