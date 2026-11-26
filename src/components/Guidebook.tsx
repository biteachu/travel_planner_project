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
import type { ReactNode } from "react";
import { compactText, activityPhoto } from "../lib/guide-visuals";
import { DayRoute } from "./DayRoute";
import { GuidePhoto } from "./GuidePhoto";

export function Guidebook({
  trip,
  options = defaultExportOptions,
  renderMap,
  imageData = {},
  offline = false,
  section = "all",
}: {
  trip: Trip;
  options?: ExportOptions;
  renderMap?: (index: number) => ReactNode;
  imageData?: Record<string, string>;
  offline?: boolean;
  section?: "all" | "itinerary" | "places" | "dining" | "practical";
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
              <span translate="no" style={{ whiteSpace: "nowrap" }}>
                {s.provider === "Google Maps" ? "Google Maps" : ""}
              </span>
            </a>
          ),
      );
  const candidates = (kind: "식당" | "숙박", city?: string) => {
    const items = (trip.recommendations || []).filter(
      (item) =>
        (kind === "식당" ? item.kind === "식당" : item.kind !== "식당") &&
        (!city || item.city === city),
    );
    return items.length ? (
      items.map((item, index) => (
        <div
          className={kind === "식당" ? "dining-card" : "stay-row"}
          key={`${item.city}-${item.name}-${index}`}
        >
          <p className="section-kicker">
            {item.city} · {item.category || item.kind} · 후보 {index + 1} · 예약
            미확정
          </p>
          <h3>{item.name}</h3>
          {options.details && kind === "식당" && (
            <>
              <p className="dining-specialty">
                {item.specialty || compactText(item.reason, 180)}
              </p>
              {item.atmosphere && (
                <p>
                  <strong>분위기</strong> · {item.atmosphere}
                </p>
              )}
              <h4>맛볼 메뉴</h4>
              {item.menu?.length ? (
                <ul className="menu-list">
                  {item.menu.map((menu, i) => (
                    <li key={i}>
                      <strong>{menu.name}</strong>
                      <span>{menu.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fine-print">
                  이 가게의 메뉴 근거가 아직 부족합니다. 공식 메뉴를 확인해
                  주세요.
                </p>
              )}
            </>
          )}
          {options.details && (
            <details className="reading-details">
              <summary>추천 이유와 선택 전 확인</summary>
              <p>
                <strong>추천 이유</strong> · {item.reason}
              </p>
              <p>
                <strong>비교할 점</strong> · {item.tradeoff}
              </p>
              {item.checks.length > 0 && (
                <p>
                  <strong>선택 전 확인</strong> · {item.checks.join(" / ")}
                </p>
              )}
            </details>
          )}
          <p className="source-links">{sources(item.sourceIds)}</p>
          {!item.sourceIds.length && (
            <p>출처 미확인 · 직접 확인한 뒤 선택해 주세요.</p>
          )}
          <a
            href={mapUrl(`${item.city} ${item.name}`)}
            target="_blank"
            rel="noreferrer"
          >
            지도에서 후보 확인 ↗
          </a>
        </div>
      ))
    ) : (
      <p>
        근거가 연결된 {kind === "식당" ? "식당" : "숙박"} 후보가 아직 없습니다.
        확인되지 않은 업체를 임의로 채우지 않았습니다.
      </p>
    );
  };
  return (
    <article
      className={`guidebook${trip.bases.length > 1 ? " guidebook-multi" : ""}`}
      lang="ko"
      id="book-top"
      data-section={section}
    >
      {!!trip.visuals?.photos.some((p) => !p.activityId) &&
        (section === "all" || section === "itinerary") && (
          <div className="book-photo-spread">
            {trip
              .visuals!.photos.filter((p) => !p.activityId)
              .slice(0, 3)
              .map((photo) => (
                <figure key={photo.city}>
                  {(!offline || imageData[photo.file]) && (
                    <img
                      src={offline ? imageData[photo.file] : photo.url}
                      alt={`${photo.city} · ${photo.title} 대표사진`}
                      loading="eager"
                    />
                  )}
                  <figcaption>
                    <strong>{photo.city}</strong>
                    <span>{photo.title} · 도시 대표사진</span>
                    <details>
                      <summary>사진 출처</summary>
                      <a
                        href={photo.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {photo.credit} · {photo.license}
                      </a>{" "}
                      ·{" "}
                      <a
                        href={photo.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        이용 조건
                      </a>
                      <small>
                        화면에 맞게 잘라 표시
                        {offline ? " · 크기·압축 조정" : ""}
                      </small>
                    </details>
                  </figcaption>
                </figure>
              ))}
          </div>
        )}
      <header className="book-cover">
        <h1>{trip.title}</h1>
        <p>
          {trip.brief.country} / {trip.brief.pace}
        </p>
        <div className="book-cover-line" />
        {options.profile && <p>{compactText(trip.summary, 170)}</p>}
        {options.profile && trip.summary.length > 170 && (
          <details className="cover-details">
            <summary>여행 소개 더 읽기</summary>
            <p>{trip.summary}</p>
          </details>
        )}
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
      <nav
        className="book-contents"
        aria-label="가이드북 목차"
        hidden={section !== "all" && section !== "itinerary"}
      >
        <a href="#overview">한눈에 보기</a>
        {trip.days.map((d, i) => (
          <a key={d.date} href={`#day-${i}`}>
            {i + 1}일차
          </a>
        ))}
        {section === "all" && <a href="#places">장소 해설</a>}
        {section === "all" && <a href="#dining">맛집·술집</a>}
        {section === "all" && options.lodging && <a href="#stay">머무를 곳</a>}
        {section === "all" && options.budget && <a href="#budget">예산</a>}
        {section === "all" && <a href="#prepare">준비와 출처</a>}
      </nav>
      <section
        id="overview"
        hidden={section !== "all" && section !== "itinerary"}
      >
        <h2>이번 여행, 한눈에</h2>
        <div className="trip-at-a-glance">
          <strong>{trip.days.length}일의 여행</strong>
          <span>
            {trip.bases.map((b) => `${b.city} ${b.nights}박`).join(" → ")}
          </span>
        </div>
        {(trip.brief.firstDayStart || trip.brief.lastDayEnd) && (
          <p>
            활동 가능 시간 ·{" "}
            {trip.brief.firstDayStart
              ? `첫날 ${trip.brief.firstDayStart}부터`
              : "첫날 시작 제한 없음"}{" "}
            /{" "}
            {trip.brief.lastDayEnd
              ? `마지막 날 ${trip.brief.lastDayEnd}까지`
              : "마지막 날 종료 제한 없음"}{" "}
            (현지 시간, 사용자 입력)
          </p>
        )}
        <div className="base-grid">
          {trip.bases.map((b, i) => (
            <div key={i}>
              <span className="base-number">{i + 1}</span>
              <h3>
                {b.city} <small>{b.nights}박</small>
              </h3>
              {options.details && (
                <details className="reading-details">
                  <summary>이 거점에 머무는 이유</summary>
                  <p>{b.reason}</p>
                </details>
              )}
            </div>
          ))}
        </div>
        {trip.warnings.length > 0 && (
          <details className="notice warning-drawer">
            <summary>
              <strong>여행 전 확인 사항</strong>
              <span>{trip.warnings.length}개 · 펼쳐서 확인</span>
            </summary>
            <p>
              확인이 필요한 항목을 모두 보관했습니다. 예약·결제 전 관련 내용을
              확인해 주세요.
            </p>
            <ul>
              {trip.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
      {trip.days.map((day, i) => (
        <details
          className="book-day"
          id={`day-${i}`}
          key={day.date}
          open
          hidden={section !== "all" && section !== "itinerary"}
        >
          <summary>
            <span className="day-count">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <small>
                {day.date} / {day.city}
              </small>
              <strong>{day.title}</strong>
            </span>
            <span className="details-mark" aria-hidden>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M5 12h14M12 5v14" />
              </svg>
            </span>
          </summary>
          <div className="day-body">
            <DayRoute
              trip={trip}
              index={i}
              lodging={options.lodging}
              interactive={renderMap?.(i)}
            />
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
                  {(options.lodging || a.kind !== "숙박") &&
                    activityPhoto(trip, a.id, a.title, day.city) && (
                      <GuidePhoto
                        photo={activityPhoto(trip, a.id, a.title, day.city)!}
                        offline={offline}
                        imageData={imageData}
                      />
                    )}
                  {options.details &&
                    (options.lodging || a.kind !== "숙박") && (
                      <>
                        <p className="activity-summary">
                          {compactText(a.description)}
                        </p>
                        {a.transport && (
                          <p className="transport">
                            이동 · {compactText(a.transport, 85)}
                          </p>
                        )}
                        <details className="reading-details">
                          <summary>장소 이야기·추천 이유·이동 자세히</summary>
                          <p>{a.description}</p>
                          <p className="reason">{a.reason}</p>
                          {a.transport && <p>이동 · {a.transport}</p>}
                        </details>
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
                  {!!a.sourceIds.length && (
                    <details className="source-drawer">
                      <summary>참고 자료 {a.sourceIds.length}개</summary>
                      <div className="sources-inline">
                        {sources(a.sourceIds)}
                      </div>
                    </details>
                  )}
                  {options.budget && a.conversion && (
                    <p className="fine-print">
                      환산:{" "}
                      {money(
                        a.conversion.originalAmount,
                        a.conversion.originalCurrency,
                      )}{" "}
                      × {a.conversion.rate} {trip.brief.currency} / 기준일{" "}
                      {a.conversion.asOf} / 출처 {a.conversion.source} (사용자
                      입력)
                    </p>
                  )}
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
      <section id="places" hidden={section !== "all" && section !== "places"}>
        <p className="section-kicker">장소를 알고, 여행을 더 깊게</p>
        <h2>풍경 너머의 이야기</h2>
        <p>여정에 포함된 장소의 배경과 눈여겨볼 장면을 모았습니다.</p>
        {trip.placeGuides
          ?.filter((g) =>
            trip.days.some((d) =>
              d.activities.some(
                (a) =>
                  a.id === g.activityId &&
                  a.title === g.activityTitle &&
                  (options.lodging || a.kind !== "숙박"),
              ),
            ),
          )
          .map((g) => {
            const day = trip.days.find((d) =>
              d.activities.some((a) => a.id === g.activityId),
            )!;
            const photo = activityPhoto(
              trip,
              g.activityId,
              g.activityTitle,
              day.city,
            );
            return (
              <article className="place-guide-card" key={g.activityId}>
                {photo ? (
                  <GuidePhoto
                    photo={photo}
                    offline={offline}
                    imageData={imageData}
                  />
                ) : (
                  <div className="photo-unavailable">
                    이 장소의 사진을 아직 연결하지 못했습니다.
                  </div>
                )}
                <div className="place-guide-copy">
                  <p className="section-kicker">
                    {day.date} · {day.city}
                  </p>
                  <h3>{g.name}</h3>
                  {options.details && (
                    <>
                      <p className="place-intro">{g.introduction}</p>
                      <h4>알고 보면 더 좋은 장면</h4>
                      <ul className="highlights">
                        {g.highlights.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                      {g.background ? (
                        <details className="reading-details">
                          <summary>역사와 문화적 배경 읽기</summary>
                          <p>{g.background}</p>
                        </details>
                      ) : (
                        <p className="fine-print">
                          역사적 배경을 뒷받침하는 자료는 아직 부족합니다.
                        </p>
                      )}
                      {g.visitTip && (
                        <p className="visit-tip">
                          <strong>방문 팁</strong> {g.visitTip}
                        </p>
                      )}
                    </>
                  )}
                  <div className="source-links">{sources(g.sourceIds)}</div>
                  <a
                    href={mapUrl(`${day.city} ${g.name}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    장소 지도 열기 ↗
                  </a>
                </div>
              </article>
            );
          })}
        {!trip.placeGuides?.length && (
          <div className="guide-empty">
            <h3>장소의 이야기를 더할 차례입니다</h3>
            <p>
              기존 여행책은 ‘가이드북 내용 보강’을 실행하면 일정을 유지하면서
              관광지 해설과 음식점 추천을 추가할 수 있습니다. 해설에 쓸 근거가
              없는 장소는 임의로 채우지 않습니다.
            </p>
          </div>
        )}
      </section>
      <section id="dining" hidden={section !== "all" && section !== "dining"}>
        <p className="section-kicker">오늘은 어디서 먹고 마실까요?</p>
        <h2>맛집·술집 골라보기</h2>
        <p>
          일정에 넣기 전 비교하는 후보입니다. 후보의 비용은 예산에 별도로 더하지
          않으며, 영업·메뉴·예약 가능 여부를 다시 확인해 주세요.
        </p>
        {[
          ...new Set(
            (trip.recommendations || [])
              .filter((r) => r.kind === "식당")
              .map((r) => r.city),
          ),
        ].map((city) => (
          <div className="dining-city" key={city}>
            <h3>{city}</h3>
            <div className="dining-grid">{candidates("식당", city)}</div>
          </div>
        ))}
        {!trip.recommendations?.some((r) => r.kind === "식당") && (
          <div className="guide-empty">
            <p>
              근거가 연결된 식당 후보가 아직 없습니다. ‘가이드북 내용 보강’으로
              취향과 동선에 맞는 식당·술집 자료를 조사할 수 있습니다.
            </p>
          </div>
        )}
      </section>
      {options.lodging && (
        <section
          id="stay"
          hidden={section !== "all" && section !== "practical"}
        >
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
          <p>
            숙박 지역과 숙소 후보를 비교해 보세요. 아래 목록은 예약이나 추가
            숙박 일정을 의미하지 않습니다.
          </p>
          {candidates("숙박")}
        </section>
      )}
      {options.budget && (
        <section
          id="budget"
          hidden={section !== "all" && section !== "practical"}
        >
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
          <p>
            {total.knownCount ? (
              <>
                <strong>
                  {total.known > trip.brief.budget
                    ? "현재 계산된 초과 금액"
                    : "현재 계산된 잔여 예산"}
                  :{" "}
                  {money(
                    Math.abs(trip.brief.budget - total.known),
                    trip.brief.currency,
                  )}
                </strong>
                <br />
                미확인 비용과 미입력 경비는 차감하지 않은 금액이며, 확정된 여유
                금액이 아닙니다.
              </>
            ) : (
              "비용이 아직 입력되지 않아 잔여 예산을 계산하지 않았습니다."
            )}
          </p>
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
        <section hidden={section !== "all" && section !== "places"}>
          <h2>여행의 뒷이야기</h2>
          {trip.stories.map((s, i) => (
            <details className="story reading-details" key={i}>
              <summary>{s.title}</summary>
              <p>{s.body}</p>
              <div className="sources-inline">{sources(s.sourceIds)}</div>
            </details>
          ))}
        </section>
      )}
      <section
        id="prepare"
        hidden={section !== "all" && section !== "practical"}
      >
        <h2>준비와 재확인</h2>
        <details className="reading-details">
          <summary>여행 준비 팁 {trip.tips.length}개</summary>
          <ul className="tips">
            {trip.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </details>
        <details className="reading-details">
          <summary>참고 자료와 이용 조건 · {trip.sources.length}개</summary>
          {trip.sources.some((source) => source.license === "CC BY-SA 4.0") && (
            <p className="fine-print">
              Wikivoyage 기여자의 글을 한국어로 번역·요약하고 여행 조건에 맞게
              재구성했습니다. 이 자료를 바탕으로 한 여행 안내 본문은{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
              으로 제공합니다. 공유·변형 시 출처·기여자·라이선스·변경 표시를
              유지하고 동일한 라이선스로 배포해 주세요. 개인 메모·예약정보를
              공개하라는 의미는 아닙니다. 자료 조회일은 현재 영업·가격의
              확인일이 아닙니다.
            </p>
          )}
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
                <span translate="no" style={{ whiteSpace: "nowrap" }}>
                  {s.provider}
                </span>{" "}
                / 확인: {s.checkedAt}
                {s.license && (
                  <>
                    <br />
                    Wikivoyage 기여자 ·{" "}
                    <a
                      href="https://creativecommons.org/licenses/by-sa/4.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.license}
                    </a>
                    {s.attributionUrl && safeUrl(s.attributionUrl) && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={safeUrl(s.attributionUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          기여자·문서 이력
                        </a>
                      </>
                    )}
                    {s.revision && <> · 문서 버전 {s.revision}</>}
                    {s.revisedAt && (
                      <> · 원문 수정 {s.revisedAt.slice(0, 10)}</>
                    )}
                  </>
                )}
              </p>
            ))
          ) : (
            <p>
              {trip.isExample
                ? "이 예시는 최신 여행 정보를 조사한 결과가 아닙니다."
                : "연결된 출처가 없습니다. 장소와 이동 정보를 출발 전에 확인해 주세요."}
            </p>
          )}
        </details>
        <p className="fine-print">
          외부 지도·출처 링크는 인터넷 연결이 필요합니다. 실제 영업·운행·예약
          가능 여부는 출발 전 확인해 주세요. 가이드북 버전 {trip.version} / 생성{" "}
          {trip.updatedAt.slice(0, 10)}
        </p>
      </section>
      <footer className="book-footer">
        여행의 결 <span>계획은 꼼꼼하게, 여행은 나답게.</span>
      </footer>
      <a
        className="back-to-top"
        href="#book-top"
        onClick={
          offline
            ? undefined
            : (event) => {
                event.preventDefault();
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                });
              }
        }
        aria-label="가이드북 맨 위로 이동"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 13 6-6 6 6M12 7v14M5 3h14" />
        </svg>
        <span>맨 위로</span>
      </a>
    </article>
  );
}
