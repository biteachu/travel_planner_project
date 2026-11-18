"use client";
import { useState } from "react";
import {
  fixedEventSchema,
  briefSchema,
  type Brief,
  type FixedEvent,
} from "../lib/trip";

export function ReservationsEditor({
  brief,
  onChange,
}: {
  brief: Brief;
  onChange: (events: FixedEvent[]) => void;
}) {
  const [date, setDate] = useState(brief.startDate);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<FixedEvent["kind"]>("관광");
  const [error, setError] = useState("");
  const events = brief.fixedEvents || [];
  function add() {
    const parsed = fixedEventSchema.safeParse({
      id: crypto.randomUUID(),
      date,
      time,
      duration,
      title,
      kind,
    });
    if (!parsed.success) {
      setError(
        "일정 이름·날짜·시작 시간과 1분 이상의 소요 시간을 입력해 주세요.",
      );
      return;
    }
    const result = briefSchema.safeParse({
      ...brief,
      fixedEvents: [...events, parsed.data],
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onChange([...events, parsed.data]);
    setTitle("");
    setError("");
  }
  return (
    <fieldset className="full reservation-editor">
      <legend>시간을 고정할 확정 일정</legend>
      <p className="quiet-note">
        현지 날짜와 시간을 입력해 주세요. 추가한 일정은 생성·재생성에서
        보호합니다. 예약번호·여권정보는 입력하지 마세요. 숙박 전체가 아닌 체크인
        시간처럼 실제 시간을 비워 둘 구간을 등록하세요.
      </p>
      {events.map((event) => (
        <div className="reservation-row" key={event.id}>
          <span>
            <strong>{event.title}</strong>
            <br />
            {event.date} {event.time} · {event.duration}분 · {event.kind}
          </span>
          <button
            type="button"
            className="text-button"
            aria-label={`${event.title} 확정 일정 삭제`}
            onClick={() =>
              onChange(events.filter((item) => item.id !== event.id))
            }
          >
            삭제
          </button>
        </div>
      ))}
      <div className="form-grid">
        <label className="full">
          확정 일정 이름
          <input
            value={title}
            maxLength={300}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 미술관 예약 입장"
          />
        </label>
        <label>
          확정 일정 날짜
          <input
            type="date"
            min={brief.startDate}
            max={brief.endDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          확정 일정 시작 시간
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <label>
          확정 일정 소요 시간 · 분
          <input
            type="number"
            min={1}
            max={1440}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <label>
          확정 일정 종류
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as FixedEvent["kind"])}
          >
            {["관광", "식사", "이동", "휴식", "숙박"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="secondary"
        disabled={events.length >= 50}
        onClick={add}
      >
        확정 일정 추가
      </button>
    </fieldset>
  );
}
