"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GuidePlace } from "../lib/guide-visuals";
export default function RouteMap({
  points,
}: {
  points: (GuidePlace & { number: number })[];
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !points.length) return;
    const map = L.map(root.current, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    const locations = points.map((p) => [p.lat, p.lon] as L.LatLngTuple);
    L.polyline(locations, {
      color: "#0754f8",
      weight: 3,
      dashArray: "6 8",
    }).addTo(map);
    points.forEach((p) => {
      const label = document.createElement("span");
      label.textContent = `${p.number}. ${p.title}`;
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: "route-pin",
          html: String(p.number),
          iconSize: [30, 30],
        }),
      })
        .addTo(map)
        .bindPopup(label);
    });
    if (locations.length === 1) map.setView(locations[0], 14);
    else map.fitBounds(L.latLngBounds(locations).pad(0.18), { maxZoom: 15 });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(root.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [points]);
  return (
    <div ref={root} className="route-map" aria-label="날짜별 여행 위치 지도" />
  );
}
