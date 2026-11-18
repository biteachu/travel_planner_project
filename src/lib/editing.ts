import type { Trip } from "./trip";

/** Exchange adjacent activities' start slots without moving locked bookings. */
export function moveActivity(trip: Trip, day: number, index: number, direction: -1 | 1): Trip {
  const activities = trip.days[day]?.activities;
  const target = index + direction;
  if (!activities?.[index] || !activities[target]) throw new Error("이동할 일정이 없습니다.");
  if (activities[index].locked || activities[target].locked) {
    throw new Error("고정 일정의 순서는 바꿀 수 없습니다. 먼저 고정을 해제해 주세요.");
  }
  const next = structuredClone(trip);
  const items = next.days[day].activities;
  const current = items[index];
  const neighbor = items[target];
  items[index] = { ...neighbor, time: current.time };
  items[target] = { ...current, time: neighbor.time };
  return next;
}
