"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Trip } from "../lib/trip";
import { BookingPrivacyError } from "../lib/booking-privacy";
import { downloadFile, createGuidebookExport } from "../lib/export";
import {
  defaultExportOptions,
  type ExportOptions,
} from "../lib/export-options";

const fields: [keyof ExportOptions, string][] = [
  ["profile", "여행 소개·동행 인원·관심사"],
  ["details", "활동 설명·추천 이유·이동 설명·대안"],
  ["lodging", "숙박 섹션·숙박 활동의 이름과 상세"],
  ["budget", "예산표·활동별 비용"],
];

export function ExportDialog({
  trip,
  onClose,
}: {
  trip: Trip;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<ExportOptions>({
    ...defaultExportOptions,
  });
  const [reviewed, setReviewed] = useState(false);
  const [imageData, setImageData] = useState<Record<string, string>>({});
  const [preparing, setPreparing] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  async function preparePhotos() {
    setPreparing(true);
    setReviewed(false);
    const images: Record<string, string> = {};
    const eligible = (trip.visuals?.photos || []).filter(
      (photo) =>
        !photo.activityId ||
        trip.days.some((day) =>
          day.activities.some(
            (a) =>
              a.id === photo.activityId &&
              a.title === photo.activityTitle &&
              day.city === photo.city &&
              (options.lodging || a.kind !== "숙박"),
          ),
        ),
    );
    for (const photo of eligible.filter(
      (p, i, all) => all.findIndex((other) => other.file === p.file) === i,
    )) {
      setPhotoStatus(`사진 ${Object.keys(images).length}장 준비 중…`);
      try {
        const response = await fetch("/api/place-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: photo.title,
            city: photo.city,
            file: photo.file,
          }),
        });
        const data = await response.json();
        if (response.ok && typeof data.dataUrl === "string")
          images[photo.file] = data.dataUrl;
      } catch {
        /* Text remains exportable when a photo source is unavailable. */
      }
    }
    setImageData(images);
    setPhotoStatus(
      `사진 ${Object.keys(images).length}장 포함 준비 완료. 누락된 사진은 파일에 포함되지 않습니다.`,
    );
    setPreparing(false);
  }
  const output = useMemo(() => {
    try {
      return { ...createGuidebookExport(trip, options, imageData), error: "" };
    } catch (error) {
      return {
        html: "",
        error:
          error instanceof BookingPrivacyError
            ? error.message
            : "입력 형식이 올바르지 않은 일정이 있습니다. 활동 이름·시간·금액을 확인해 주세요.",
      };
    }
  }, [trip, options, imageData]);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal export-modal">
          <Dialog.Title>가이드북 파일 만들기</Dialog.Title>
          <Dialog.Description>
            파일에 담을 내용을 선택하고 아래 미리보기를 확인해 주세요. 선택
            사항은 원본 여행책에 영향을 주지 않습니다.
          </Dialog.Description>
          <fieldset className="export-options">
            <legend>포함할 내용</legend>
            {fields.map(([name, label]) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={options[name]}
                  onChange={(event) => {
                    setOptions({ ...options, [name]: event.target.checked });
                    setReviewed(false);
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
          {!!trip.visuals?.photos.length && (
            <div>
              <button
                className="secondary"
                disabled={preparing}
                onClick={preparePhotos}
              >
                {preparing
                  ? "사진을 파일에 담는 중…"
                  : "오프라인 사진 포함 준비"}
              </button>
              <p role="status">
                {photoStatus ||
                  "사진을 포함하려면 준비 버튼을 눌러 주세요. 지도는 방문 순서 그림과 온라인 길찾기 링크로 담깁니다."}
              </p>
            </div>
          )}
          {trip.sources.some((source) => source.license === "CC BY-SA 4.0") && (
            <p className="quiet-note">
              공개 여행 자료를 번역·재구성한 안내 본문에는 CC BY-SA 4.0이
              적용됩니다. 파일을 공유·변형할 때 출처·기여자·라이선스·변경 표시와
              동일조건 배포 요건을 유지해 주세요. 관련 표시는 파일에 함께
              포함됩니다.
            </p>
          )}
          <p className="quiet-note">
            날짜·도시·활동 제목·출처·확인 사항은 유지됩니다. 숙박 정보를
            제외해도 다른 문장이나 출처에 숙소명이 남을 수 있습니다. API 키와
            입력 조건의 원문은 파일에 넣지 않지만, 직접 작성하거나 생성된 본문
            속 예약번호·주소·개인 메모는 자동으로 찾아 지우지 않습니다. 공유 전
            원본에서 제거해 주세요.
          </p>
          {output.error ? (
            <p role="alert">{output.error}</p>
          ) : (
            <iframe
              title="다운로드할 가이드북 미리보기"
              srcDoc={output.html}
              sandbox=""
              className="export-preview"
            />
          )}
          <label className="export-review">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            미리보기에서 개인 메모와 예약번호의 포함 여부를 확인했습니다.
          </label>
          <p className="quiet-note">
            본문은 오프라인에서 읽을 수 있습니다. 지도·출처 링크는 인터넷 연결이
            필요합니다. 인쇄하려면 다운로드한 파일을 브라우저에서 열어 인쇄해
            주세요.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={onClose}>
              취소
            </button>
            <button
              className="primary"
              disabled={preparing || !reviewed || !!output.error}
              onClick={() => {
                downloadFile(
                  output.html,
                  "travel-guidebook.html",
                  "text/html;charset=utf-8",
                );
                onClose();
              }}
            >
              선택한 내용 다운로드
            </button>
          </div>
          <Dialog.Close className="modal-close" aria-label="내보내기 닫기">
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
