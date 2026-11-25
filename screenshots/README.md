# 커밋별 화면 기록

대상: 최초 커밋부터 `496150f`까지 45개 커밋. 이 아카이브를 저장하는 이후 커밋은 대상에 포함하지 않습니다.

- [한눈에 비교하기](index.html) — 로컬에서 열 수 있는 이미지 목록
- [최초 구현 당시 보존한 원본](original-initial/README.md) — 첫 앱 커밋에서 그대로 추출한 4장
- [A·B·C 디자인 시안](design-options/README.md) — 비교 시안 커밋의 재현 6장
- [사진 출처](../public/travel-photos/CREDITS.md) — 최신 첫 화면에 포함된 사진의 작가·원본
- 각 커밋 폴더: 첫 화면, 여행 입력 3단계, 예시 가이드북, 일정 편집, API 키 설정의 PC·모바일 PNG
- PC 1440×1000, 모바일 390×844 뷰포트에서 전체 페이지 촬영. 스크롤 길이에 따라 이미지 높이는 다릅니다.
- **커밋별 이미지는 과거 소스를 현재 환경에서 실행한 사후 재현본입니다.** 당시 촬영했다고 표시하지 않습니다. 초기 원본은 별도 폴더로 구분합니다.
- Node v24.13.1, Next 16.4.6, 설치된 Chrome과 현재 공용 node_modules로 실행. 개발 서버 표시가 포함될 수 있습니다. 과거 OS·브라우저·서버 환경까지 재현한 것은 아닙니다.
- 사용자 키·계정 없이 공개 예시로 촬영했으며 실제 AI 생성·계정 저장 성공의 증거가 아닙니다.
- 영상 작업·로그인·유료 API 호출은 하지 않았습니다. 진행 중인 영상 변경은 포함하지 않습니다.
- 소스·공개 자산·구성·의존성 명세가 같은 UI는 동일 캡처를 재사용합니다. 화면을 호출하지 않는 서버 전용 경로는 비교에서 제외했습니다. manifest.json의 signature와 capturedFrom으로 확인할 수 있습니다.
- 촬영 실행 시작(UTC): 2026-11-25T09:20:21.974Z
- 커밋별 PNG 616장 검사 완료. 원본·추가 시안 캡처는 이 수치에서 제외합니다.

