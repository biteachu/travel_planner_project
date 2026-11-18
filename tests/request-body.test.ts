import { expect, it, vi } from "vitest";
import { readLimitedBody, RequestTooLarge } from "../src/lib/request-body";

function streamed(chunks: Uint8Array[], headers = {}) {
  let index = 0;
  const cancelled = vi.fn();
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (index < chunks.length) controller.enqueue(chunks[index++]);
        else controller.close();
      },
      cancel: cancelled,
    },
    { highWaterMark: 0 },
  );
  const request = new Request("https://example.com", {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as RequestInit);
  return { request, cancelled, readCount: () => index };
}
it("UTF-8 글자가 청크 경계에서 나뉘어도 원문을 보존한다", async () => {
  const bytes = new TextEncoder().encode('여행 {"도시":"서울"}');
  const { request } = streamed(
    [...bytes].map((byte) => new Uint8Array([byte])),
  );
  expect(await readLimitedBody(request, bytes.length)).toBe(
    '여행 {"도시":"서울"}',
  );
});
it.each([{}, { "content-length": "1" }])(
  "길이 헤더와 관계없이 초과 청크에서 수신을 취소한다: %j",
  async (headers) => {
    const input = streamed(
      [new Uint8Array(6), new Uint8Array(6), new Uint8Array(6)],
      headers,
    );
    await expect(readLimitedBody(input.request, 10)).rejects.toBeInstanceOf(
      RequestTooLarge,
    );
    expect(input.cancelled).toHaveBeenCalledTimes(1);
    expect(input.readCount()).toBe(2);
  },
);
it("선언된 길이가 초과하면 본문을 읽지 않는다", async () => {
  const input = streamed([new Uint8Array(20)], { "content-length": "20" });
  await expect(readLimitedBody(input.request, 10)).rejects.toBeInstanceOf(
    RequestTooLarge,
  );
  expect(input.readCount()).toBe(0);
  expect(input.cancelled).toHaveBeenCalledTimes(1);
});
