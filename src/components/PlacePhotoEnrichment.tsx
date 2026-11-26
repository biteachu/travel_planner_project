"use client";
import { useEffect, useRef, useState } from "react";
import type { Trip } from "../lib/trip";
import { activityPhoto, photoSchema, type Visuals } from "../lib/guide-visuals";
import { routeSearchTerm } from "../lib/route-location";

export function PlacePhotoEnrichment({
  trip,
  onChange,
}: {
  trip: Trip;
  onChange: (update: (previous: Visuals) => Visuals) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [trip.id]);
  const guideSignature = (trip.placeGuides || [])
    .map((g) => `${g.activityId}:${g.name}`)
    .join("|");
  useEffect(() => {
    if (guideSignature && !controller.current) void collect();
    // A completed/newly enriched book gets matching place photos without another AI call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, guideSignature]);
  async function collect() {
    const ctrl = new AbortController();
    controller.current = ctrl;
    setBusy(true);
    let added = 0,
      failed = 0;
    const targets = trip.days
      .flatMap((day) =>
        day.activities
          .filter(
            (a) =>
              a.kind !== "이동" &&
              a.kind !== "숙박" &&
              !activityPhoto(trip, a.id, a.title, day.city),
          )
          .map((a) => ({ a, city: day.city })),
      )
      .slice(0, 90);
    const cache = new Map<string, unknown[]>();
    try {
      for (const [index, { a, city }] of targets.entries()) {
        ctrl.signal.throwIfAborted();
        setMessage(
          `장소 사진 확인 중 · ${index + 1}/${targets.length} · ${a.title}`,
        );
        const guide = trip.placeGuides?.find(
          (g) => g.activityId === a.id && g.activityTitle === a.title,
        );
        const query = (
          guide?.name ||
          a.placeName ||
          routeSearchTerm(a.title)
        ).slice(0, 250);
        const cacheKey = `${city}:${query}`;
        try {
          let matches = cache.get(cacheKey);
          if (!matches) {
            const response = await fetch("/api/place-media", {
              method: "POST",
              signal: ctrl.signal,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query, city, route: true, photos: true }),
            });
            if (!response.ok) throw new Error("PHOTO_LOOKUP_FAILED");
            matches = (await response.json()).candidates || [];
            cache.set(cacheKey, matches!);
          }
          const photo = photoSchema.safeParse(
            (matches?.[0] as { photo?: unknown } | undefined)?.photo,
          );
          if (photo.success) {
            ctrl.signal.throwIfAborted();
            onChange((previous) => ({
              ...previous,
              photos: [
                ...previous.photos.filter((p) => p.activityId !== a.id),
                {
                  ...photo.data,
                  city,
                  activityId: a.id,
                  activityTitle: a.title,
                },
              ].slice(0, 120),
            }));
            added++;
          }
        } catch {
          if (ctrl.signal.aborted) throw new Error("CANCELLED");
          failed++;
        }
      }
      setMessage(
        `${added}개 일정에 사진을 연결했습니다.${failed ? ` ${failed}개 조회는 실패했습니다.` : ""} 찾지 못한 장소는 ‘사진·지도 보완’에서 직접 검색할 수 있습니다. 보관을 누르면 사진도 저장됩니다.`,
      );
    } catch {
      setMessage(
        `사진 찾기를 중단했습니다. 연결한 ${added}개 사진은 유지됩니다.`,
      );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <div className="photo-enrichment">
      <div>
        <strong>여정의 풍경을 채워 보세요</strong>
        <p>
          방문 장소와 이름·위치가 맞고 재사용 조건이 확인된 사진을 찾습니다. AI
          키 없이 사용할 수 있습니다.
        </p>
      </div>
      <button className="secondary" disabled={busy} onClick={collect}>
        장소별 사진 채우기
      </button>
      {busy && (
        <button
          className="text-button"
          onClick={() => controller.current?.abort()}
        >
          사진 찾기 중단
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
