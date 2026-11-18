import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import evidence from "./evidence.json";

const colors = {
  paper: "#f6f4ed",
  ink: "#233a36",
  green: "#174e49",
  sage: "#a8bfa4",
  yellow: "#e6c771",
};
const layout: CSSProperties = {
  background: colors.paper,
  color: colors.ink,
  fontFamily: '"Malgun Gothic", "Noto Sans KR", sans-serif',
  padding: 64,
};
const heading: CSSProperties = {
  fontFamily: 'Batang, "Noto Serif KR", serif',
  fontSize: 66,
  fontWeight: 500,
  lineHeight: 1.35,
  margin: "22px 0",
  wordBreak: "keep-all",
};

function Frame({
  children,
  label = "트레일러 초안 · 예시 화면",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <AbsoluteFill style={layout}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 17,
          letterSpacing: 1,
        }}
      >
        <strong>여행의 결</strong>
        <span>{label}</span>
      </div>
      {children}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 30,
          borderTop: "1px solid #c8d5c5",
          paddingTop: 14,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
        }}
      >
        <span>계획은 꼼꼼하게, 여행은 나답게.</span>
        <span>HTML 여행 가이드북</span>
      </div>
    </AbsoluteFill>
  );
}
function Enter({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ opacity, transform: `translateY(${(1 - opacity) * 24}px)` }}>
      {children}
    </div>
  );
}
function Book() {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 350,
        height: 450,
        background: colors.green,
        color: colors.paper,
        padding: "40px 36px",
        borderRadius: "3px 18px 18px 3px",
        boxShadow: "20px 25px 0 #dce4d6",
        transform: `rotate(${interpolate(frame, [0, 180], [-8, -3], { extrapolateRight: "clamp" })}deg)`,
        borderLeft: "12px solid #2c6861",
      }}
    >
      <div style={{ fontSize: 16 }}>여행의 결 / 나만의 여행책</div>
      <h2 style={{ ...heading, fontSize: 46, marginTop: 60 }}>
        당신의 취향을
        <br />
        따라 걷는 여행
      </h2>
      <div
        style={{
          height: 4,
          width: 70,
          background: colors.yellow,
          marginTop: 35,
        }}
      />
      <p style={{ fontSize: 18, marginTop: 30 }}>취향 · 일정 · 이동 · 휴식</p>
    </div>
  );
}
function Screen({
  src,
  mobile = false,
  pan = 0,
}: {
  src: string;
  mobile?: boolean;
  pan?: number;
}) {
  const frame = useCurrentFrame();
  const top = interpolate(frame, [20, 230], [0, -pan], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: mobile ? 300 : 620,
        height: 470,
        overflow: "hidden",
        borderRadius: mobile ? 26 : 12,
        border: "10px solid #233a36",
        background: colors.paper,
        boxShadow: "0 16px 45px #233a3625",
      }}
    >
      <Img
        src={staticFile(src)}
        style={{ width: "100%", transform: `translateY(${top}px)` }}
      />
    </div>
  );
}
function Split({
  title,
  body,
  kicker,
  children,
}: {
  title: ReactNode;
  body: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <Frame>
      <div
        style={{ display: "flex", alignItems: "center", gap: 55, height: 530 }}
      >
        <div style={{ flex: 1 }}>
          <Enter>
            <p style={{ color: colors.green, fontSize: 21 }}>{kicker}</p>
            <h1 style={{ ...heading, fontSize: 48 }}>{title}</h1>
            <p style={{ fontSize: 24, lineHeight: 1.8, wordBreak: "keep-all" }}>
              {body}
            </p>
          </Enter>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {children}
        </div>
      </div>
    </Frame>
  );
}
export function Trailer() {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={180}>
        <Split
          kicker="자유여행을 좋아하는 당신에게"
          title={
            <>
              많이 찾는 여행보다,
              <br />
              나에게 맞는 여행.
            </>
          }
          body="취향을 담아 만드는 한 권의 여행 가이드북."
        >
          <Book />
        </Split>
      </Sequence>
      <Sequence from={180} durationInFrames={240}>
        <Split
          kicker="01 / 취향에서 시작"
          title={
            <>
              어디로, 누구와,
              <br />
              어떤 속도로?
            </>
          }
          body="좋아하는 활동, 예산, 확정 일정까지. 여행 조건을 직접 정하세요."
        >
          <Screen src="preferences.png" />
        </Split>
      </Sequence>
      <Sequence from={420} durationInFrames={270}>
        <Frame>
          <Enter>
            <p style={{ fontSize: 22, color: colors.green, marginTop: 55 }}>
              02 / 역할을 나눠 꼼꼼하게
            </p>
            <h1 style={{ ...heading, fontSize: 53 }}>
              조사부터 일정·예산·검토까지.
            </h1>
            <div style={{ display: "flex", gap: 12, marginTop: 55 }}>
              {["조건 정리", "장소 조사", "일정·이동", "예산", "설명·검토"].map(
                (role, i) => (
                  <div
                    key={role}
                    style={{
                      flex: 1,
                      padding: "30px 20px",
                      borderTop: `4px solid ${i % 2 ? colors.sage : colors.green}`,
                      background: "#e8eee4",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>0{i + 1}</span>
                    <h2 style={{ fontSize: 25, marginTop: 24 }}>{role}</h2>
                  </div>
                ),
              )}
            </div>
            <p style={{ fontSize: 24, marginTop: 35 }}>
              계획은 AI가 제안하고, 최종 선택은 사용자가 합니다.
            </p>
          </Enter>
        </Frame>
      </Sequence>
      <Sequence from={690} durationInFrames={270}>
        <Split
          kicker="03 / 여행 중에도 한눈에"
          title={
            <>
              일정과 이동,
              <br />
              확인할 것까지 한 권에.
            </>
          }
          body="완성한 HTML을 내려받아 모바일에서도 읽으세요. 본문은 오프라인으로, 지도는 링크로."
        >
          <Screen src="guidebook-mobile.png" mobile pan={570} />
        </Split>
      </Sequence>
      <Sequence from={960} durationInFrames={210}>
        <Split
          kicker="04 / 내 여행답게 다듬기"
          title={
            <>
              시간을 바꾸고,
              <br />
              중요한 일정은 고정하고.
            </>
          }
          body="비용이 미확인이면 그대로 표시합니다. 파일에 담을 내용도 직접 고르세요."
        >
          <Screen src="editor.png" />
        </Split>
      </Sequence>
      <Sequence from={1170} durationInFrames={180}>
        <Frame>
          <div style={{ textAlign: "center", paddingTop: 65 }}>
            <Enter>
              <p style={{ fontSize: 24 }}>여행의 결</p>
              <h1 style={heading}>
                당신의 취향이
                <br />한 권의 여행이 되도록.
              </h1>
              <p style={{ fontSize: 25, marginTop: 30 }}>
                본인 Gemini API 키로 생성 · 키 없이 예시 체험
              </p>
              <p style={{ fontSize: 17, color: "#65776e" }}>
                프로토타입 초안 / 실제 생성 품질과 공개 배포 검증 진행 중
              </p>
            </Enter>
          </div>
        </Frame>
      </Sequence>
    </AbsoluteFill>
  );
}

function Comparison({
  item,
  index,
}: {
  item: (typeof evidence.cases)[number];
  index: number;
}) {
  const ready =
    item.verified && item.before && item.after && item.prompt && item.reason;
  return (
    <Frame label="과정 영상 편집 초안 · 제출본 아님">
      <h1 style={{ ...heading, fontSize: 42, marginTop: 40 }}>
        수정 사례 {index + 1} / {item.title}
      </h1>
      {ready ? (
        <>
          <div style={{ display: "flex", gap: 25 }}>
            {[item.before, item.after].map((src, i) => (
              <div key={src} style={{ flex: 1 }}>
                <p>{i ? "내가 바꾼 것" : "AI가 처음 준 것"}</p>
                <Img
                  src={staticFile(src)}
                  style={{ width: "100%", height: 270, objectFit: "contain" }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 20 }}>실제 지시: {item.prompt}</p>
          <p style={{ fontSize: 20 }}>바꾼 이유: {item.reason}</p>
          <small>관련 커밋: {item.commit}</small>
        </>
      ) : (
        <div style={{ padding: 60, background: "#e8eee4", marginTop: 30 }}>
          <h2 style={{ fontSize: 32 }}>
            실제 사용자 수정 자료를 등록할 자리입니다.
          </h2>
          <p style={{ fontSize: 24, lineHeight: 1.8 }}>
            동일한 화면의 수정 전·후 이미지
            <br />
            사용자 지시 원문 · 변경 이유 · 관련 커밋
          </p>
          <p>
            자료가 없으므로 수정 사례를 재현하거나 완료로 표시하지 않습니다.
          </p>
        </div>
      )}
    </Frame>
  );
}
export function ProcessDraft() {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={600}>
        <Frame label="과정 영상 편집 초안 · 제출본 아님">
          <h1 style={{ ...heading, marginTop: 90 }}>
            여행의 결<br />
            제작 과정
          </h1>
          <p style={{ fontSize: 28 }}>
            취향을 입력하면 HTML 가이드북을 만드는 웹앱
          </p>
          <p style={{ fontSize: 22 }}>
            이 영상은 실제 수정 증거를 채우기 위한 편집 틀입니다.
          </p>
        </Frame>
      </Sequence>
      {evidence.cases.slice(0, 3).map((item, i) => (
        <Sequence key={i} from={600 + i * 1050} durationInFrames={1050}>
          <Comparison item={item} index={i} />
        </Sequence>
      ))}
      <Sequence from={3750} durationInFrames={750}>
        <Frame label="과정 영상 편집 초안 · 제출본 아님">
          <h1 style={{ ...heading, marginTop: 80 }}>
            마지막은 실제 사용 검증.
          </h1>
          <p style={{ fontSize: 28, lineHeight: 2 }}>
            모바일 화면 · 오류 상태 · HTML 오프라인 열람
            <br />
            개인 API 키 · 계정 저장 · 공개 배포
          </p>
          <p style={{ fontSize: 23 }}>
            제출 전 실제 수정 사례와 검증 결과로 이 장면을 갱신합니다.
          </p>
        </Frame>
      </Sequence>
    </AbsoluteFill>
  );
}
export function VideoRoot() {
  return (
    <>
      <Composition
        id="TrailerDraft"
        component={Trailer}
        durationInFrames={1350}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ProcessDraft"
        component={ProcessDraft}
        durationInFrames={4500}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
}
