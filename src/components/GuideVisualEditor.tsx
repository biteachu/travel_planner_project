"use client";
import { useEffect, useState } from "react";
import type { Trip } from "../lib/trip";
import { type Visuals, type PlaceCandidate } from "../lib/guide-visuals";
const normalized = (value: string) =>
  value.replace(/시$/, "").replace(/[\s·()]/g, "");
async function lookup(
  query: string,
  city: string,
  signal?: AbortSignal,
): Promise<PlaceCandidate[]> {
  const response = await fetch("/api/place-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.slice(0, 250), city }),
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result.candidates;
}
export function GuideVisualEditor({
  trip,
  onChange,
}: {
  trip: Trip;
  onChange: (update: (previous: Visuals) => Visuals) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const day = trip.days[Math.min(selectedDay, trip.days.length - 1)];
  // Fill only exact city-name matches. Existing books get photos without a new AI call.
  useEffect(() => {
    const ctrl = new AbortController();
    const cities = [...new Set(trip.days.map((d) => d.city))].slice(0, 6);
    void (async () => {
      for (const city of cities) {
        if (trip.visuals?.photos.some((p) => !p.activityId && p.city === city))
          continue;
        try {
          const found = await lookup(city, city, ctrl.signal);
          if (ctrl.signal.aborted) return;
          const match = found.find(
            (p) => normalized(p.title) === normalized(city) && p.photo,
          );
          if (match?.photo)
            onChange((previous) =>
              previous.photos.some((p) => !p.activityId && p.city === city)
                ? previous
                : { ...previous, photos: [...previous.photos, match.photo!] },
            );
        } catch {
          if (!ctrl.signal.aborted)
            setMessage(
              "자동 사진 조회가 끝나지 않은 도시가 있습니다. 아래에서 직접 검색할 수 있습니다.",
            );
        }
      }
    })();
    return () => ctrl.abort();
    // The mounted book owns this lookup; patches are merged with the latest book by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);
  function choose(candidate: PlaceCandidate) {
    const activity = day.activities.find((a) => a.id === target);
    onChange((previous) => ({
      photos: candidate.photo
        ? [
            ...previous.photos.filter((p) =>
              activity
                ? p.activityId !== activity.id
                : p.activityId || p.city !== day.city,
            ),
            {
              ...candidate.photo,
              ...(activity
                ? { activityId: activity.id, activityTitle: activity.title }
                : {}),
            },
          ].slice(0, 120)
        : previous.photos,
      places: activity
        ? [
            ...previous.places.filter((p) => p.activityId !== activity.id),
            {
              activityId: activity.id,
              activityTitle: activity.title,
              city: day.city,
              title: candidate.title,
              lat: candidate.lat,
              lon: candidate.lon,
              sourceUrl: candidate.sourceUrl,
            },
          ]
        : previous.places,
    }));
    setMessage(
      `${candidate.title}을 연결했습니다. ‘보관’을 누르면 다음에도 유지됩니다.`,
    );
    setCandidates([]);
  }
  async function search() {
    setBusy(true);
    setMessage("");
    setCandidates([]);
    try {
      const found = await lookup(query, day.city);
      setCandidates(found);
      if (!found.length)
        setMessage(
          "위치가 있는 문서를 찾지 못했습니다. 간단한 장소명으로 다시 검색해 주세요.",
        );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "검색하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function locateDay() {
    setBusy(true);
    setMessage("이름이 일치하는 공개 문서의 위치를 찾고 있습니다…");
    let count = 0;
    try {
      for (const activity of day.activities
        .filter((a) => !["이동", "휴식"].includes(a.kind))
        .slice(0, 10)) {
        const found = await lookup(`${day.city} ${activity.title}`, day.city);
        const match = found.find(
          (p) =>
            normalized(p.title).length >= 3 &&
            normalized(activity.title).includes(normalized(p.title)),
        );
        if (!match) continue;
        count++;
        onChange((previous) => ({
          ...previous,
          places: [
            ...previous.places.filter((p) => p.activityId !== activity.id),
            {
              activityId: activity.id,
              activityTitle: activity.title,
              city: day.city,
              title: match.title,
              lat: match.lat,
              lon: match.lon,
              sourceUrl: match.sourceUrl,
            },
          ],
        }));
      }
      setMessage(
        `${count}곳의 문서 위치를 연결했습니다. 실제 장소가 맞는지 지도에서 확인해 주세요. 나머지는 검색해 직접 연결할 수 있습니다.`,
      );
    } catch {
      setMessage(
        "일부 장소 조회에 실패했습니다. 연결된 위치는 유지됩니다. 아래 검색으로 보완해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="visual-editor">
      <summary>
        사진·지도 보완 <span>장소별 사진과 위치를 확인하세요</span>
      </summary>
      <p>
        도시 대표사진 또는 개별 일정을 선택해 사진을 연결할 수 있습니다. 검색
        결과의 장소가 실제 방문지와 같은지 확인해 주세요. 검색에는 도시·장소명만
        전송합니다.
      </p>
      <div className="visual-fields">
        <label>
          날짜
          <select
            value={selectedDay}
            disabled={busy}
            onChange={(e) => {
              setSelectedDay(Number(e.target.value));
              setTarget("");
              setCandidates([]);
            }}
          >
            {trip.days.map((d, i) => (
              <option key={d.date} value={i}>
                {i + 1}일차 · {d.city}
              </option>
            ))}
          </select>
        </label>
        <label>
          연결할 항목
          <select
            value={target}
            disabled={busy}
            onChange={(e) => {
              setTarget(e.target.value);
              setQuery(
                day.activities.find((a) => a.id === e.target.value)?.title ??
                  day.city,
              );
              setCandidates([]);
            }}
          >
            <option value="">도시 대표사진</option>
            {day.activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.time} {a.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="secondary" disabled={busy} onClick={locateDay}>
        이 날짜의 위치 자동 찾기
      </button>
      <div className="visual-search">
        <label>
          사진·위치 검색어
          <input
            value={query}
            placeholder={day.city}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={busy || !query.trim()}
          onClick={search}
        >
          검색
        </button>
      </div>
      {target && trip.visuals?.photos.some((p) => p.activityId === target) && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            onChange((previous) => ({
              ...previous,
              photos: previous.photos.filter((p) => p.activityId !== target),
            }));
            setMessage(
              "선택한 일정의 사진 연결을 해제했습니다. 보관을 누르면 저장됩니다.",
            );
          }}
        >
          선택한 일정의 사진 제거
        </button>
      )}
      {message && <p role="status">{message}</p>}
      <div className="place-candidates">
        {candidates.map((candidate) => (
          <div key={candidate.sourceUrl}>
            {candidate.photo && (
              <img
                src={candidate.photo.url}
                alt={`${candidate.title} 문서 대표사진`}
                loading="lazy"
              />
            )}
            <strong>{candidate.title}</strong>
            <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">
              장소 문서 확인 ↗
            </a>
            <button className="secondary" onClick={() => choose(candidate)}>
              이 장소 연결
            </button>
            {candidate.photo && (
              <small>
                {candidate.photo.credit} · {candidate.photo.license}
              </small>
            )}
          </div>
        ))}
      </div>
      {!!trip.visuals?.photos.length && (
        <button
          className="text-button"
          onClick={() =>
            onChange((previous) => ({
              ...previous,
              photos: previous.photos.filter((p) => p.city !== day.city),
            }))
          }
        >
          이 도시 대표사진 제거
        </button>
      )}
      {!!target && (
        <button
          className="text-button"
          onClick={() =>
            onChange((previous) => ({
              ...previous,
              places: previous.places.filter((p) => p.activityId !== target),
            }))
          }
        >
          선택한 장소의 위치 연결 해제
        </button>
      )}
    </details>
  );
}
