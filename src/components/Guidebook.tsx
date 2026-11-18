import {
  type Trip,
  costSummary,
  categoryCosts,
  money,
  mapUrl,
  safeUrl,
} from "../lib/trip";
import {
  defaultExportOptions,
  type ExportOptions,
} from "../lib/export-options";

export function Guidebook({
  trip,
  options = defaultExportOptions,
}: {
  trip: Trip;
  options?: ExportOptions;
}) {
  const total = costSummary(trip);
  const sources = (ids: string[]) =>
    ids
      .map((id) => trip.sources.find((s) => s.id === id))
      .filter((s) => s && safeUrl(s.url))
      .map(
        (s) =>
          s && (
            <a
              key={s.id}
              href={safeUrl(s.url)}
              target="_blank"
              rel="noreferrer"
            >
              {s.title}{" "}
              <span translate="no">
                {s.provider === "Google Maps" ? "Google Maps" : ""}
              </span>
            </a>
          ),
      );
  return (
    <article className="guidebook" lang="ko">
      <header className="book-cover">
        <span className="book-series">여행의 결 · 나만의 여행책</span>
        <p>
          {trip.brief.country} / {trip.brief.pace}
        </p>
        <h1>{trip.title}</h1>
        <div className="book-cover-line" />
        {options.profile && <p>{trip.summary}</p>}
        <div className="book-meta">
          <span>
            {trip.brief.startDate} — {trip.brief.endDate}
          </span>
          {options.profile && (
            <span>
              {trip.brief.people}명 / {trip.brief.interests.join(", ")}
            </span>
          )}
        </div>
        <span className="status-stamp">
          {trip.isExample ? "체험용 예시" : trip.status}
        </span>
      </header>
      <nav className="book-contents" aria-label="가이드북 목차">
        <a href="#overview">한눈에 보기</a>
        {trip.days.map((d, i) => (
          <a key={d.date} href={`#day-${i}`}>
            {i + 1}일차
          </a>
        ))}
        {options.lodging && <a href="#stay">머무를 곳</a>}
        {options.budget && <a href="#budget">예산</a>}
        <a href="#prepare">준비와 출처</a>
      </nav>
      <section id="overview">
        <p className="section-kicker">여행의 큰 그림</p>
        <h2>어디에 머물고, 어떻게 여행할까요</h2>
        <div className="base-grid">
          {trip.bases.map((b, i) => (
            <div key={i}>
              <span className="base-number">{i + 1}</span>
              <h3>
                {b.city} <small>{b.nights}박</small>
              </h3>
              {options.details && <p>{b.reason}</p>}
            </div>
          ))}
        </div>
        {trip.warnings.length > 0 && (
          <aside className="notice">
            <strong>여행 전에 확인해 주세요</strong>
            <ul>
              {trip.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </aside>
        )}
      </section>
      {trip.days.map((day, i) => (
        <details className="book-day" id={`day-${i}`} key={day.date} open>
          <summary>
            <span className="day-count">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <small>
                {day.date} / {day.city}
              </small>
              <strong>{day.title}</strong>
            </span>
            <span className="details-mark" aria-hidden>
              ＋
            </span>
          </summary>
          <div className="day-body">
            {day.activities.map((a) => (
              <div className="book-activity" key={a.id}>
                <div className="time">
                  {a.time}
                  <small>{a.duration}분</small>
                </div>
                <div>
                  <span className="kind">
                    {a.kind}
                    {a.locked ? " · 고정" : ""}
                  </span>
                  <h3>
                    {!options.lodging && a.kind === "숙박"
                      ? "숙박 정보 생략"
                      : a.title}
                  </h3>
                  {options.details &&
                    (options.lodging || a.kind !== "숙박") && (
                      <>
                        <p>{a.description}</p>
                        <p className="reason">{a.reason}</p>
                        {a.transport && (
                          <p className="transport">이동 · {a.transport}</p>
                        )}
                      </>
                    )}
                  <div className="activity-links">
                    {(options.lodging || a.kind !== "숙박") && (
                      <a
                        href={mapUrl(a.title + " " + day.city)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        지도에서 보기 ↗
                      </a>
                    )}
                    {options.budget && (
                      <span>
                        {a.cost === null
                          ? "비용 확인 필요"
                          : `${money(a.cost, trip.brief.currency)} (${a.costStatus})`}
                      </span>
                    )}
                  </div>
                  <div className="sources-inline">{sources(a.sourceIds)}</div>
                  {options.details &&
                    (options.lodging || a.kind !== "숙박") &&
                    a.alternative && (
                      <details className="alternative">
                        <summary>다른 선택이 필요할 때</summary>
                        <p>{a.alternative}</p>
                      </details>
                    )}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
      {options.lodging && (
        <section id="stay">
          <p className="section-kicker">머무는 시간도 여행</p>
          <h2>숙박 거점 고르기</h2>
          {trip.bases.map((b, i) => (
            <div className="stay-row" key={i}>
              <h3>{b.city}</h3>
              <p>{b.neighborhood}</p>
              <a
                href={mapUrl(b.city + " 숙소")}
                target="_blank"
                rel="noreferrer"
              >
                주변 살펴보기 ↗
              </a>
            </div>
          ))}
        </section>
      )}
      {options.budget && (
        <section id="budget">
          <p className="section-kicker">일행 전체 / 항공료 제외</p>
          <h2>여행 예산</h2>
          <div className="budget-grid">
            <div>
              <small>계획 예산</small>
              <strong>{money(trip.brief.budget, trip.brief.currency)}</strong>
            </div>
            <div>
              <small>입력·추정·조회 금액 합계</small>
              <strong>
                {total.knownCount
                  ? money(total.known, trip.brief.currency)
                  : "아직 미확인"}
              </strong>
            </div>
            <div>
              <small>아직 확인할 비용</small>
              <strong>{total.unknown}개 항목</strong>
            </div>
          </div>
          <table className="cost-table">
            <caption>항목별 경비</caption>
            <thead>
              <tr>
                <th>항목</th>
                <th>계산 가능한 금액</th>
                <th>확인 필요</th>
              </tr>
            </thead>
            <tbody>
              {categoryCosts(trip).map((c) => (
                <tr key={c.kind}>
                  <th>{c.kind}</th>
                  <td>
                    {c.known ? money(c.total, trip.brief.currency) : "미확인"}
                  </td>
                  <td>
                    {c.unknown}개{!c.known && !c.unknown ? " · 미입력" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            미확인 비용은 합계에 포함하지 않았습니다. 숙박비가 별도 일정
            항목으로 입력되지 않았다면 합계에 포함되지 않습니다. 실제 총경비와
            다를 수 있습니다.
          </p>
        </section>
      )}
      {trip.stories.length > 0 && (
        <section>
          <p className="section-kicker">알고 보면 더 좋은 여행</p>
          <h2>여행의 뒷이야기</h2>
          {trip.stories.map((s, i) => (
            <div className="story" key={i}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="sources-inline">{sources(s.sourceIds)}</div>
            </div>
          ))}
        </section>
      )}
      <section id="prepare">
        <p className="section-kicker">출발 전에 한 번 더</p>
        <h2>준비와 재확인</h2>
        <ul className="tips">
          {trip.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
        <h3>참고한 자료</h3>
        {trip.sources.length ? (
          trip.sources.map((s) => (
            <p key={s.id}>
              {safeUrl(s.url) ? (
                <a href={safeUrl(s.url)} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
              ) : (
                s.title
              )}{" "}
              <span translate="no">{s.provider}</span> / 확인: {s.checkedAt}
            </p>
          ))
        ) : (
          <p>
            {trip.isExample
              ? "이 예시는 최신 여행 정보를 조사한 결과가 아닙니다."
              : "연결된 출처가 없습니다. 장소와 이동 정보를 출발 전에 확인해 주세요."}
          </p>
        )}
        <p className="fine-print">
          외부 지도·출처 링크는 인터넷 연결이 필요합니다. 실제 영업·운행·예약
          가능 여부는 출발 전 확인해 주세요. 가이드북 버전 {trip.version} / 생성{" "}
          {trip.updatedAt.slice(0, 10)}
        </p>
      </section>
      <footer className="book-footer">
        여행의 결 <span>계획은 꼼꼼하게, 여행은 나답게.</span>
      </footer>
    </article>
  );
}
