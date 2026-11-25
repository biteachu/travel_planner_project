"use client";
import { useEffect, useState } from "react";

export type ChatGPTStatus = {
  available: boolean;
  connected: boolean;
  active?: string;
  model?: string;
  welcome?: boolean;
  accounts?: { id: string; label: string; connected: boolean }[];
};
export function ChatGPTConnection({
  status,
  onChange,
  disabled,
}: {
  status: ChatGPTStatus;
  onChange: (value: ChatGPTStatus) => void;
  disabled: boolean;
}) {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!status.connected) {
      setModels([]);
      return;
    }
    let active = true;
    fetch("/api/chatgpt/models")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.error) setMessage(data.error);
        else setModels(data.models);
      })
      .catch(() => {
        if (active)
          setMessage("모델 목록을 가져오지 못했습니다. 다시 열어 주세요.");
      });
    return () => {
      active = false;
    };
  }, [status.connected, status.active]);
  async function action(name: string, body = {}) {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/chatgpt/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      const updated = await fetch("/api/chatgpt/status").then((r) => r.json());
      if (updated.error) throw new Error(updated.error);
      onChange(updated);
      if (name === "logout")
        setMessage(
          data.revoked
            ? "ChatGPT 연결을 해제했습니다."
            : "PC 연결은 해제했습니다. 원격 해제는 확인되지 않아 ChatGPT 설정에서도 연결을 해제해 주세요.",
        );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "연결을 확인해 주세요.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="chatgpt-connection" aria-labelledby="chatgpt-heading">
      <h3 id="chatgpt-heading">ChatGPT 구독으로 만들기</h3>
      {status.available ? (
        <>
          <p>
            이 PC에서 ChatGPT에 로그인하고 구독 사용에 동의하면 API 키 없이
            계획할 수 있습니다. 구독 한도를 함께 사용합니다.
          </p>
          <p>
            추가 지출을 원치 않으시면 ChatGPT 사용량 설정에서 크레딧 사용·자동
            구매를 꺼 주세요. 이 앱은 한도 초과 시 Claude API로 자동 전환하지
            않습니다.
          </p>
          {status.connected ? (
            <>
              <strong>ChatGPT 구독 연결 완료</strong>
              <p>
                {status.accounts?.find((a) => a.id === status.active)?.label}
              </p>
              {status.welcome && (
                <div className="notice-box" role="status">
                  <p>
                    이제 여행 생성에 ChatGPT 구독을 사용합니다. 모델을 선택한 후
                    시작해 주세요.
                  </p>
                  <button
                    className="secondary"
                    disabled={disabled || working}
                    onClick={() => action("acknowledge")}
                  >
                    확인했습니다
                  </button>
                </div>
              )}
              <label>
                여행 계획에 사용할 모델
                <select
                  value={status.model ?? ""}
                  disabled={disabled || working}
                  onChange={(e) => action("model", { model: e.target.value })}
                >
                  <option value="" disabled>
                    모델을 선택해 주세요
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary"
                disabled={disabled || working}
                onClick={() => action("logout")}
              >
                ChatGPT 연결 해제
              </button>
            </>
          ) : (
            <button
              className="chatgpt-signin"
              data-oai-siwc-button
              disabled={disabled || working}
              onClick={() => action("login")}
            >
              Continue with ChatGPT
            </button>
          )}
          {!!status.accounts?.length && (
            <details>
              <summary>저장된 계정으로 다시 로그인 / 계정 변경</summary>
              {status.accounts.map((a) => (
                <button
                  key={a.id}
                  className="secondary"
                  disabled={disabled || working}
                  onClick={() => action("login", { account: a.id })}
                >
                  {a.label}
                </button>
              ))}
              {status.connected && (
                <button
                  className="secondary"
                  disabled={disabled || working}
                  onClick={() => action("login")}
                >
                  다른 ChatGPT 계정 추가
                </button>
              )}
            </details>
          )}
          <a
            href="https://chatgpt.com/settings/usage"
            target="_blank"
            rel="noreferrer"
          >
            ChatGPT 사용량 관리 ↗
          </a>
          {working && <p role="status">연결 정보를 확인하고 있습니다…</p>}
          {message && <p role="alert">{message}</p>}
        </>
      ) : (
        <>
          <p>
            ChatGPT 구독 연결은 PC 로컬 실행에서 지원합니다. 공개 배포
            사이트에서는 아래의 개인 Claude API 키를 사용합니다.
          </p>
          <p>
            프로젝트 폴더에서 <code>npm run dev:local</code> 실행 후{" "}
            <a href="http://127.0.0.1:3417/">PC용 여행 플래너 열기</a>
          </p>
        </>
      )}
    </section>
  );
}
