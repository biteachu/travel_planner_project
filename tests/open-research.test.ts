import { it, expect, vi } from "vitest";
import {
  researchWikivoyage,
  selectTravelSections,
} from "../src/lib/open-research";
import { mergeResearch } from "../src/lib/research";
import { exportGuidebook } from "../src/lib/export";
import { examples } from "../src/lib/examples";

const fixture = {
  query: {
    pages: [
      {
        pageid: 12,
        title: "Test city",
        extract:
          "Overview\n== See ==\nMuseum\n== Eat ==\nCafe\n== Sleep ==\nStation area",
        revisions: [{ revid: 123, timestamp: "2026-01-01T00:00:00Z" }],
      },
    ],
  },
};
it("동명 장소 안내 문서는 여행지 출처나 조사 본문으로 사용하지 않는다", async () => {
  const ambiguous = structuredClone(fixture);
  const page = {
    ...ambiguous.query.pages[0],
    pageprops: { disambiguation: "" },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ query: { pages: [page] } })),
    );
  const result = await researchWikivoyage(
    ["Test city"],
    new AbortController().signal,
    fetcher,
  );
  expect(result.sources).toEqual([]);
  expect(result.text).toContain("같은 이름의 여러 장소");
  expect(result.text).not.toContain("Museum");
  expect(
    new URL(String(fetcher.mock.calls[0][0])).searchParams.get("ppprop"),
  ).toBe("disambiguation");
});
it("네트워크·응답 형식·본문 한도 오류를 자료 조회 실패로 구분한다", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValueOnce(new Response("not json"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ query: { pages: null } })),
    )
    .mockResolvedValueOnce(
      new Response("large", { headers: { "content-length": "3000001" } }),
    );
  for (let i = 0; i < 4; i++)
    await expect(
      researchWikivoyage(["Test city"], new AbortController().signal, fetcher),
    ).rejects.toThrow("OPEN_RESEARCH_UNAVAILABLE");
});
it("사용자가 취소한 조회를 자료 장애로 바꾸지 않는다", async () => {
  const controller = new AbortController();
  const reason = new Error("USER_CANCELLED");
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
    controller.abort(reason);
    throw reason;
  });
  await expect(
    researchWikivoyage(["Test city"], controller.signal, fetcher),
  ).rejects.toBe(reason);
});
it.skipIf(process.env.RUN_LIVE_RESEARCH !== "1")(
  "실제 공개 API에서 세 여행지의 본문·라이선스·버전을 읽는다",
  async () => {
    const result = await researchWikivoyage(
      ["Hiroshima", "Istanbul", "Cappadocia"],
      new AbortController().signal,
    );
    expect(result.sources).toHaveLength(3);
    expect(result.text).toContain("== Eat ==");
    expect(result.text).toContain("== Sleep ==");
    const ambiguous = await researchWikivoyage(
      ["Springfield"],
      new AbortController().signal,
    );
    expect(ambiguous.sources).toEqual([]);
    expect(ambiguous.text).toContain("같은 이름의 여러 장소");
    for (const source of result.sources) {
      expect(source.revision).toBeGreaterThan(0);
      expect(source.license).toBe("CC BY-SA 4.0");
    }
    console.log(
      JSON.stringify({
        method: result.method,
        sources: result.sources.map(({ title, revision, revisedAt }) => ({
          title,
          revision,
          revisedAt,
        })),
        textLength: result.text.length,
      }),
    );
  },
  30000,
);
it("공개 자료 조회는 고정 호스트·문서명만 보내고 라이선스와 버전을 보존한다", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(fixture)));
  const result = await researchWikivoyage(
    ["Test city"],
    new AbortController().signal,
    fetcher,
  );
  const [url, init] = fetcher.mock.calls[0];
  expect(new URL(String(url)).hostname).toBe("en.wikivoyage.org");
  expect(new URL(String(url)).searchParams.get("titles")).toBe("Test city");
  expect(init?.headers).toMatchObject({
    "User-Agent": expect.stringContaining("travel_planner_project"),
  });
  expect(result.sources[0]).toMatchObject({
    license: "CC BY-SA 4.0",
    revision: 123,
    provider: "Wikivoyage",
  });
  const merged = mergeResearch(null, result, "도시", 0, 1);
  expect(merged.text).toContain("[SOURCE base-0-wv-12;");
  expect(merged.sources[0].id).toBe("base-0-wv-12");
  const html = exportGuidebook({ ...examples[0], sources: merged.sources });
  expect(html).toContain("CC BY-SA 4.0");
  expect(html).toContain("한국어로 번역·요약");
  expect(html).toContain("action=history");
  expect(html).toContain("oldid=123");
});
it("앞부분이 긴 문서에서도 식당·숙박 섹션을 남긴다", () => {
  const text =
    "Intro".repeat(20000) +
    "\n== See ==\nSight\n== Eat ==\nFOOD_MARKER\n== Sleep ==\nSTAY_MARKER";
  const selected = selectTravelSections(text);
  expect(selected).toContain("FOOD_MARKER");
  expect(selected).toContain("STAY_MARKER");
  expect(selected.length).toBeLessThan(30000);
});
it("prioritizes an actual destination late in a long section", () => {
  const text =
    "Overview\n\n== See ==\n\n" +
    "Unrelated place\n\n".repeat(1000) +
    "Funaoka Onsen: architectural details.\n\n== Eat ==\n\nNamed restaurant: menu.";
  const selected = selectTravelSections(text, ["Funaoka Onsen"]);
  expect(selected).toContain("Funaoka Onsen: architectural details.");
  expect(selected).toContain("Named restaurant: menu.");
  expect(selected.length).toBeLessThan(30000);
});
it("다중 거점의 최종 합치기에서도 음식·숙박과 각 문서 표시를 남긴다", () => {
  const extract =
    "Intro".repeat(10000) +
    ["Get in", "Get around", "See", "Do", "Eat", "Sleep"]
      .map(
        (section) =>
          `\n== ${section} ==\n${section}_MARKER\n${"detail ".repeat(2000)}`,
      )
      .join("");
  const selected = selectTravelSections(extract);
  const incoming = {
    text: `[SOURCE wv-1; First]\n${selected}\n[SOURCE wv-2; Second]\n${selected}`,
    sources: [1, 2].map((id) => ({
      id: `wv-${id}`,
      title: `Page ${id}`,
      url: "https://example.com",
      provider: "웹" as const,
      checkedAt: "2026-11-18",
    })),
    method: "test",
  };
  for (const bases of [5, 15]) {
    const merged = mergeResearch(null, incoming, "City", 0, bases);
    expect(merged.text.match(/Eat_MARKER/g)).toHaveLength(2);
    expect(merged.text.match(/Sleep_MARKER/g)).toHaveLength(2);
    expect(merged.text).toContain("[SOURCE base-0-wv-1;");
    expect(merged.text).toContain("[SOURCE base-0-wv-2;");
    expect(merged.text.length).toBeLessThan(90000 / bases + 200);
  }
});
it("누락 문서는 근거로 등록하지 않고 운영 오류는 성공으로 숨기지 않는다", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          query: { pages: [{ title: "Missing", missing: true }] },
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "maxlag" } })),
    )
    .mockResolvedValueOnce(new Response("", { status: 429 }));
  const signal = new AbortController().signal;
  const result = await researchWikivoyage(["Missing"], signal, fetcher);
  expect(result.sources).toEqual([]);
  expect(result.text).toContain("찾지 못했습니다");
  await expect(researchWikivoyage(["Test"], signal, fetcher)).rejects.toThrow(
    "OPEN_RESEARCH_UNAVAILABLE",
  );
  await expect(researchWikivoyage(["Test"], signal, fetcher)).rejects.toThrow(
    "OPEN_RESEARCH_UNAVAILABLE",
  );
});
it("문서명으로 네임스페이스·복수 조회 삽입을 허용하지 않는다", async () => {
  const fetcher = vi.fn<typeof fetch>();
  for (const title of ["User:Someone", "One|Two", "City#Section"])
    await expect(
      researchWikivoyage([title], new AbortController().signal, fetcher),
    ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
