"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setStandalone(
        media.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    update();
    media.addEventListener("change", update);
    const offer = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const installed = () => {
      setInstallEvent(null);
      setMessage(
        "설치되었습니다. 홈 화면이나 앱 목록에서 여행의 결을 열어보세요.",
      );
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installed);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Installation guidance remains available; do not expose browser internals.
        });
    }
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  if (standalone) return null;
  return (
    <section className="install-app" aria-label="홈 화면에 추가">
      <div className="install-summary">
        <Smartphone size={24} />
        <div>
          <h2>다음 여행도, 한 번의 터치로.</h2>
          <p>홈 화면에 여행의 결을 추가해 두세요.</p>
        </div>
        <button
          className="secondary"
          aria-expanded={help}
          aria-controls="install-help"
          onClick={async () => {
            setHelp(true);
            if (!installEvent) return;
            try {
              await installEvent.prompt();
              const { outcome } = await installEvent.userChoice;
              setMessage(
                outcome === "accepted"
                  ? "설치 요청을 보냈습니다. 기기의 안내를 확인해 주세요."
                  : "설치를 취소했습니다. 브라우저 메뉴에서 나중에 추가할 수 있습니다.",
              );
            } catch {
              setMessage(
                "브라우저 메뉴의 앱 설치 또는 홈 화면에 추가를 이용해 주세요.",
              );
            } finally {
              setInstallEvent(null);
            }
          }}
        >
          <Download size={17} />
          {installEvent ? "앱 설치" : "홈 화면에 추가"}
        </button>
      </div>
      {help && (
        <div id="install-help" className="install-help">
          <p>
            <strong>아이폰·아이패드</strong> — Safari에서 이 사이트를 열고 공유
            메뉴의 ‘홈 화면에 추가’를 선택하세요. ‘웹 앱으로 열기’가 보이면 켜
            주세요.
          </p>
          <p>
            <strong>Android·컴퓨터</strong> — 지원되는 브라우저의 메뉴나
            주소창에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요. 설치 항목이
            없다면 북마크로 보관할 수 있습니다.
          </p>
          <p>
            AI 생성에는 인터넷과 본인의 API 키가 필요합니다. 오프라인 여행에는
            미리 내려받은 HTML 가이드북을 이용해 주세요.
          </p>
          <button className="text-button" onClick={() => setHelp(false)}>
            안내 접기
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
