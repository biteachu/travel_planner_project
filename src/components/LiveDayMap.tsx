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
    const normalize = (s: string) => s.replace(/[\s·()]/g, "");
    try {
      for (const activity of day.activities
        .filter((a) => !["휴식", "이동"].includes(a.kind))
        .slice(0, 10)) {
        const response = await fetch("/api/place-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `${day.city} ${activity.title}`.slice(0, 250),
            city: day.city,
            photos: false,
          }),
        });
        if (!response.ok) continue;
        const data = await response.json();
        const match = (data.candidates as PlaceCandidate[]).find(
          (p) =>
            normalize(p.title).length >= 3 &&
            normalize(activity.title).includes(normalize(p.title)),
        );
        if (!match) continue;
        const parsed = placeSchema.safeParse({
          ...match,
          activityId: activity.id,
          activityTitle: activity.title,
          city: day.city,
        });
        if (parsed.success) found.push(parsed.data);
      }
      onPlaces(found);
      setMessage(
        found.length
          ? `${found.length}곳의 위치를 찾았습니다. 실제 장소가 맞는지 확인해 주세요.`
          : "일치하는 장소 위치를 찾지 못했습니다. ‘사진·지도 보완’에서 연결하거나 Google Maps 길찾기를 이용해 주세요.",
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
          <p className="route-note">
            번호는 시간표 순서입니다. 점선은 방문 순서이며 실제 도로·소요시간이
            아닙니다. 좌표가 확인된 장소만 표시합니다.
          </p>
        </>
      )}
    </div>
  );
}
