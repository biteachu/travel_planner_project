import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  retrieve: vi.fn(),
  constructor: vi.fn(),
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    constructor(options: unknown) {
      mocks.constructor(options);
    }
    messages = { create: mocks.create };
    models = { retrieve: mocks.retrieve };
  },
}));
import { createClaudeSession, defaultClaudeModel } from "../src/lib/claude";
import { runAgent } from "../src/lib/agents";
import { examples } from "../src/lib/examples";
import { datesBetween } from "../src/lib/trip";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_MODEL", "");
});
afterEach(() => vi.unstubAllEnvs());
const success = (value: unknown) => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: JSON.stringify(value) }],
});

it("사용자 키·고정 제공사 주소·취소 신호를 사용하고 자동 재시도하지 않는다", async () => {
  const controller = new AbortController();
  const session = createClaudeSession("test-only-user-key", controller.signal);
  mocks.create.mockResolvedValue(success({ count: 2 }));
  await expect(
    session.generate(
      "role",
      { preference: "quiet" },
      z.object({ count: z.number().min(1) }),
    ),
  ).resolves.toEqual({ count: 2 });
  expect(mocks.constructor).toHaveBeenCalledWith(
    expect.objectContaining({
      apiKey: "test-only-user-key",
      baseURL: "https://api.anthropic.com",
      maxRetries: 0,
    }),
  );
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      model: defaultClaudeModel,
      system: "role",
      output_config: {
        format: expect.objectContaining({ type: "json_schema" }),
      },
    }),
    { signal: controller.signal },
  );
  expect(JSON.stringify(mocks.create.mock.calls[0][0])).not.toContain(
    "test-only-user-key",
  );
});
it("연결 검사는 모델 조회만 수행하며 생성 성공으로 표시하지 않는다", async () => {
  vi.stubEnv("ANTHROPIC_MODEL", "test-model");
  mocks.retrieve.mockResolvedValue({ id: "resolved-test-model" });
  const signal = new AbortController().signal;
  await expect(
    createClaudeSession("test-key", signal).check(),
  ).resolves.toEqual({
    connected: true,
    provider: "Anthropic",
    model: "resolved-test-model",
  });
  expect(mocks.retrieve).toHaveBeenCalledWith("test-model", {}, { signal });
  expect(mocks.create).not.toHaveBeenCalled();
});
it.each([
  ["max_tokens", "MODEL_OUTPUT_LIMIT"],
  ["refusal", "MODEL_REFUSAL"],
  ["pause_turn", "MODEL_INCOMPLETE"],
])("%s 응답은 유효한 JSON이어도 적용하지 않는다", async (stop, error) => {
  mocks.create.mockResolvedValue({
    ...success({ count: 2 }),
    stop_reason: stop,
  });
  await expect(
    createClaudeSession("test-key", new AbortController().signal).generate(
      "role",
      {},
      z.object({ count: z.number() }),
    ),
  ).rejects.toThrow(error);
});
it("원래 Zod 제약을 응답에 다시 적용한다", async () => {
  mocks.create.mockResolvedValue(success({ count: 0 }));
  await expect(
    createClaudeSession("test-key", new AbortController().signal).generate(
      "role",
      {},
      z.object({ count: z.number().min(1) }),
    ),
  ).rejects.toBeInstanceOf(z.ZodError);
});
it("이미 취소된 작업은 제공사를 호출하지 않는다", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    createClaudeSession("test-key", controller.signal).check(),
  ).rejects.toThrow("ABORTED");
  expect(mocks.retrieve).not.toHaveBeenCalled();
});
it("총괄 에이전트의 실제 구조화 스키마와 취향을 Claude에 전달한다", async () => {
  const trip = examples[0];
  const outline = {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  };
  mocks.create.mockResolvedValue(success(outline));
  await expect(
    runAgent(
      "test-key",
      "outline",
      { brief: trip.brief },
      new AbortController().signal,
    ),
  ).resolves.toEqual({ result: outline });
  const request = mocks.create.mock.calls[0][0];
  expect(request.system).toContain("총괄 역할");
  expect(request.messages[0].content).toContain(trip.brief.preferences);
});

it("31일 여행의 하루 수정도 하루만 생성하고 다른 날짜·본문·출처를 보존한다", async () => {
  const trip = structuredClone(examples[0]);
  trip.brief.startDate = "2027-01-01";
  trip.brief.endDate = "2027-01-31";
  trip.bases = [{ ...trip.bases[0], nights: 30 }];
  trip.days = datesBetween(trip.brief.startDate, trip.brief.endDate).map(
    (date) => ({
      ...structuredClone(trip.days[0]),
      date,
      activities: trip.days[0].activities.map((a) => ({
        ...a,
        id: `${date}-${a.id}`,
      })),
    }),
  );
  const replacement = structuredClone(trip.days[15]);
  replacement.title = "수정된 하루";
  mocks.create.mockResolvedValue(success(replacement));
  const output = await runAgent(
    "test-key",
    "revise",
    { trip, date: replacement.date, instruction: "동선을 다듬어 주세요" },
    new AbortController().signal,
  );
  const result = (output as { result: typeof trip }).result;
  expect(result.days[15].title).toBe("수정된 하루");
  expect(result.days.filter((_, i) => i !== 15)).toEqual(
    trip.days.filter((_, i) => i !== 15),
  );
  expect(result.stories).toEqual(trip.stories);
  expect(result.sources).toEqual(trip.sources);
  expect(result.brief).toEqual(trip.brief);
  const schema = mocks.create.mock.calls[0][0].output_config.format.schema;
  expect(schema.properties).toHaveProperty("activities");
  expect(schema.properties).not.toHaveProperty("days");
});

it("하루 수정 응답의 날짜가 다르면 적용하지 않는다", async () => {
  mocks.create.mockResolvedValue(success(examples[0].days[1]));
  await expect(
    runAgent(
      "test-key",
      "revise",
      {
        trip: examples[0],
        date: examples[0].days[0].date,
        instruction: "수정",
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow("INVALID_DATE");
});
