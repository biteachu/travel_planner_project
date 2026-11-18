"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const steps = [
  {
    role: "총괄",
    title: "먼저, 여행의 큰 그림을",
    body: "목적지·기간·예산과 좋아하는 여행 방식을 정리합니다. 도시별 숙박 일수를 제안하고 사용자가 확인합니다.",
    output: "사용자 확인 → 숙박 거점과 체류 일수",
  },
  {
    role: "장소 조사",
    title: "취향에 맞는 장소를 조사해요",
    body: "거점마다 관광지·식당·숙박 지역과 이동 자료를 조사합니다. 출처가 없거나 확인하지 못한 정보는 구분합니다.",
    output: "자료 조사 → 장소 후보와 연결된 출처",
  },
  {
    role: "일정·이동",
    title: "하루하루 무리 없이 이어지도록",
    body: "이동·식사·휴식을 날짜별로 배치합니다. 확정 일정과 첫날·마지막 날의 활동 가능 시간을 검사합니다.",
    output: "날짜별 구성 → 시간표와 이동·휴식",
  },
  {
    role: "예산",
    title: "모르는 비용을 0원으로 숨기지 않아요",
    body: "일행 전체 경비를 분류합니다. 입력·추정 금액과 미확인 비용을 구분하고 예산 초과와 누락을 살펴봅니다.",
    output: "비용 검토 → 항목별 경비와 미확인 목록",
  },
  {
    role: "큐레이터·검토",
    title: "설명을 더하고, 한 번 더 검토해요",
    body: "조사 자료를 바탕으로 설명과 팁을 작성합니다. 검토 후 필요한 날을 최대 두 번 수정하고, 남은 문제는 확인 사항으로 남깁니다.",
    output: "설명과 재검토 → 나만의 가이드북 초안",
  },
  {
    role: "가이드북",
    title: "여행 중에도 펼쳐 볼 한 권",
    body: "일정을 직접 다듬고 파일에 포함할 내용을 확인합니다. 단일 HTML로 내려받으면 본문은 오프라인에서도 읽을 수 있습니다.",
    output: "사용자 확인 → HTML 여행 가이드북",
  },
];

export function DemoWalkthrough({
  onClose,
  onOpenExample,
}: {
  onClose: () => void;
  onOpenExample: () => void;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step === steps.length - 1) setPlaying(false);
      else setStep(step + 1);
    }, 4500);
    return () => clearTimeout(timer);
  }, [playing, step]);
  const current = steps[step];
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal demo-modal">
          <Dialog.Title>가이드북이 만들어지는 과정</Dialog.Title>
          <Dialog.Description>
            예시 재생입니다. AI·검색 API를 호출하거나 새 여행을 생성하지 않으며,
            사용 요금이 발생하지 않습니다.
          </Dialog.Description>
          <p className="demo-label">
            예시 재생 · {step + 1} / {steps.length}
          </p>
          <progress
            aria-label="예시 진행 단계"
            value={step + 1}
            max={steps.length}
          />
          <section className="demo-stage" aria-live="polite" aria-atomic="true">
            <span>{current.role}</span>
            <h3>{current.title}</h3>
            <p>{current.body}</p>
            <strong>{current.output}</strong>
          </section>
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={step === 0}
              onClick={() => {
                setPlaying(false);
                setStep(step - 1);
              }}
            >
              이전 단계
            </button>
            <button
              className="secondary"
              onClick={() => {
                if (!playing && step === steps.length - 1) setStep(0);
                setPlaying(!playing);
              }}
            >
              {playing ? "일시 정지" : "자동 재생"}
            </button>
            {step < steps.length - 1 ? (
              <button
                className="primary"
                onClick={() => {
                  setPlaying(false);
                  setStep(step + 1);
                }}
              >
                다음 단계
              </button>
            ) : (
              <button className="primary" onClick={onOpenExample}>
                예시 가이드북 열기
              </button>
            )}
          </div>
          <p className="quiet-note">
            다음에 열리는 여행책도 체험용 예시입니다. 실제 생성에는 본인 API
            키가 필요합니다.
          </p>
          <Dialog.Close className="modal-close" aria-label="예시 재생 닫기">
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
