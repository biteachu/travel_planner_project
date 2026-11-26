import type { Trip } from "./trip";
import { hasUnknownSources } from "./research";

/** Curated content may enrich a book, but may not change the user's itinerary. */
export function guideContentIssues(trip: Trip) {
  const issues: string[] = [];
  const guides = trip.placeGuides || [];
  const seen = new Set<string>();
  for (const guide of guides) {
    if (seen.has(guide.activityId))
      issues.push("같은 일정에 장소 해설이 중복되었습니다.");
    seen.add(guide.activityId);
    if (
      !trip.days.some((day) =>
        day.activities.some(
          (a) => a.id === guide.activityId && a.title === guide.activityTitle,
        ),
      )
    )
      issues.push("장소 해설이 현재 일정과 일치하지 않습니다.");
  }
  if (
    hasUnknownSources(
      [...guides, ...(trip.recommendations || [])],
      trip.sources,
    )
  )
    issues.push("장소 해설 또는 추천에 조사하지 않은 출처가 있습니다.");
  if ((trip.recommendations || []).some((r) => !r.sourceIds.length))
    issues.push("추천 장소의 출처 근거가 없습니다.");
  return issues;
}
