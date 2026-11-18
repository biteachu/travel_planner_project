"use client";
import { useState } from "react";
import {
  conversionSchema,
  convertedAmount,
  money,
  type Activity,
} from "../lib/trip";

export function CostEditor({
  activity,
  currency,
  index,
  onChange,
}: {
  activity: Activity;
  currency: string;
  index: number;
  onChange: (activity: Activity) => void;
}) {
  const saved = activity.conversion;
  const [amount, setAmount] = useState(
    saved ? String(saved.originalAmount) : "",
  );
  const [originalCurrency, setOriginalCurrency] = useState(
    saved?.originalCurrency || "JPY",
  );
  const [rate, setRate] = useState(saved ? String(saved.rate) : "");
  const [asOf, setAsOf] = useState(saved?.asOf || "");
  const [source, setSource] = useState(saved?.source || "");
  const [error, setError] = useState("");
  return (
    <>
      <label>
        일행 전체 비용 · {currency}
        <input
          aria-label={`활동 ${index + 1} 비용`}
          type="number"
          min="0"
          max="1000000000"
          step="any"
          disabled={activity.locked}
          placeholder="미확인"
          value={activity.cost ?? ""}
          onChange={(event) => {
            const { conversion: _, ...rest } = activity;
            onChange({
              ...rest,
              cost:
                event.target.value === "" ? null : Number(event.target.value),
              costStatus: event.target.value === "" ? "미확인" : "입력",
            });
          }}
        />
      </label>
      {saved && (
        <p className="quiet-note">
          환산 기록: {money(saved.originalAmount, saved.originalCurrency)} ×{" "}
          {saved.rate} {currency} / 기준일 {saved.asOf} / 출처 {saved.source}{" "}
          (사용자 입력)
        </p>
      )}
      <details className="cost-conversion">
        <summary>다른 통화의 비용 환산</summary>
        <p className="quiet-note">
          자동 환율 조회가 아닙니다. 직접 확인한 환율을 입력하세요. 100단위 고시
          환율은 1단위로 나누어 입력하며 카드 수수료는 별도로 확인해 주세요.
        </p>
        <fieldset disabled={activity.locked}>
          <div className="form-grid">
            <label>
              원래 금액
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              원래 통화
              <select
                aria-label="원래 통화"
                value={originalCurrency}
                onChange={(e) =>
                  setOriginalCurrency(e.target.value as typeof originalCurrency)
                }
              >
                {["KRW", "USD", "EUR", "JPY", "TRY"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              1 {originalCurrency}당 {currency}
              <input
                type="number"
                min="0"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </label>
            <label>
              환율 기준일
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </label>
            <label className="full">
              환율 출처
              <input
                maxLength={500}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="확인한 은행·서비스 이름 또는 URL"
              />
            </label>
          </div>
          {error && <p role="alert">{error}</p>}
          <button
            className="secondary"
            type="button"
            onClick={() => {
              const result = conversionSchema.safeParse({
                originalAmount: amount === "" ? NaN : Number(amount),
                originalCurrency,
                rate: Number(rate),
                asOf,
                source,
              });
              if (!result.success) {
                setError(
                  "원래 금액, 양수인 환율, 기준일과 출처를 모두 입력해 주세요.",
                );
                return;
              }
              const cost = convertedAmount(
                result.data.originalAmount,
                result.data.rate,
                currency,
              );
              if (!Number.isFinite(cost) || cost > 1e9) {
                setError("환산 금액이 입력 가능한 범위를 초과했습니다.");
                return;
              }
              onChange({
                ...activity,
                cost,
                costStatus: "입력",
                conversion: result.data,
              });
              setError("");
            }}
          >
            환산 금액 적용
          </button>
        </fieldset>
      </details>
    </>
  );
}