| 커밋 | 커밋 시각 | 내용 | 상태 | PC 첫 화면 | 모바일 첫 화면 | 전체 파일 |
|---|---|---|---|---|---|---|
| 2462bfe | 2026-11-18T17:51:25+09:00 | Initial commit | 화면 없음 | — | — | [설명](01-2462bfe/README.md) |
| fa4b5fc | 2026-11-18T19:33:25+09:00 | feat: implement travel guidebook web app and preserve initial screens | 해당 커밋 실행·캡처 | [PNG](02-fa4b5fc/home-desktop.png) | [PNG](02-fa4b5fc/home-mobile.png) | [설명](02-fa4b5fc/README.md) |
| 0c351bb | 2026-11-18T19:40:13+09:00 | feat: resume daily planning and improve guidebook budget validation | 해당 커밋 실행·캡처 | [PNG](03-0c351bb/home-desktop.png) | [PNG](03-0c351bb/home-mobile.png) | [설명](03-0c351bb/README.md) |
| 75b8fb0 | 2026-11-18T19:46:00+09:00 | feat: preserve unfinished travel preferences across reloads | 해당 커밋 실행·캡처 | [PNG](04-75b8fb0/home-desktop.png) | [PNG](04-75b8fb0/home-mobile.png) | [설명](04-75b8fb0/README.md) |
| 557fb26 | 2026-11-18T19:48:31+09:00 | feat: edit activity durations and reorder unlocked schedules | 해당 커밋 실행·캡처 | [PNG](05-557fb26/home-desktop.png) | [PNG](05-557fb26/home-mobile.png) | [설명](05-557fb26/README.md) |
| c370b7f | 2026-11-18T19:52:09+09:00 | feat: preview and select guidebook export contents | 해당 커밋 실행·캡처 | [PNG](06-c370b7f/home-desktop.png) | [PNG](06-c370b7f/home-mobile.png) | [설명](06-c370b7f/README.md) |
| 4cced52 | 2026-11-18T19:56:03+09:00 | feat: enforce confirmed reservation constraints during planning | 해당 커밋 실행·캡처 | [PNG](07-4cced52/home-desktop.png) | [PNG](07-4cced52/home-mobile.png) | [설명](07-4cced52/README.md) |
| fc6bd8c | 2026-11-18T19:58:58+09:00 | feat: constrain first and last day activity windows | 해당 커밋 실행·캡처 | [PNG](08-fc6bd8c/home-desktop.png) | [PNG](08-fc6bd8c/home-mobile.png) | [설명](08-fc6bd8c/README.md) |
| 22a8b68 | 2026-11-18T20:02:55+09:00 | fix: preserve traveler preferences and research evidence across agents | 해당 커밋 실행·캡처 | [PNG](09-22a8b68/home-desktop.png) | [PNG](09-22a8b68/home-mobile.png) | [설명](09-22a8b68/README.md) |
| 87bc94b | 2026-11-18T20:07:38+09:00 | feat: track manual currency conversions and provisional budget balance | 해당 커밋 실행·캡처 | [PNG](10-87bc94b/home-desktop.png) | [PNG](10-87bc94b/home-mobile.png) | [설명](10-87bc94b/README.md) |
| 0fe9412 | 2026-11-18T20:10:41+09:00 | feat: research travel bases in resumable stages | 해당 커밋 실행·캡처 | [PNG](11-0fe9412/home-desktop.png) | [PNG](11-0fe9412/home-mobile.png) | [설명](11-0fe9412/README.md) |
| 6b6ee2f | 2026-11-18T20:14:44+09:00 | feat: preserve account trip revisions and support cloud deletion | 해당 커밋 실행·캡처 | [PNG](12-6b6ee2f/home-desktop.png) | [PNG](12-6b6ee2f/home-mobile.png) | [설명](12-6b6ee2f/README.md) |
| 049dd19 | 2026-11-18T20:19:39+09:00 | feat: run bounded itinerary repair after agent review | 해당 커밋 실행·캡처 | [PNG](13-049dd19/home-desktop.png) | [PNG](13-049dd19/home-mobile.png) | [설명](13-049dd19/README.md) |
| a1a9ffc | 2026-11-18T20:22:26+09:00 | feat: add clearly labeled key-free planning walkthrough | 해당 커밋 실행·캡처 | [PNG](14-a1a9ffc/home-desktop.png) | [PNG](14-a1a9ffc/home-mobile.png) | [설명](14-a1a9ffc/README.md) |
| 22c09f6 | 2026-11-18T20:32:44+09:00 | feat: add reproducible trailer and process video drafts | 해당 커밋 실행·캡처 | [PNG](15-22c09f6/home-desktop.png) | [PNG](15-22c09f6/home-mobile.png) | [설명](15-22c09f6/README.md) |
| 6df98ff | 2026-11-18T20:35:25+09:00 | fix: preserve generation state when cancelling requests | 해당 커밋 실행·캡처 | [PNG](16-6df98ff/home-desktop.png) | [PNG](16-6df98ff/home-mobile.png) | [설명](16-6df98ff/README.md) |
| 167483a | 2026-11-18T20:38:53+09:00 | feat: compare sourced dining and lodging candidates in guidebooks | 해당 커밋 실행·캡처 | [PNG](17-167483a/home-desktop.png) | [PNG](17-167483a/home-mobile.png) | [설명](17-167483a/README.md) |
| 6242e78 | 2026-11-18T20:40:40+09:00 | docs: record grounding restrictions affecting guidebook exports | 해당 커밋 실행·캡처 | [PNG](18-6242e78/home-desktop.png) | [PNG](18-6242e78/home-mobile.png) | [설명](18-6242e78/README.md) |
| 7ff92e1 | 2026-11-18T20:42:54+09:00 | fix: bound incoming agent request bodies while streaming | 동일 UI 캡처 재사용 | [PNG](19-7ff92e1/home-desktop.png) | [PNG](19-7ff92e1/home-mobile.png) | [설명](19-7ff92e1/README.md) |
| 0d9a594 | 2026-11-18T20:49:25+09:00 | fix: protect saved trips and reject stale revision proposals | 해당 커밋 실행·캡처 | [PNG](20-0d9a594/home-desktop.png) | [PNG](20-0d9a594/home-mobile.png) | [설명](20-0d9a594/README.md) |
| 7130a82 | 2026-11-18T20:51:56+09:00 | fix: recover completed guidebooks when final storage fails | 해당 커밋 실행·캡처 | [PNG](21-7130a82/home-desktop.png) | [PNG](21-7130a82/home-mobile.png) | [설명](21-7130a82/README.md) |
| 4fd70f2 | 2026-11-18T21:01:11+09:00 | feat: research guidebooks using attributed open travel sources | 해당 커밋 실행·캡처 | [PNG](22-4fd70f2/home-desktop.png) | [PNG](22-4fd70f2/home-mobile.png) | [설명](22-4fd70f2/README.md) |
| 303bb50 | 2026-11-18T21:03:59+09:00 | chore: prepare Vercel deployment and remote smoke checks | 동일 UI 캡처 재사용 | [PNG](23-303bb50/home-desktop.png) | [PNG](23-303bb50/home-mobile.png) | [설명](23-303bb50/README.md) |
| f5855a7 | 2026-11-18T21:06:04+09:00 | docs: audit remaining implementation and submission requirements | 해당 커밋 실행·캡처 | [PNG](24-f5855a7/home-desktop.png) | [PNG](24-f5855a7/home-mobile.png) | [설명](24-f5855a7/README.md) |
| 05fc1f9 | 2026-11-18T21:14:16+09:00 | Add database-backed agent request limits | 동일 UI 캡처 재사용 | [PNG](25-05fc1f9/home-desktop.png) | [PNG](25-05fc1f9/home-mobile.png) | [설명](25-05fc1f9/README.md) |
| f14cda1 | 2026-11-18T21:20:35+09:00 | Preserve local edits during account requests | 해당 커밋 실행·캡처 | [PNG](26-f14cda1/home-desktop.png) | [PNG](26-f14cda1/home-mobile.png) | [설명](26-f14cda1/README.md) |
| 8940344 | 2026-11-18T21:22:56+09:00 | Preserve malformed library data for recovery | 해당 커밋 실행·캡처 | [PNG](27-8940344/home-desktop.png) | [PNG](27-8940344/home-mobile.png) | [설명](27-8940344/README.md) |
| d5516c6 | 2026-11-18T21:26:10+09:00 | Attach provenance metadata to guidebook exports | 해당 커밋 실행·캡처 | [PNG](28-d5516c6/home-desktop.png) | [PNG](28-d5516c6/home-mobile.png) | [설명](28-d5516c6/README.md) |
| 458258e | 2026-11-18T21:36:33+09:00 | Record hosted database verification results | 동일 UI 캡처 재사용 | [PNG](29-458258e/home-desktop.png) | [PNG](29-458258e/home-mobile.png) | [설명](29-458258e/README.md) |
| 9596dad | 2026-11-18T21:46:37+09:00 | Document verified public deployment | 동일 UI 캡처 재사용 | [PNG](30-9596dad/home-desktop.png) | [PNG](30-9596dad/home-mobile.png) | [설명](30-9596dad/README.md) |
| 1e753b7 | 2026-11-23T17:43:45+09:00 | Switch travel agents to Claude and bound day revisions | 해당 커밋 실행·캡처 | [PNG](31-1e753b7/home-desktop.png) | [PNG](31-1e753b7/home-mobile.png) | [설명](31-1e753b7/README.md) |
| 8bbe402 | 2026-11-23T17:49:44+09:00 | Verify month-long offline guidebooks in Chrome and Edge | 동일 UI 캡처 재사용 | [PNG](32-8bbe402/home-desktop.png) | [PNG](32-8bbe402/home-mobile.png) | [설명](32-8bbe402/README.md) |
| 1b6e8a3 | 2026-11-23T17:50:44+09:00 | Correct Claude authentication documentation source | 동일 UI 캡처 재사용 | [PNG](33-1b6e8a3/home-desktop.png) | [PNG](33-1b6e8a3/home-mobile.png) | [설명](33-1b6e8a3/README.md) |
| abf20ad | 2026-11-23T18:04:38+09:00 | Add three interactive redesign options and clarify personal API keys | 해당 커밋 실행·캡처 | [PNG](34-abf20ad/home-desktop.png) | [PNG](34-abf20ad/home-mobile.png) | [설명](34-abf20ad/README.md) |
| 879e294 | 2026-11-23T18:49:13+09:00 | Apply selected blue design and add home-screen web app installation | 해당 커밋 실행·캡처 | [PNG](35-879e294/home-desktop.png) | [PNG](35-879e294/home-mobile.png) | [설명](35-879e294/README.md) |
| 53b4cd4 | 2026-11-23T18:51:36+09:00 | Document selected design system and offline font regression coverage | 동일 UI 캡처 재사용 | [PNG](36-53b4cd4/home-desktop.png) | [PNG](36-53b4cd4/home-mobile.png) | [설명](36-53b4cd4/README.md) |
| 2d4e4f1 | 2026-11-23T19:51:56+09:00 | Connect actual design evidence and render video review drafts | 동일 UI 캡처 재사용 | [PNG](37-2d4e4f1/home-desktop.png) | [PNG](37-2d4e4f1/home-mobile.png) | [설명](37-2d4e4f1/README.md) |
| 22ffcab | 2026-11-23T19:53:57+09:00 | Record current dependency audit and remaining privacy verification | 동일 UI 캡처 재사용 | [PNG](38-22ffcab/home-desktop.png) | [PNG](38-22ffcab/home-mobile.png) | [설명](38-22ffcab/README.md) |
| 490c9d7 | 2026-11-23T19:57:50+09:00 | Block explicitly labelled booking references before AI requests and HTML export | 해당 커밋 실행·캡처 | [PNG](39-490c9d7/home-desktop.png) | [PNG](39-490c9d7/home-mobile.png) | [설명](39-490c9d7/README.md) |
| 146e6d4 | 2026-11-23T20:53:08+09:00 | Show verified API key status and connection management | 해당 커밋 실행·캡처 | [PNG](40-146e6d4/home-desktop.png) | [PNG](40-146e6d4/home-mobile.png) | [설명](40-146e6d4/README.md) |
| fe41821 | 2026-11-23T20:54:15+09:00 | Keep connected key check icon visible on mobile | 해당 커밋 실행·캡처 | [PNG](41-fe41821/home-desktop.png) | [PNG](41-fe41821/home-mobile.png) | [설명](41-fe41821/README.md) |
| 8c031cd | 2026-11-23T21:59:14+09:00 | Record user-confirmed email login and remaining end-to-end checks | 동일 UI 캡처 재사용 | [PNG](42-8c031cd/home-desktop.png) | [PNG](42-8c031cd/home-mobile.png) | [설명](42-8c031cd/README.md) |
| c3222f9 | 2026-11-23T22:09:13+09:00 | Introduce worldwide travel photography and clarify sample guidebooks | 해당 커밋 실행·캡처 | [PNG](43-c3222f9/home-desktop.png) | [PNG](43-c3222f9/home-mobile.png) | [설명](43-c3222f9/README.md) |
| 8fe6fef | 2026-11-25T18:15:14+09:00 | Exclude ambiguous travel sources and clarify research failures | 동일 UI 캡처 재사용 | [PNG](44-8fe6fef/home-desktop.png) | [PNG](44-8fe6fef/home-mobile.png) | [설명](44-8fe6fef/README.md) |
| 496150f | 2026-11-25T18:15:45+09:00 | Record third actual development day | 동일 UI 캡처 재사용 | [PNG](45-496150f/home-desktop.png) | [PNG](45-496150f/home-mobile.png) | [설명](45-496150f/README.md) |
