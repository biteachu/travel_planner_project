"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  dayPlaces,
  placeSchema,
  type GuidePlace,
  type PlaceCandidate,
} from "../lib/guide-visuals";
import type { Trip } from "../lib/trip";
const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <p>지도를 불러오는 중입니다…</p>,
});
export function LiveDayMap({
  trip,
  index,
  onPlaces,
}: {
  trip: Trip;
  index: number;
  onPlaces: (places: GuidePlace[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const points = useMemo(() => dayPlaces(trip, index), [trip, index]);
  const unresolved = trip.days[index].activities.filter(
    (a) =>
      !["휴식", "이동"].includes(a.kind) &&
      !points.some((p) => p.activityId === a.id),
  );
  async function showMap() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (points.length) return;
    setBusy(true);
    const day = trip.days[index];
    const found: GuidePlace[] = [];
    let failed = false;
    try {
      for (const activity of day.activities
        .filter((a) => !["휴식", "이동"].includes(a.kind))
        .slice(0, 10)) {
        const response = await fetch("/api/place-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: activity.title.slice(0, 250),
            city: day.city,
            photos: false,
            route: true,
          }),
        });
        if (!response.ok) {
          failed = true;
          continue;
        }
        const data = await response.json();
        const match = (data.candidates as PlaceCandidate[])[0];
        if (!match) continue;
        const parsed = placeSchema.safeParse({
          ...match,
          activityId: activity.id,
          activityTitle: activity.title,
          city: day.city,
          reference: match.title !== activity.title,
        });
        if (parsed.success) found.push(parsed.data);
      }
      onPlaces(found);
      setMessage(
        found.length
          ? `${found.length}개 일정의 기준 장소를 연결했습니다. 숙소·식당이 미정인 일정은 주변 역 등 기준 장소이며 정확한 업체 위치가 아닙니다.`
          : failed
            ? "위치 조회 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "구체적인 장소명이 없는 일정은 위치를 확정할 수 없습니다. ‘사진·지도 보완’에서 기준 장소를 선택할 수 있습니다.",
      );
    } catch {
      setMessage(
        "위치 조회에 실패했습니다. Google Maps 길찾기를 이용하거나 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="live-map-panel">
      <button
        className="secondary"
        disabled={busy}
        onClick={showMap}
        aria-expanded={open}
      >
        {busy
          ? "장소 위치를 찾는 중…"
          : open
            ? "지도 접기"
            : "지도에서 동선 보기"}
      </button>
      {open && (
        <>
          {message && <p role="status">{message}</p>}
          {points.length > 0 && <RouteMap points={points} />}
          {points.length > 0 && (
            <ul className="route-note">
              {points.map((p) => (
                <li key={p.activityId}>
                  {p.number}번 · {p.title}
                  {p.reference ? " — 주변 탐색 기준점" : ""}
                </li>
              ))}
            </ul>
          )}
          {!busy && points.length > 0 && unresolved.length > 0 && (
            <p className="route-note">
              위치 미정: {unresolved.map((a) => a.title).join(" / ")}. 구체적인
              업체·장소를 선택한 뒤 연결해 주세요.
            </p>
          )}
          <p className="route-note">
            번호는 시간표 순서입니다. 점선은 방문 순서이며 실제 도로·소요시간이
            아닙니다. 좌표가 확인된 장소만 표시합니다.
          </p>
        </>
      )}
    </div>
  );
}
