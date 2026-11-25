import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({ create: vi.fn(), constructor: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    constructor(options: unknown) {
      mocks.constructor(options);
    }
    responses = { create: mocks.create };
  },
}));
import { createChatGPTSession } from "../src/lib/chatgpt";
beforeEach(() => vi.clearAllMocks());
async function* events(...items: unknown[]) {
  for (const item of items) yield item;
}
it("공식 Responses에 구독 토큰을 보내고 저장·재시도를 끄며 완료 후에만 JSON을 적용한다", async () => {
  mocks.create.mockResolvedValue(
    events(
      { type: "response.output_text.delta", delta: '{"ok":true}' },
      { type: "response.completed" },
    ),
  );
  const signal = new AbortController().signal;
  await expect(
    createChatGPTSession("test-oauth", "account-model", signal).generate(
      "role",
      {},
      z.object({ ok: z.boolean() }),
    ),
  ).resolves.toEqual({ ok: true });
  expect(mocks.constructor).toHaveBeenCalledWith(
    expect.objectContaining({
      apiKey: "test-oauth",
      baseURL: "https://api.openai.com/v1",
      maxRetries: 0,
    }),
  );
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      store: false,
      stream: true,
      model: "account-model",
    }),
    { signal },
  );
  expect(mocks.create.mock.calls[0][0]).not.toHaveProperty("max_output_tokens");
});
it("부분 JSON을 받았더라도 구독 한도 실패면 결과를 적용하지 않는다", async () => {
  mocks.create.mockResolvedValue(
    events(
      { type: "response.output_text.delta", delta: '{"ok":true}' },
      {
        type: "response.failed",
        response: {
          error: { code: "subscription_sharing_usage_limit_exceeded" },
        },
      },
    ),
  );
  await expect(
    createChatGPTSession(
      "test",
      "model",
      new AbortController().signal,
    ).generate("", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow("CHATGPT_LIMIT");
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it("중단된 스트림과 스키마에 맞지 않는 응답을 거부한다", async () => {
  mocks.create.mockResolvedValue(
    events({ type: "response.output_text.delta", delta: '{"ok":true}' }),
  );
  const ai = createChatGPTSession(
    "test",
    "model",
    new AbortController().signal,
  );
  await expect(
    ai.generate("", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow("MODEL_INCOMPLETE");
  mocks.create.mockResolvedValue(
    events(
      { type: "response.output_text.delta", delta: '{"ok":"wrong"}' },
      { type: "response.completed" },
    ),
  );
  await expect(
    ai.generate("", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow();
});
