import { it, expect } from "vitest";
import {
  assertNoBookingReferences,
  BookingPrivacyError,
} from "../src/lib/booking-privacy";
import { examples } from "../src/lib/examples";
import { exportGuidebook } from "../src/lib/export";

it.each([
  "예약번호: AB1234",
  "Booking reference = QWERTY",
  "PNR#ABC-123",
  "예약번호：ＡＢ１２３４",
])("명시된 예약 코드를 거절하고 오류에는 값을 포함하지 않는다: %s", (value) => {
  expect(() =>
    assertNoBookingReferences({ nested: [{ note: value }] }),
  ).toThrow(BookingPrivacyError);
  try {
    assertNoBookingReferences(value);
  } catch (error) {
    expect(String(error)).not.toContain(value);
  }
});
it("일반 일정과 예약번호 입력 금지 안내는 허용한다", () => {
  expect(() =>
    assertNoBookingReferences([
      "예약번호는 입력하지 마세요",
      "예약번호: 없음",
      "10:00 미술관 예약 입장",
      "2026-11-23",
    ]),
  ).not.toThrow();
});
it("공유할 본문의 코드는 막고 출력에서 제외한 상세나 원문은 검사 대상에 넣지 않는다", () => {
  const trip = structuredClone(examples[0]);
  trip.brief.reservations = "예약번호: INPUT123";
  expect(() => exportGuidebook(trip)).not.toThrow();
  trip.days[0].activities[0].description = "예약번호: BODY123";
  expect(() => exportGuidebook(trip)).toThrow(BookingPrivacyError);
  const html = exportGuidebook(trip, {
    profile: true,
    details: false,
    lodging: true,
    budget: true,
  });
  expect(html).not.toContain("BODY123");
  expect(html).not.toContain("INPUT123");
  expect(trip.days[0].activities[0].description).toBe("예약번호: BODY123");
});
