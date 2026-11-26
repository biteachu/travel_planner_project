"use client";
import { useEffect, useState } from "react";
import type { GuidePlace } from "../lib/guide-visuals";
import {
  googleMapViews,
  koreanGooglePlace,
  type TravelMode,
} from "../lib/google-maps";
export default function RouteMap({
  points,
}: {
  points: (GuidePlace & { number: number })[];
}) {
  const [key, setKey] = useState<string | null>(null);
  const [segment, setSegment] = useState(0);
  const [mode, setMode] = useState<TravelMode>("");
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/maps-config", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setKey(typeof data.key === "string" ? data.key : ""))
      .catch(() => {
        if (!ctrl.signal.aborted) setKey("");
      });
    return () => ctrl.abort();
  }, []);
  const views = googleMapViews(points, key || "", mode);
  const view = views[Math.min(segment, views.length - 1)];
  return (
    <div className="google-route-map">
      <strong>Google Maps · 한국어</strong>
      {key === null ? (
        <p role="status">지도를 불러오는 중입니다…</p>
      ) : view ? (
        <>
          {views.length > 1 && (
            <label>
              지도 구간
              <select
                value={Math.min(segment, views.length - 1)}
                onChange={(e) => setSegment(Number(e.target.value))}
              >
                {views.map((v, i) => (
                  <option key={i} value={i}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {view.url.includes("/directions?") && (
            <label>
              이동 수단
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as TravelMode)}
              >
                <option value="">Google 추천</option>
                <option value="walking">도보</option>
                <option value="transit">대중교통</option>
                <option value="driving">자동차</option>
              </select>
            </label>
          )}
          <iframe
            className="route-map"
            title={`한국어 Google Maps · ${view.label}`}
            src={view.url}
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
            style={{ width: "100%", border: 0, minHeight: 320 }}
          />
          <p className="route-note">
            한국어 표시를 요청한 Google 지도입니다. 번역이 없는 일부 지명은
            현지어로 표시될 수 있습니다. 이동 경로·시간은 선택한 수단과 Google
            지도 기준입니다.
          </p>
        </>
      ) : (
        <p className="route-note">
          내장 지도를 연결하고 있습니다. 아래 버튼으로 Google Maps에서 위치를
          확인하실 수 있습니다.
        </p>
      )}
      <div className="route-links">
        {points
          .filter(
            (p, i) =>
              points.findIndex(
                (other) => other.lat === p.lat && other.lon === p.lon,
              ) === i,
          )
          .map((p) => (
            <a
              key={p.activityId}
              href={koreanGooglePlace(p)}
              target="_blank"
              rel="noreferrer"
            >
              {p.title} · Google Maps 열기 ↗
            </a>
          ))}
      </div>
    </div>
  );
}
