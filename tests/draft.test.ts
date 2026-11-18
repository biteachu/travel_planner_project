import { describe, expect, it } from "vitest";
import { encodeDraft, readDraft } from "../src/lib/draft";
import { examples } from "../src/lib/examples";

describe("입력 초안 보관", () => {
  it("미완성 입력을 복원하되 키와 알 수 없는 필드는 저장하지 않는다", () => {
    const brief = { ...examples[0].brief, country: "", startDate: "", people: 0, apiKey: "secret" };
    const encoded = encodeDraft({ brief, step: 1, apiKey: "secret" });
    expect(encoded).not.toContain("secret");
    expect(readDraft(encoded)).toMatchObject({ brief: { country: "", startDate: "", people: 0 }, step: 1 });
  });
  it("손상되거나 형태가 다른 저장값은 복원하지 않는다", () => {
    for (const value of [null, "{", "null", '{"brief":{}}']) {
      expect(readDraft(value)).toBeNull();
    }
  });
});
