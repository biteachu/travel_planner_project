import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../src/lib/place-media", () => ({findPlaces:vi.fn(async()=>[]),commonsPhoto:vi.fn()}));
import { POST } from "../src/app/api/place-media/route";
afterEach(()=>vi.unstubAllEnvs());
function request(origin:string){return new NextRequest("http://localhost:3417/api/place-media",{method:"POST",headers:{host:"127.0.0.1:3417",origin,"content-type":"application/json"},body:JSON.stringify({query:"오사카",city:"오사카"})});}
it("accepts the fixed PC origin despite dev URL normalization",async()=>{vi.stubEnv("TRAVEL_LOCAL_CHATGPT","1");vi.stubEnv("VERCEL","");expect((await POST(request("http://127.0.0.1:3417"))).status).toBe(200);});
it("rejects unrelated origins and does not enable the PC exception in production",async()=>{vi.stubEnv("TRAVEL_LOCAL_CHATGPT","1");vi.stubEnv("VERCEL","");expect((await POST(request("https://evil.example"))).status).toBe(403);vi.stubEnv("VERCEL","1");expect((await POST(request("http://127.0.0.1:3417"))).status).toBe(403);});
