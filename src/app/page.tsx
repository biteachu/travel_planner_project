"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Compass,
  ArrowUpRight,
  ArrowLeft,
  Download,
  Plus,
  KeyRound,
  Check,
  X,
  Menu,
  LoaderCircle,
  MapPin,
  CalendarDays,
  Wallet,
  Users,
  LockKeyhole,
  Unlock,
  Trash2,
  Save,
  FolderOpen,
  Printer,
  Upload,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Guidebook } from "../components/Guidebook";
import { examples } from "../lib/examples";
import {
  briefSchema,
  tripSchema,
  outlineSchema,
  type Brief,
  type Trip,
  type Outline,
  datesBetween,
  validateTrip,
  money,
  costSummary,
} from "../lib/trip";
import { downloadFile } from "../lib/export";
import { ExportDialog } from "../components/ExportDialog";
import { ReservationsEditor } from "../components/ReservationsEditor";
import { CostEditor } from "../components/CostEditor";
import { DemoWalkthrough } from "../components/DemoWalkthrough";
import { guidebookCss } from "../lib/guidebook-style";
import { draftKey, readDraft, encodeDraft } from "../lib/draft";
import { moveActivity } from "../lib/editing";
import {
  checkpointSchema,
  createCheckpoint,
  advancePipeline,
  pipelineLabel,
  generationWorkload,
  type Checkpoint,
} from "../lib/pipeline";

