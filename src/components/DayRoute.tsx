import { dayPlaces, directionsLinks } from "../lib/guide-visuals";
import type { Trip } from "../lib/trip";
import type { ReactNode } from "react";
export function DayRoute({
  trip,
  index,
  lodging = true,
  interactive,
}: {
  trip: Trip;
  index: number;
  lodging?: boolean;
  interactive?: ReactNode;
}) {
  const day = trip.days[index];
  const points = dayPlaces(trip, index, lodging);
  const links = directionsLinks(trip, index, lodging);
  const names = day.activities.filter(
    (a) => (lodging || a.kind !== "숙박") && !["이동", "휴식"].includes(a.kind),
  );
  return (
    <div className="day-route">
      <div className="route-heading">
        <h3>오늘의 동선</h3>
        <span>{names.length}곳 · 일정 순서</span>
      </div>
      <ol className="route-stops">
        {names.map((a) => (
          <li
            key={a.id}
            value={day.activities.findIndex((item) => item.id === a.id) + 1}
          >
            {a.title}
          </li>
        ))}
      </ol>
      {interactive ?? (points.length > 1 && <RouteSketch points={points} />)}
      <div className="route-links">
        {links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
            {link.label} ↗
          </a>
        ))}
      </div>
      <p className="route-note">
        Google Maps에서 장소·이동 수단을 확인해 주세요. 이름으로 찾은 장소는
        다른 곳일 수 있습니다. 지도 연결은 인터넷이 필요합니다.
      </p>
    </div>
  );
}
function RouteSketch({ points }: { points: ReturnType<typeof dayPlaces> }) {
  const first = points[0].lon;
  const data = points.map((p) => ({
    ...p,
    x: first + (((p.lon - first + 540) % 360) - 180),
    y: -p.lat,
  }));
  const xs = data.map((p) => p.x),
    ys = data.map((p) => p.y);
  const minX = Math.min(...xs),
    minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX,
    spanY = Math.max(...ys) - minY;
  const scale = Math.min(500 / (spanX || 1), 180 / (spanY || 1));
  const positioned = data.map((p) => ({
    ...p,
    x: 50 + (500 - spanX * scale) / 2 + (p.x - minX) * scale,
    y: 40 + (180 - spanY * scale) / 2 + (p.y - minY) * scale,
  }));
  return (
    <figure className="route-sketch">
      <svg
        viewBox="0 0 600 260"
        role="img"
        aria-label="확인된 위치의 방문 순서도. 도로 지도나 실제 경로가 아닙니다."
      >
        <polyline
          points={positioned.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#0754f8"
          strokeWidth="3"
          strokeDasharray="6 6"
        />
        {positioned.map((p) => (
          <g key={p.activityId}>
            <circle cx={p.x} cy={p.y} r="16" fill="#0754f8" />
            <text
              x={p.x}
              y={p.y + 5}
              fill="white"
              textAnchor="middle"
              fontSize="14"
            >
              {p.number}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        좌표 기반 방문 순서도 · 직선은 실제 이동 경로가 아닙니다.
      </figcaption>
    </figure>
  );
}
