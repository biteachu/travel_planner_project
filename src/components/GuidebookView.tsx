"use client";
import { useState, type ComponentProps } from "react";
import { Guidebook } from "./Guidebook";
const sections = [
  ["itinerary", "여행 일정"],
  ["places", "장소 해설"],
  ["dining", "맛집·술집"],
  ["practical", "여행 준비"],
] as const;
export function GuidebookView(props: ComponentProps<typeof Guidebook>) {
  const [selected, setSelected] = useState(0);
  return (
    <div className="guide-reader">
      <div
        className="guide-reader-tabs"
        role="tablist"
        aria-label="여행책 읽기"
      >
        {sections.map(([key, label], i) => (
          <button
            key={key}
            id={`reader-tab-${key}`}
            role="tab"
            aria-selected={i === selected}
            aria-controls="reader-panel"
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (i + 1) % sections.length
                  : event.key === "ArrowLeft"
                    ? (i + sections.length - 1) % sections.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? sections.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setSelected(next);
              document
                .getElementById(`reader-tab-${sections[next][0]}`)
                ?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="reader-panel"
        role="tabpanel"
        aria-labelledby={`reader-tab-${sections[selected][0]}`}
        tabIndex={0}
      >
        <Guidebook {...props} section={sections[selected][0]} />
      </div>
    </div>
  );
}