type View = "home" | "create" | "outline" | "work" | "library";
const blank: Brief = {
  country: "",
  cities: "",
  startDate: "",
  endDate: "",
  people: 1,
  rooms: 1,
  budget: 1500000,
  currency: "KRW",
  pace: "균형 있게",
  interests: [],
  preferences: "",
  avoid: "",
  arrival: "",
  departure: "",
  reservations: "",
};
const themes = [
  "로컬 음식",
  "문화·역사",
  "자연·풍경",
  "동네 산책",
  "예술·전시",
  "쇼핑",
  "카페",
  "휴식",
];
export default function Home() {
  const [view, setView] = useState<View>("home");
  const [brief, setBrief] = useState<Brief>(blank);
  const [trip, setTripState] = useState<Trip | null>(null);
  const tripRef = useRef<Trip | null>(null);
  const revisionContext = useRef(0);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [library, setLibrary] = useState<Trip[]>([]);
  const [recoveryBackup, setRecoveryBackup] = useState<string | null>(null);
  const recoveryBlocked = useRef(false);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<"guide" | "edit">("guide");
  const [day, setDay] = useState(0);
  const [key, setKey] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [request, setRequest] = useState("");
  const [candidate, setCandidate] = useState<Trip | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const stopped = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const draft = readDraft(localStorage.getItem(draftKey));
      if (draft) {
        setBrief(draft.brief);
        setStep(draft.step);
        setDraftStatus("이 브라우저의 입력 초안을 불러왔습니다.");
      }
    } catch {
      setDraftStatus(
        "브라우저 저장소를 사용할 수 없습니다. 입력은 현재 화면에만 유지됩니다.",
      );
    }
    try {
      const pending = checkpointSchema.safeParse(
        JSON.parse(localStorage.getItem("travel-pending-v1") || "null"),
      );
      if (pending.success) {
        setCheckpoint(pending.data);
        setOutline(pending.data.outline);
        if (pending.data.phase === "complete" && pending.data.trip) {
          setTrip(pending.data.trip);
          setView("work");
          setNotice(
            "보관을 마치지 못한 가이드북을 복구했습니다. 내용을 확인하고 보관하거나 파일로 내려받아 주세요.",
          );
        }
      }
      const rawBooks = localStorage.getItem("travel-books-v1") || "[]";
      const data = JSON.parse(rawBooks);
      setRecoveryBackup(localStorage.getItem("travel-books-recovery-v1"));
      if (
        Array.isArray(data) &&
        data.some((item) => !tripSchema.safeParse(item).success)
      ) {
        setRecoveryBackup(rawBooks);
        try {
          localStorage.setItem("travel-books-recovery-v1", rawBooks);
          setNotice(
            "읽을 수 없는 여행이 있어 원본을 별도 보존했습니다. 내 여행책에서 복구용 JSON을 내려받을 수 있습니다.",
          );
        } catch {
          recoveryBlocked.current = true;
          setNotice(
            "복구본을 추가 저장할 공간이 부족합니다. 내 여행책에서 복구용 JSON을 먼저 내려받으세요. 기존 보관본 덮어쓰기는 차단했습니다.",
          );
        }
      }
      setLibrary(
        Array.isArray(data)
          ? data
              .map((x) => tripSchema.safeParse(x))
              .filter((x) => x.success)
              .map((x) => x.data as Trip)
          : [],
      );
    } catch {
      setNotice(
        "저장된 여행을 읽지 못했습니다. JSON 백업 파일을 가져올 수 있습니다.",
      );
    }
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (!draftReady || (view !== "create" && view !== "outline")) return;
    try {
      localStorage.setItem(draftKey, encodeDraft({ brief, step }));
      setDraftStatus("입력 내용을 이 브라우저에 자동 보관했습니다.");
    } catch {
      setDraftStatus(
        "입력 초안을 보관하지 못했습니다. 새로고침 전에 내용을 복사해 주세요.",
      );
    }
  }, [brief, step, view, draftReady]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function navigate(v: View) {
    revisionContext.current++;
    setCandidate(null);
    setView(v);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save(t = trip) {
    if (!t) return false;
    if (recoveryBlocked.current) {
      setError(
        "기존 원본 보호를 위해 보관을 중단했습니다. 내 여행책에서 복구용 JSON을 내려받고 브라우저 저장 공간을 확보해 주세요.",
      );
      return false;
    }
    const validated = tripSchema.safeParse(t);
    if (!validated.success) {
      setError(
        "저장하지 못했습니다. 비어 있는 제목·시간과 활동 수·비용 입력을 확인해 주세요. 이전 보관본은 유지됩니다.",
      );
      return false;
    }
    const next = [validated.data, ...library.filter((x) => x.id !== t.id)];
    try {
      localStorage.setItem("travel-books-v1", JSON.stringify(next));
      setLibrary(next);
      if (checkpoint?.phase === "complete" && checkpoint.trip?.id === t.id) {
        localStorage.removeItem("travel-pending-v1");
        setCheckpoint(null);
      }
      setNotice("이 브라우저에 여행을 보관했습니다.");
      return true;
    } catch {
      setError("브라우저 저장 공간이 부족합니다. JSON 파일로 내보내 주세요.");
      return false;
    }
  }
  function setTrip(next: Trip | null) {
    tripRef.current = next;
    revisionContext.current++;
    setCandidate(null);
    setTripState(next);
  }
  function openExample(i: number) {
    setTrip(structuredClone(examples[i]));
    setDay(0);
    setTab("guide");
    navigate("work");
  }
  function updateTrip(next: Trip) {
    setCandidate(null);
    setTrip({
      ...next,
      version: next.version + 1,
      updatedAt: new Date().toISOString(),
      status: "확인 필요",
    });
    setCandidate(null);
  }
  async function callAgent(stage: string, payload: unknown) {
    if (!key.trim()) {
      setKeyOpen(true);
      throw new Error("본인의 Gemini API 키를 먼저 입력해 주세요.");
    }
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim(), stage, payload }),
        signal: ctrl.signal,
      });
      const data = await response.json();
      // A completed response must not be applied after the user cancels it.
      ctrl.signal.throwIfAborted();
      if (!response.ok)
        throw new Error(data.error || "요청을 처리하지 못했습니다.");
      return data;
    } catch (error) {
      if (ctrl.signal.aborted)
        throw new Error("요청을 중단했습니다. 완료된 결과는 유지됩니다.");
      throw error;
    } finally {
      if (controller.current === ctrl) controller.current = null;
    }
  }
  async function generateOutline() {
    const result = briefSchema.safeParse(brief);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError("");
    setBusy("여행 조건을 읽고 거점을 제안하고 있습니다");
    setEvents(["총괄: 취향·기간·예산 확인"]);
    try {
      const data = await callAgent("outline", { brief: result.data });
      setOutline(outlineSchema.parse(data.result));
      navigate("outline");
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 실패");
    } finally {
      setBusy("");
    }
  }
  async function generate(resume = false) {
    if (!outline) return;
    setError("");
    setEvents([]);
    stopped.current = false;
    try {
      let state =
        resume && checkpoint ? checkpoint : createCheckpoint(brief, outline);
      setCheckpoint(state);
      setBusy(pipelineLabel(state));
      localStorage.setItem("travel-pending-v1", JSON.stringify(state));
      while (state.phase !== "complete") {
        if (stopped.current)
          throw new Error("중단했습니다. 완료한 단계부터 이어갈 수 있습니다.");
        setBusy(pipelineLabel(state));
        state = await advancePipeline(state, callAgent);
        if (stopped.current)
          throw new Error("중단했습니다. 완료한 단계부터 이어갈 수 있습니다.");
        setCheckpoint(state);
        localStorage.setItem("travel-pending-v1", JSON.stringify(state));
        if (state.trip) setTrip(state.trip);
        setEvents([
          `완료된 날짜: ${state.days.length}일`,
          state.research
            ? `자료 조사: ${state.research.method}`
            : "자료 조사 대기",
        ]);
      }
      const t = tripSchema.parse(state.trip);
      setTrip(t);
      const saved = save(t);
      if (saved) {
        localStorage.removeItem("travel-pending-v1");
        setCheckpoint(null);
      }
      setDay(0);
      setTab("guide");
      navigate("work");
      setNotice(
        saved
          ? "가이드북을 만들었습니다. 확인 필요 항목을 먼저 살펴보세요."
          : "가이드북은 완성됐지만 보관하지 못했습니다. 복구용 진행 데이터는 유지했습니다. 파일로 내려받거나 저장 공간을 확보한 뒤 보관해 주세요.",
      );
    } catch (e) {
      setError(
        stopped.current
          ? "중단했습니다. 완료한 단계부터 이어갈 수 있습니다."
          : e instanceof Error
            ? e.message
            : "생성 실패. 완료된 단계는 유지됩니다.",
      );
    } finally {
      setBusy("");
    }
  }
  async function revise() {
    if (!trip || !request.trim()) return;
    const original = trip;
    const context = revisionContext.current;
    setError("");
    setBusy("선택한 하루를 다시 계획하고 있습니다");
    try {
      const result = await callAgent("revise", {
        trip,
        date: trip.days[day].date,
        instruction: request,
      });
      if (tripRef.current !== original || revisionContext.current !== context) {
        setNotice(
          "여행이나 선택 화면이 바뀌어 이전 조건의 수정안을 적용하지 않았습니다. 현재 내용으로 다시 요청해 주세요.",
        );
        return;
      }
      const t = tripSchema.parse(result.result);
      const issues = validateTrip(t, trip);
      if (issues.some((s) => s.includes("고정")))
        throw new Error("고정 일정이 변경되어 결과를 적용하지 않았습니다.");
      setCandidate(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy("");
    }
  }
  async function account(
    action: "login" | "save" | "load" | "logout" | "delete",
    target?: Trip,
  ) {
    try {
      if (recoveryBlocked.current && (action === "load" || action === "delete"))
        throw new Error(
          "원본 보호를 위해 보관 목록 변경을 중단했습니다. 복구용 JSON을 내려받고 저장 공간을 확보해 주세요.",
        );
      const { getSupabase } = await import("../lib/supabase");
      const client = getSupabase();
      if (!client)
        throw new Error(
          "계정 저장 서비스가 아직 연결되지 않았습니다. 브라우저 보관과 HTML 다운로드를 이용해 주세요.",
        );
      if (action === "logout") {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        setNotice(
          "로그아웃했습니다. 이 브라우저의 여행 파일은 별도로 보관됩니다.",
        );
        return;
      }
      if (action === "login") {
        if (!email.includes("@"))
          throw new Error("이메일 주소를 입력해 주세요.");
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setNotice("로그인 링크를 이메일로 보냈습니다.");
      } else {
        const {
          data: { user },
        } = await client.auth.getUser();
        if (!user) throw new Error("이메일 링크로 먼저 로그인해 주세요.");
        if (action === "save" && trip) {
          const validated = tripSchema.parse(trip);
          const { error } = await client.from("trips").upsert(
            {
              id: trip.id,
              owner_id: user.id,
              title: trip.title,
              data: validated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "owner_id,id" },
          );
          if (error) throw error;
          setNotice(
            "계정에 여행을 저장했습니다. 변경된 저장본은 버전 기록으로 보존됩니다.",
          );
        }
        if (action === "delete" && target) {
          const { error } = await client
            .from("trips")
            .delete()
            .eq("owner_id", user.id)
            .eq("id", target.id);
          if (error) throw error;
          const next = library.filter((item) => item.id !== target.id);
          setLibrary(next);
          if (trip?.id === target.id) setTrip(null);
          try {
            localStorage.setItem("travel-books-v1", JSON.stringify(next));
          } catch {
            throw new Error(
              "계정 삭제는 완료했지만 브라우저 보관본을 지우지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.",
            );
          }
          setNotice(
            "계정의 여행·버전 기록과 이 브라우저의 보관본을 삭제했습니다. 다른 기기에 따로 보관한 파일은 남아 있을 수 있습니다.",
          );
        }
        if (action === "load") {
          const { data, error } = await client
            .from("trips")
            .select("data")
            .order("updated_at", { ascending: false });
          if (error) throw error;
          const loaded = (data || []).map((r) => tripSchema.parse(r.data));
          const next = [
            ...loaded,
            ...library.filter((t) => !loaded.some((x) => x.id === t.id)),
          ];
          localStorage.setItem("travel-books-v1", JSON.stringify(next));
          setLibrary(next);
          setNotice("계정에서 여행을 불러왔습니다.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "계정 요청 실패");
    }
  }
  const field = (name: keyof Brief, value: unknown) =>
    setBrief((b) => ({ ...b, [name]: value }));
  const formGroups = [
    <div className="form-grid" key="destination">
      <label>
        어느 나라로 떠나시나요?
        <input
          required
          placeholder="예: 일본, 튀르키예"
          value={brief.country}
          onChange={(e) => field("country", e.target.value)}
        />
      </label>
      <label>
        가고 싶은 도시
        <input
          placeholder="미정이면 비워 두세요. AI가 추천합니다."
          value={brief.cities}
          onChange={(e) => field("cities", e.target.value)}
        />
      </label>
      <label>
        여행 시작일
        <input
          type="date"
          value={brief.startDate}
          onChange={(e) => field("startDate", e.target.value)}
        />
      </label>
      <label>
        여행 종료일
        <input
          type="date"
          min={brief.startDate}
          value={brief.endDate}
          onChange={(e) => field("endDate", e.target.value)}
        />
      </label>
      <label>
        함께 가는 인원
        <input
          type="number"
          min="1"
          max="30"
          value={brief.people}
          onChange={(e) => field("people", Number(e.target.value))}
        />
      </label>
      <label>
        숙박 객실 수
        <input
          type="number"
          min="1"
          max="20"
          value={brief.rooms}
          onChange={(e) => field("rooms", Number(e.target.value))}
        />
      </label>
    </div>,
    <div key="taste">
      <label>어떤 여행을 좋아하세요?</label>
      <div className="theme-options">
        {themes.map((t) => (
          <button
            type="button"
            aria-pressed={brief.interests.includes(t)}
            className={brief.interests.includes(t) ? "selected" : ""}
            key={t}
            onClick={() =>
              field(
                "interests",
                brief.interests.includes(t)
                  ? brief.interests.filter((x) => x !== t)
                  : [...brief.interests, t],
              )
            }
          >
            {t}
          </button>
        ))}
      </div>
      <label>
        나만의 취향
        <textarea
          placeholder="작은 골목, 바다를 보는 카페, 지역 음식… 좋아했던 여행 경험을 알려주세요."
          value={brief.preferences}
          onChange={(e) => field("preferences", e.target.value)}
        />
      </label>
      <label>
        피하고 싶은 것
        <textarea
          placeholder="많이 걷기, 붐비는 곳, 특정 음식 등"
          value={brief.avoid}
          onChange={(e) => field("avoid", e.target.value)}
        />
      </label>
      <label>
        여행의 속도
        <select
          value={brief.pace}
          onChange={(e) => field("pace", e.target.value)}
        >
          {["여유롭게", "균형 있게", "알차게"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    </div>,
    <div className="form-grid" key="budget">
      <label>
        일행 전체 예산
        <input
          type="number"
          min="1"
          value={brief.budget}
          onChange={(e) => field("budget", Number(e.target.value))}
        />
        <small>항공료 제외 · 숙박과 현지 경비 포함</small>
      </label>
      <label>
        기준 통화
        <select
          value={brief.currency}
          onChange={(e) => field("currency", e.target.value)}
        >
          {["KRW", "USD", "EUR", "JPY", "TRY"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        현지 도착 시간
        <input
          placeholder="예: 오후 2시 공항 도착"
          value={brief.arrival}
          onChange={(e) => field("arrival", e.target.value)}
        />
      </label>
      <label>
        현지 출발 시간
        <input
          placeholder="예: 오후 5시 출국"
          value={brief.departure}
          onChange={(e) => field("departure", e.target.value)}
        />
      </label>
      <label className="full">
        추가 예약 메모·꼭 지킬 조건
        <textarea
          placeholder="날짜, 시간, 숙소·방문지 이름만 입력하세요. 예약번호·여권정보는 입력하지 마세요."
          value={brief.reservations}
          onChange={(e) => field("reservations", e.target.value)}
        />
        <small>
          메모는 AI가 참고하는 설명입니다. 반드시 지켜야 하는 예약은 아래 확정
          일정에 날짜·시간을 등록해 주세요. 도착·출발 시각은 활동 가능 시간에도
          반영해 주세요.
        </small>
      </label>
      <label>
        첫날 활동 시작 가능 시간
        <input
          type="time"
          value={brief.firstDayStart || ""}
          onChange={(e) => field("firstDayStart", e.target.value)}
        />
        <small>현지 시간 · 입국 수속과 공항 이동을 마친 뒤 가능한 시간</small>
      </label>
      <label>
        마지막 날 활동 종료 시간
        <input
          type="time"
          value={brief.lastDayEnd || ""}
          onChange={(e) => field("lastDayEnd", e.target.value)}
        />
        <small>
          현지 시간 · 공항 이동과 출국 수속에 필요한 시간을 미리 제외해 주세요.
        </small>
      </label>
      <p className="quiet-note full">
        위 시간은 관광·식사·이동·숙박 등 모든 일정 항목에 적용됩니다. 비워 두면
        코드로 시간대를 제한하지 않습니다. 항공편의 실제 운항과 공항별 수속
        시간은 직접 확인해 주세요.
      </p>
      <ReservationsEditor
        brief={brief}
        onChange={(fixedEvents) =>
          setBrief((current) => ({ ...current, fixedEvents }))
        }
      />
    </div>,
  ];
  return (
    <>
      <style>{guidebookCss}</style>
      <header className="site-header">
        <button className="brand" onClick={() => navigate("home")}>
          <Compass size={27} />
          <span>
            여행의 결<small>나만의 여행책을 만드는 곳</small>
          </span>
        </button>
        <nav>
          <button onClick={() => navigate("library")}>내 여행책</button>
          <button className="key-button" onClick={() => setKeyOpen(true)}>
            <KeyRound size={16} />
            {key ? "키 연결 설정" : "API 키 설정"}
          </button>
        </nav>
      </header>
      <main>
        {notice && (
          <div className="toast" role="status">
            <Check size={17} />
            {notice}
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button aria-label="오류 닫기" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {checkpoint && checkpoint.phase !== "complete" && !busy && (
          <div className="resume-banner">
            <div>
              <strong>만들던 여행책이 있어요</strong>
              <small>
                {checkpoint.outline.title} · {checkpoint.days.length}일 완료
              </small>
            </div>
            <button
              className="secondary"
              onClick={() => {
                setBrief(checkpoint.brief);
                setOutline(checkpoint.outline);
                navigate("outline");
              }}
            >
              진행 확인
            </button>
            <button className="primary small" onClick={() => generate(true)}>
              이어서 만들기
            </button>
            <button
              aria-label="진행 중인 초안 삭제"
              onClick={() => {
                if (!window.confirm("생성 중인 초안을 삭제할까요?")) return;
                localStorage.removeItem("travel-pending-v1");
                setCheckpoint(null);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        {view === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="intro-line">
                  <span />
                  좋아하는 순간으로 채우는 여행
                </p>
                <h1>
                  당신의 취향이
                  <br />한 권의 여행이 되도록.
                </h1>
                <p className="hero-description">
                  낯선 도시의 작은 골목부터 쉬어갈 카페까지.
                  <br />
                  여러 AI 에이전트가 함께 계획하고,
                  <br />
                  나만을 위한 여행 가이드북으로 엮어 드립니다.
                </p>
                <div className="hero-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      navigate("create");
                    }}
                  >
                    내 여행책 만들기 <Plus size={18} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      document
                        .getElementById("examples")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    예시 먼저 둘러보기 <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setDemoOpen(true)}
                  >
                    만드는 과정 살펴보기
                  </button>
                </div>
                <p className="quiet-note">
                  <KeyRound size={14} />
                  나의 API 키로, 나만의 계획을. 예시는 키 없이 열 수 있어요.
                </p>
              </div>
              <div
                className="hero-art"
                aria-label="여행 가이드북 표지 미리보기"
              >
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="cover-note">어디든, 당신의 속도로.</div>
                <button className="sample-book" onClick={() => openExample(0)}>
                  <span className="book-spine" />
                  <span className="cover-brand">여행의 결 / 여행책 01</span>
                  <span className="cover-title">
                    바다 곁에서,
                    <br />
                    히로시마
                  </span>
                  <span className="cover-sub">
                    도시의 일상과 섬의 풍경 사이
                  </span>
                  <span className="cover-landscape">
                    <span className="sun" />
                    <span className="island island-one" />
                    <span className="island island-two" />
                    <span className="water-line" />
                  </span>
                  <span className="cover-bottom">
                    Hiroshima & beyond <ArrowUpRight size={18} />
                  </span>
                </button>
                <div className="floating-tag">
                  <BookOpen size={19} />
                  <span>
                    한 파일에 담긴 여행
                    <small>HTML 다운로드 · 오프라인 열람</small>
                  </span>
                </div>
              </div>
            </section>
            <section className="how">
              <div>
                <span>01</span>
                <h3>취향을 들려주세요</h3>
                <p>
                  어디로, 누구와, 어떤 속도로.
                  <br />
                  좋아하는 여행의 모습을 알려주세요.
                </p>
              </div>
              <div>
                <span>02</span>
                <h3>함께 계획을 다듬어요</h3>
                <p>
                  도시와 동선을 먼저 정한 뒤,
                  <br />
                  에이전트가 장소와 이야기를 채웁니다.
                </p>
              </div>
              <div>
                <span>03</span>
                <h3>나만의 여행책을 가져가세요</h3>
                <p>
                  일정·맛집·이동·준비물까지.
                  <br />
                  여행 중에도 한 권으로 펼쳐보세요.
                </p>
              </div>
            </section>
            <section className="examples-section" id="examples">
              <div className="section-heading">
                <div>
                  <p>먼저 펼쳐보는 여행</p>
                  <h2>이런 여행책을 만들 수 있어요</h2>
                </div>
                <span>키 없이 열어보는 예시</span>
              </div>
              <div className="example-grid">
                {examples.map((e, i) => (
                  <button
                    className={"example-card example-" + i}
                    key={e.id}
                    onClick={() => openExample(i)}
                  >
                    <div className="example-illustration">
                      <span className="example-label">
                        {i === 0
                          ? "한 도시에서, 조금 더 깊이"
                          : "여러 도시를, 하나의 여정으로"}
                      </span>
                      <span className="example-name">
                        {i === 0 ? "Hiroshima" : "Türkiye"}
                      </span>
                      <div className="horizon" />
                      <span className="example-days">
                        {e.days.length}일의 기록
                      </span>
                    </div>
                    <div className="example-caption">
                      <div>
                        <h3>{e.title}</h3>
                        <p>
                          {i === 0
                            ? "히로시마 · 미야지마 · 오노미치"
                            : "이스탄불 · 카파도키아 · 안탈리아"}
                        </p>
                      </div>
                      <ArrowUpRight size={23} />
                    </div>
                  </button>
                ))}
              </div>
              <p className="quiet-note">
                예시 여행은 기능 체험용이며, 최신 영업시간·교통·가격이 검증된
                일정이 아닙니다.
              </p>
            </section>
          </>
        )}
        {view === "create" && (
          <section className="create-layout">
            <aside>
              <button className="text-button" onClick={() => navigate("home")}>
                <ArrowLeft size={16} />
                돌아가기
              </button>
              <h1>
                어떤 여행을
                <br />
                꿈꾸고 계세요?
              </h1>
              <p>
                조금만 알려주시면,
                <br />
                나머지는 함께 채워갈게요.
              </p>
              <ol className="step-list">
                {["여행의 시작", "나만의 취향", "예산과 확정 일정"].map(
                  (s, i) => (
                    <li key={s}>
                      <button
                        aria-current={step === i ? "step" : undefined}
                        className={step === i ? "active" : ""}
                        onClick={() => setStep(i)}
                      >
                        <span>{i + 1}</span>
                        {s}
                      </button>
                    </li>
                  ),
                )}
              </ol>
            </aside>
            <div className="form-panel">
              <p className="quiet-note" role="status">
                {draftStatus}
              </p>
              <p className="quiet-note">
                여행 조건과 예약 메모는 이 기기에 보관됩니다. 공용 기기에서는
                사용 후 입력 초안을 지워 주세요. API 키는 보관하지 않습니다.
              </p>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      "입력 중인 여행 조건을 지울까요? 보관한 여행책과 진행 중인 생성 결과는 유지됩니다.",
                    )
                  )
                    return;
                  try {
                    localStorage.removeItem(draftKey);
                    setBrief({ ...blank, interests: [] });
                    setStep(0);
                    setOutline(null);
                  } catch {
                    setDraftStatus(
                      "저장된 초안을 지우지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.",
                    );
                  }
                }}
              >
                입력 초안 지우기
              </button>
              <p className="form-step">{step + 1} / 3</p>
              <h2>
                {
                  [
                    "여행의 기본을 정해볼까요",
                    "좋아하는 순간을 골라주세요",
                    "현실적인 계획을 위한 마지막 질문",
                  ][step]
                }
              </h2>
              {formGroups[step]}
              <div className="form-actions">
                {step > 0 && (
                  <button
                    className="secondary"
                    onClick={() => setStep(step - 1)}
                  >
                    이전
                  </button>
                )}
                {step < 2 ? (
                  <button className="primary" onClick={() => setStep(step + 1)}>
                    다음 단계 <ArrowUpRight size={16} />
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={!!busy}
                    onClick={generateOutline}
                  >
                    여행 골격 제안받기 <Compass size={17} />
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
        {view === "outline" && outline && (
          <section className="content-wrap">
            <button className="text-button" onClick={() => navigate("create")}>
              <ArrowLeft size={16} />
              조건 수정
            </button>
            <h1>{outline.title}</h1>
            <p>{outline.summary}</p>
            <div className="outline-bases">
              {outline.bases.map((b, i) => (
                <div className="outline-base" key={i}>
                  <label>
                    숙박 거점
                    <input
                      value={b.city}
                      onChange={(e) =>
                        setOutline({
                          ...outline,
                          bases: outline.bases.map((x, j) =>
                            j === i ? { ...x, city: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    숙박 일수
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={b.nights}
                      onChange={(e) =>
                        setOutline({
                          ...outline,
                          bases: outline.bases.map((x, j) =>
                            j === i
                              ? { ...x, nights: Number(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <p>{b.reason}</p>
                  <button
                    className="text-button"
                    onClick={() =>
                      setOutline({
                        ...outline,
                        bases: outline.bases.filter((_, j) => j !== i),
                      })
                    }
                  >
                    거점 삭제
                  </button>
                </div>
              ))}
            </div>
            <button
              className="secondary"
              onClick={() =>
                setOutline({
                  ...outline,
                  bases: [
                    ...outline.bases,
                    {
                      city: "",
                      nights: 1,
                      reason: "사용자 추가",
                      neighborhood: "",
                    },
                  ],
                })
              }
            >
              거점 추가
            </button>
            {outline.questions.length > 0 && (
              <div className="notice">
                <strong>더 알려주시면 좋은 내용</strong>
                <ul>
                  {outline.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <textarea
                  aria-label="추가 답변"
                  placeholder="답변을 적으면 계획에 반영합니다."
                  value={brief.additionalAnswers || ""}
                  onChange={(e) => field("additionalAnswers", e.target.value)}
                />
              </div>
            )}
            <p>
              숙박 합계 {outline.bases.reduce((s, b) => s + b.nights, 0)}박 /
              여행 {datesBetween(brief.startDate, brief.endDate).length}일
            </p>
            <p className="quiet-note">
              기본 생성은 거점 조사{" "}
              {generationWorkload(brief, outline).research}회, 날짜별 일정{" "}
              {generationWorkload(brief, outline).days}회, 예산·설명·검토 3회로
              총 {generationWorkload(brief, outline).calls}회의 단계 요청을
              진행합니다. 실패 후 재시도와 도구 내부 검색은 추가 사용량이 발생할
              수 있습니다. 검토 후 자동 수정과 재검토가 최대 두 차례씩
              추가됩니다. 실제 비용은 사용 모델·입출력 길이·검색 사용량에 따라
              달라집니다.
            </p>
            <button
              className="primary"
              disabled={
                !!busy ||
                !outline.bases.length ||
                outline.bases.some((b) => !b.city) ||
                outline.bases.reduce((s, b) => s + b.nights, 0) !==
                  datesBetween(brief.startDate, brief.endDate).length - 1
              }
              onClick={() => generate(false)}
            >
              이 구성으로 가이드북 만들기 <BookOpen size={18} />
            </button>
            {trip && (
              <button className="secondary" onClick={() => navigate("work")}>
                완료된 초안 열기
              </button>
            )}
          </section>
        )}
        {view === "work" && trip && (
          <section className="workspace">
            <div className="workspace-toolbar">
              <button className="text-button" onClick={() => navigate("home")}>
                <ArrowLeft size={17} />
                처음으로
              </button>
              <div className="toolbar-actions">
                <button onClick={() => save()}>
                  <Save size={16} />
                  보관
                </button>
                <button onClick={() => account("save")}>계정 저장</button>
                <button
                  onClick={() =>
                    downloadFile(
                      JSON.stringify(trip, null, 2),
                      "travel-backup.json",
                      "application/json",
                    )
                  }
                >
                  JSON
                </button>
                <button
                  className="primary small"
                  onClick={() => {
                    setExportOpen(true);
                  }}
                >
                  <Download size={16} />
                  HTML 다운로드
                </button>
              </div>
            </div>
            <div className="work-tabs">
              <button
                className={tab === "guide" ? "active" : ""}
                onClick={() => setTab("guide")}
              >
                <BookOpen size={17} />
                가이드북
              </button>
              <button
                className={tab === "edit" ? "active" : ""}
                onClick={() => setTab("edit")}
              >
                일정 다듬기
              </button>
              <span>{trip.isExample ? "키 없는 예시 체험" : trip.status}</span>
            </div>
            {tab === "guide" ? (
              <Guidebook trip={trip} />
            ) : (
              <div className="editor">
                <aside>
                  <h2>날짜별 일정</h2>
                  {trip.days.map((d, i) => (
                    <button
                      key={d.date}
                      className={day === i ? "active" : ""}
                      onClick={() => {
                        revisionContext.current++;
                        setDay(i);
                        setCandidate(null);
                      }}
                    >
                      <span>Day {i + 1}</span>
                      {d.city}
                      <small>{d.date}</small>
                    </button>
                  ))}
                </aside>
                <div className="editor-main">
                  <h2>{trip.days[day]?.title}</h2>
                  <p>
                    고정 항목은 AI 재생성 시 보존됩니다. 수동 수정 후에는
                    영업시간과 동선을 다시 확인해 주세요.
                  </p>
                  <p className="quiet-note">
                    앞으로·뒤로 이동하면 이웃 활동과 시작 시간을 교환합니다.
                    체류 시간과 이동 정보는 유지되므로 아래 자동 검사와 동선을
                    확인해 주세요.
                  </p>
                  {trip.days[day]?.activities.map((a, i) => (
                    <div className="edit-card" key={a.id}>
                      <div className="edit-top">
                        <input
                          aria-label={`활동 ${i + 1} 시간`}
                          type="time"
                          value={a.time}
                          disabled={a.locked}
                          onChange={(e) => {
                            const next = structuredClone(trip);
                            next.days[day].activities[i].time = e.target.value;
                            updateTrip(next);
                          }}
                        />
                        <button
                          aria-label={a.locked ? "고정 해제" : "일정 고정"}
                          disabled={(trip.brief.fixedEvents || []).some(
                            (event) => a.id === `reserved-${event.id}`,
                          )}
                          title={
                            (trip.brief.fixedEvents || []).some(
                              (event) => a.id === `reserved-${event.id}`,
                            )
                              ? "여행 조건에서 등록한 확정 일정입니다."
                              : undefined
                          }
                          onClick={() => {
                            const next = structuredClone(trip);
                            next.days[day].activities[i].locked = !a.locked;
                            updateTrip(next);
                          }}
                        >
                          {a.locked ? (
                            <LockKeyhole size={17} />
                          ) : (
                            <Unlock size={17} />
                          )}
                        </button>
                        <button
                          aria-label="활동 삭제"
                          disabled={a.locked}
                          onClick={() => {
                            const next = structuredClone(trip);
                            next.days[day].activities.splice(i, 1);
                            updateTrip(next);
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <input
                        aria-label={`활동 ${i + 1} 이름`}
                        disabled={a.locked}
                        value={a.title}
                        onChange={(e) => {
                          const next = structuredClone(trip);
                          next.days[day].activities[i].title = e.target.value;
                          updateTrip(next);
                        }}
                      />
                      <textarea
                        aria-label={`활동 ${i + 1} 설명`}
                        disabled={a.locked}
                        value={a.description}
                        onChange={(e) => {
                          const next = structuredClone(trip);
                          next.days[day].activities[i].description =
                            e.target.value;
                          updateTrip(next);
                        }}
                      />
                      <label>
                        체류 시간 · 분
                        <input
                          aria-label={`활동 ${i + 1} 체류 시간`}
                          type="number"
                          min="0"
                          max="1440"
                          step="1"
                          value={a.duration}
                          disabled={a.locked}
                          onChange={(e) => {
                            const duration = Number(e.target.value);
                            if (
                              !Number.isInteger(duration) ||
                              duration < 0 ||
                              duration > 1440
                            )
                              return;
                            const next = structuredClone(trip);
                            next.days[day].activities[i].duration = duration;
                            updateTrip(next);
                          }}
                        />
                      </label>
                      <div className="hero-actions">
                        {([-1, 1] as const).map((direction) => (
                          <button
                            key={direction}
                            className="text-button"
                            aria-label={`활동 ${i + 1} ${direction === -1 ? "앞으로" : "뒤로"}`}
                            disabled={
                              a.locked ||
                              !trip.days[day].activities[i + direction] ||
                              trip.days[day].activities[i + direction]?.locked
                            }
                            onClick={() => {
                              updateTrip(moveActivity(trip, day, i, direction));
                              setCandidate(null);
                              setNotice(
                                "활동 순서와 시작 시간을 교환했습니다. 이동 정보와 시간 겹침을 확인해 주세요.",
                              );
                            }}
                          >
                            {direction === -1 ? "앞으로" : "뒤로"}
                          </button>
                        ))}
                      </div>
                      <CostEditor
                        activity={a}
                        currency={trip.brief.currency}
                        index={i}
                        onChange={(activity) => {
                          const next = structuredClone(trip);
                          next.days[day].activities[i] = activity;
                          updateTrip(next);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    className="secondary"
                    onClick={() => {
                      const next = structuredClone(trip);
                      next.days[day].activities.push({
                        id: crypto.randomUUID(),
                        time: "18:00",
                        duration: 60,
                        title: "새 일정",
                        kind: "휴식",
                        description: "",
                        reason: "사용자 추가",
                        transport: "",
                        cost: null,
                        costStatus: "미확인",
                        locked: false,
                        sourceIds: [],
                        alternative: "",
                      });
                      updateTrip(next);
                    }}
                  >
                    <Plus size={16} />
                    일정 추가
                  </button>
                  <div className="notice">
                    <strong>자동 검사</strong>
                    {validateTrip(trip).length ? (
                      <ul>
                        {validateTrip(trip).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        날짜·시간·숙박 합계에서 충돌이 발견되지 않았습니다. 실제
                        영업·운행 검증은 별도로 필요합니다.
                      </p>
                    )}
                  </div>
                  <div className="revision-box">
                    <h3>이 하루만 다시 계획하기</h3>
                    <textarea
                      placeholder="걷는 시간을 줄이고, 카페에서 쉬는 시간을 늘려주세요."
                      value={request}
                      onChange={(e) => setRequest(e.target.value)}
                    />
                    <button
                      className="primary"
                      disabled={!!busy || !request.trim()}
                      onClick={revise}
                    >
                      수정안 만들기
                    </button>
                    {candidate && (
                      <div className="comparison">
                        <h3>변경 전 / 수정 제안</h3>
                        <div>
                          <ul>
                            {trip.days[day].activities.map((a) => (
                              <li key={a.id}>
                                {a.time} {a.title}
                              </li>
                            ))}
                          </ul>
                          <ul>
                            {candidate.days
                              .find((d) => d.date === trip.days[day].date)
                              ?.activities.map((a) => (
                                <li key={a.id}>
                                  {a.time} {a.title}
                                  <small>{a.reason}</small>
                                </li>
                              ))}
                          </ul>
                        </div>
                        <button
                          className="primary"
                          onClick={() => {
                            updateTrip(candidate);
                            setRequest("");
                            setNotice("수정안을 적용했습니다.");
                          }}
                        >
                          적용
                        </button>
                        <button
                          className="secondary"
                          onClick={() => setCandidate(null)}
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        {view === "library" && (
          <section className="content-wrap">
            {recoveryBackup && (
              <div role="status">
                <p>
                  형식이 맞지 않는 저장본의 원본을 보존했습니다. 복구용 파일은
                  개인정보를 포함할 수 있으므로 직접 보관해 주세요.
                </p>
                <button
                  className="secondary"
                  onClick={() =>
                    downloadFile(
                      recoveryBackup,
                      "travel-recovery.json",
                      "application/json",
                    )
                  }
                >
                  복구용 JSON 다운로드
                </button>
              </div>
            )}
            <div className="section-heading">
              <div>
                <p>다시 펼쳐볼 여행</p>
                <h1>내 여행책</h1>
              </div>
              <button
                className="secondary"
                onClick={() => importRef.current?.click()}
              >
                <Upload size={17} />
                JSON 가져오기
              </button>
            </div>
            <input
              ref={importRef}
              hidden
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 3000000)
                    throw new Error("파일은 3MB 이하만 불러올 수 있습니다.");
                  const t = tripSchema.parse(JSON.parse(await f.text()));
                  save(t);
                } catch {
                  setError("지원하는 여행 JSON 파일이 아닙니다.");
                }
                e.target.value = "";
              }}
            />
            {!library.length ? (
              <div className="empty-state">
                <BookOpen size={40} />
                <h2>아직 첫 장을 쓰기 전이에요</h2>
                <p>예시를 보관하거나 새 여행을 만들어 보세요.</p>
                <button className="primary" onClick={() => navigate("create")}>
                  여행 만들기
                </button>
              </div>
            ) : (
              <div className="library-list">
                {library.map((t) => (
                  <div key={t.id}>
                    <button
                      onClick={() => {
                        setTrip(t);
                        setDay(0);
                        navigate("work");
                      }}
                    >
                      <BookOpen />
                      <span>
                        <strong>{t.title}</strong>
                        <small>
                          {t.brief.startDate} / {t.days.length}일 / 버전{" "}
                          {t.version}
                        </small>
                      </span>
                    </button>
                    <button
                      aria-label={`${t.title} 삭제`}
                      onClick={() => {
                        if (recoveryBlocked.current) {
                          setError(
                            "원본 보호를 위해 삭제를 중단했습니다. 복구용 JSON을 내려받고 저장 공간을 확보해 주세요.",
                          );
                          return;
                        }
                        if (
                          !window.confirm(
                            "이 브라우저에 보관한 여행을 삭제할까요?",
                          )
                        )
                          return;
                        const next = library.filter((x) => x.id !== t.id);
                        localStorage.setItem(
                          "travel-books-v1",
                          JSON.stringify(next),
                        );
                        setLibrary(next);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                    <button
                      aria-label={`${t.title} 복제`}
                      onClick={() =>
                        save({
                          ...structuredClone(t),
                          id: crypto.randomUUID(),
                          title: t.title + " (사본)",
                          version: 1,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                    >
                      복제
                    </button>
                    <button
                      aria-label={`${t.title} 계정에서도 삭제`}
                      onClick={() => {
                        if (
                          window.confirm(
                            "로그인한 계정의 이 여행과 모든 저장 버전, 이 브라우저의 보관본을 삭제할까요? 되돌릴 수 없습니다.",
                          )
                        )
                          void account("delete", t);
                      }}
                    >
                      계정에서도 삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="account-box">
              <h2>다른 기기에서도 이어보기</h2>
              <p>
                이메일로 로그인하면 계정에 저장한 여행을 불러올 수 있습니다. API
                키는 계정에 저장하지 않습니다.
              </p>
              <label>
                이메일
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="secondary" onClick={() => account("login")}>
                로그인 링크 받기
              </button>
              <button className="secondary" onClick={() => account("load")}>
                계정 여행 불러오기
              </button>
              <button className="secondary" onClick={() => account("logout")}>
                로그아웃
              </button>
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>여행의 결</span>
        <p>계획은 꼼꼼하게, 여행은 나답게.</p>
        <small>AI의 제안은 출발 전 확인이 필요합니다.</small>
      </footer>
      {demoOpen && (
        <DemoWalkthrough
          onClose={() => setDemoOpen(false)}
          onOpenExample={() => {
            setDemoOpen(false);
            openExample(0);
          }}
        />
      )}
      {exportOpen && trip && (
        <ExportDialog trip={trip} onClose={() => setExportOpen(false)} />
      )}
      <Dialog.Root open={keyOpen} onOpenChange={setKeyOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal">
            <Dialog.Title>나의 Gemini API 키</Dialog.Title>
            <Dialog.Description>
              입력한 키는 현재 화면의 메모리에만 보관합니다. AI 호출 시 앱
              서버를 거쳐 Google에 전달하며, 새로고침하면 다시 입력해야 합니다.
            </Dialog.Description>
            <label>
              API 키
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="본인의 Gemini API 키"
              />
            </label>
            <p className="quiet-note">
              사용 요금은 키 소유자의 Google 프로젝트에 청구됩니다. 공용 키는
              제공하지 않습니다.
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Google AI Studio에서 키 관리 ↗
            </a>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => {
                  setKey("");
                  setNotice("API 키를 메모리에서 지웠습니다.");
                }}
              >
                키 지우기
              </button>
              <button
                className="primary"
                disabled={!key || !!busy}
                onClick={async () => {
                  setBusy("키 연결을 확인하고 있습니다");
                  try {
                    await callAgent("check", {});
                    setNotice("Gemini 연결을 확인했습니다.");
                    setKeyOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "연결 실패");
                  } finally {
                    setBusy("");
                  }
                }}
              >
                연결 확인
              </button>
              <button className="secondary" onClick={() => setKeyOpen(false)}>
                닫기
              </button>
            </div>
            <Dialog.Close className="modal-close" aria-label="설정 닫기">
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {busy && (
        <div className="progress-panel" role="status">
          <LoaderCircle className="spin" size={24} />
          <div>
            <strong>{busy}</strong>
            {events.map((e) => (
              <small key={e}>{e}</small>
            ))}
          </div>
          <button
            onClick={() => {
              stopped.current = true;
              controller.current?.abort();
              setNotice("요청을 중단했습니다. 완료된 결과는 유지됩니다.");
            }}
          >
            중단
          </button>
        </div>
      )}
    </>
  );
}
