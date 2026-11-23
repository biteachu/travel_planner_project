export const bookingPrivacyMessage =
  "예약번호로 보이는 내용이 있습니다. 예약번호·확인 코드를 지우고 다시 시도해 주세요. 일정 이름과 날짜·시간은 유지하셔도 됩니다.";

export class BookingPrivacyError extends Error {
  constructor() {
    super(bookingPrivacyMessage);
    this.name = "BookingPrivacyError";
  }
}

// A limited guard for explicitly labelled references, not a general PII detector.
// Never include the matched value in an error or log.
const labelledReference =
  /(?:예약\s*(?:번호|코드)|확인\s*코드|\bbooking\s*(?:reference|number|code|id)|\bconfirmation\s*(?:number|code)|\bpnr)\s*[:=#]\s*([a-z0-9-]{4,32})(?![a-z0-9-])/gi;

export function assertNoBookingReferences(value: unknown): void {
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === "string") {
      for (const match of item.normalize("NFKC").matchAll(labelledReference)) {
        if (/\d/.test(match[1]) || /^[A-Z]{5,12}$/.test(match[1]))
          throw new BookingPrivacyError();
      }
    } else if (item && typeof item === "object" && !seen.has(item)) {
      seen.add(item);
      pending.push(...Object.values(item));
    }
  }
}
