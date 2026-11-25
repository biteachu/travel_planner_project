# 디자인 변화 기록

[대표 디자인 3단계 비교 열기](index.html)

## 과정 영상에 사용할 대표 화면

큰 디자인 변화는 두 번이며, 초기 상태까지 세 단계입니다. **아래 PC 3장 또는 PC·모바일 총 6장만 먼저 보시면 됩니다.** 영상은 아직 제작하지 않습니다.

| 단계 | 바뀐 내용과 이유 | PC | 모바일 |
|---|---|---|---|
| 1. 초기 디자인 | 크림색 배경·청록색 표지·기본 글꼴로 구성한 첫 화면. | [PC](02-fa4b5fc/home-desktop.png) | [모바일](02-fa4b5fc/home-mobile.png) |
| 2. 흰색·파랑 디자인 | 기본 글꼴과 누런 파스텔 톤을 바꿔 달라는 요청 → Pretendard·선명한 파랑·유리 질감 적용. | [PC](35-879e294/home-desktop.png) | [모바일](35-879e294/home-mobile.png) |
| 3. 세계 여행 사진 디자인 | 두 지역만 지원하는 서비스처럼 보인다는 지적 → 세계 여행 문구와 다양한 여행지 사진 적용. | [PC](43-c3222f9/home-desktop.png) | [모바일](43-c3222f9/home-mobile.png) |

## 후속 동작 개선 · 2026-11-25

기존 세계 여행 화면에 등장 효과를 추가했습니다. 전체 디자인을 다시 바꾼 단계는 아닙니다. [PC](2026-11-25-motion/home-desktop.png) · [모바일](2026-11-25-motion/home-mobile.png) · [기록](2026-11-25-motion/README.md). 아래 역사 캡처 90장 외에 이번 작업 2장이 추가되어 전체 92장입니다.

## 커밋별 보관 규칙

- 각 커밋에는 전체 첫 화면 PC·모바일 2장만 보관합니다. 세부 입력·편집·설정·가이드북 화면과 추가 시안 캡처는 현재 폴더에서 제외했습니다. 삭제 전 자료는 Git 커밋 6e7c50d에 남아 있습니다.
- 대상은 496150f까지 45개 커밋입니다. 화면이 없는 첫 커밋은 설명만 있습니다. 커밋별 88장 + 최초 보존 원본 2장 = 90장입니다.
- 모든 커밋의 사진을 영상에 넣을 필요는 없습니다. 커밋별 폴더는 이력 확인용이고, 대표 화면은 위 세 단계입니다.
- 커밋별 PNG는 과거 코드를 현재 환경에서 실행한 사후 재현본입니다. 동일 UI의 캡처 재사용은 manifest.json의 capturedFrom에 표시합니다.
- PC 1440×1000 / 모바일 390×844 뷰포트의 전체 페이지이며 높이는 스크롤 길이에 따라 다릅니다. 현재 Node v24.13.1, Next 16.4.6, 설치된 Chrome을 사용했습니다. 개발 서버 표시가 포함될 수 있습니다.
- 최초 구현 당시 보존 파일은 [original-initial](original-initial/README.md)에 별도 보관합니다.
- 촬영 실행 시작(UTC): 2026-11-25T09:20:21.974Z. 실제 사용자 키·로그인 없이 공개 예시를 사용했습니다.
- 최신 화면의 사진 출처: [CREDITS](../public/travel-photos/CREDITS.md).

## 전체 커밋 목록

| 커밋 | 내용 | 상태 | 첫 화면 |
|---|---|---|---|
| 2462bfe | Initial commit | 화면 없음 | — |
| fa4b5fc | feat: implement travel guidebook web app and preserve initial screens | 해당 커밋 재현 | [PC](02-fa4b5fc/home-desktop.png) · [모바일](02-fa4b5fc/home-mobile.png) |
| 0c351bb | feat: resume daily planning and improve guidebook budget validation | 해당 커밋 재현 | [PC](03-0c351bb/home-desktop.png) · [모바일](03-0c351bb/home-mobile.png) |
| 75b8fb0 | feat: preserve unfinished travel preferences across reloads | 해당 커밋 재현 | [PC](04-75b8fb0/home-desktop.png) · [모바일](04-75b8fb0/home-mobile.png) |
| 557fb26 | feat: edit activity durations and reorder unlocked schedules | 해당 커밋 재현 | [PC](05-557fb26/home-desktop.png) · [모바일](05-557fb26/home-mobile.png) |
| c370b7f | feat: preview and select guidebook export contents | 해당 커밋 재현 | [PC](06-c370b7f/home-desktop.png) · [모바일](06-c370b7f/home-mobile.png) |
| 4cced52 | feat: enforce confirmed reservation constraints during planning | 해당 커밋 재현 | [PC](07-4cced52/home-desktop.png) · [모바일](07-4cced52/home-mobile.png) |
| fc6bd8c | feat: constrain first and last day activity windows | 해당 커밋 재현 | [PC](08-fc6bd8c/home-desktop.png) · [모바일](08-fc6bd8c/home-mobile.png) |
| 22a8b68 | fix: preserve traveler preferences and research evidence across agents | 해당 커밋 재현 | [PC](09-22a8b68/home-desktop.png) · [모바일](09-22a8b68/home-mobile.png) |
| 87bc94b | feat: track manual currency conversions and provisional budget balance | 해당 커밋 재현 | [PC](10-87bc94b/home-desktop.png) · [모바일](10-87bc94b/home-mobile.png) |
| 0fe9412 | feat: research travel bases in resumable stages | 해당 커밋 재현 | [PC](11-0fe9412/home-desktop.png) · [모바일](11-0fe9412/home-mobile.png) |
| 6b6ee2f | feat: preserve account trip revisions and support cloud deletion | 해당 커밋 재현 | [PC](12-6b6ee2f/home-desktop.png) · [모바일](12-6b6ee2f/home-mobile.png) |
| 049dd19 | feat: run bounded itinerary repair after agent review | 해당 커밋 재현 | [PC](13-049dd19/home-desktop.png) · [모바일](13-049dd19/home-mobile.png) |
| a1a9ffc | feat: add clearly labeled key-free planning walkthrough | 해당 커밋 재현 | [PC](14-a1a9ffc/home-desktop.png) · [모바일](14-a1a9ffc/home-mobile.png) |
| 22c09f6 | feat: add reproducible trailer and process video drafts | 해당 커밋 재현 | [PC](15-22c09f6/home-desktop.png) · [모바일](15-22c09f6/home-mobile.png) |
| 6df98ff | fix: preserve generation state when cancelling requests | 해당 커밋 재현 | [PC](16-6df98ff/home-desktop.png) · [모바일](16-6df98ff/home-mobile.png) |
| 167483a | feat: compare sourced dining and lodging candidates in guidebooks | 해당 커밋 재현 | [PC](17-167483a/home-desktop.png) · [모바일](17-167483a/home-mobile.png) |
| 6242e78 | docs: record grounding restrictions affecting guidebook exports | 해당 커밋 재현 | [PC](18-6242e78/home-desktop.png) · [모바일](18-6242e78/home-mobile.png) |
| 7ff92e1 | fix: bound incoming agent request bodies while streaming | 동일 UI 재사용 | [PC](19-7ff92e1/home-desktop.png) · [모바일](19-7ff92e1/home-mobile.png) |
| 0d9a594 | fix: protect saved trips and reject stale revision proposals | 해당 커밋 재현 | [PC](20-0d9a594/home-desktop.png) · [모바일](20-0d9a594/home-mobile.png) |
| 7130a82 | fix: recover completed guidebooks when final storage fails | 해당 커밋 재현 | [PC](21-7130a82/home-desktop.png) · [모바일](21-7130a82/home-mobile.png) |
| 4fd70f2 | feat: research guidebooks using attributed open travel sources | 해당 커밋 재현 | [PC](22-4fd70f2/home-desktop.png) · [모바일](22-4fd70f2/home-mobile.png) |
| 303bb50 | chore: prepare Vercel deployment and remote smoke checks | 동일 UI 재사용 | [PC](23-303bb50/home-desktop.png) · [모바일](23-303bb50/home-mobile.png) |
| f5855a7 | docs: audit remaining implementation and submission requirements | 해당 커밋 재현 | [PC](24-f5855a7/home-desktop.png) · [모바일](24-f5855a7/home-mobile.png) |
| 05fc1f9 | Add database-backed agent request limits | 동일 UI 재사용 | [PC](25-05fc1f9/home-desktop.png) · [모바일](25-05fc1f9/home-mobile.png) |
| f14cda1 | Preserve local edits during account requests | 해당 커밋 재현 | [PC](26-f14cda1/home-desktop.png) · [모바일](26-f14cda1/home-mobile.png) |
| 8940344 | Preserve malformed library data for recovery | 해당 커밋 재현 | [PC](27-8940344/home-desktop.png) · [모바일](27-8940344/home-mobile.png) |
| d5516c6 | Attach provenance metadata to guidebook exports | 해당 커밋 재현 | [PC](28-d5516c6/home-desktop.png) · [모바일](28-d5516c6/home-mobile.png) |
| 458258e | Record hosted database verification results | 동일 UI 재사용 | [PC](29-458258e/home-desktop.png) · [모바일](29-458258e/home-mobile.png) |
| 9596dad | Document verified public deployment | 동일 UI 재사용 | [PC](30-9596dad/home-desktop.png) · [모바일](30-9596dad/home-mobile.png) |
| 1e753b7 | Switch travel agents to Claude and bound day revisions | 해당 커밋 재현 | [PC](31-1e753b7/home-desktop.png) · [모바일](31-1e753b7/home-mobile.png) |
| 8bbe402 | Verify month-long offline guidebooks in Chrome and Edge | 동일 UI 재사용 | [PC](32-8bbe402/home-desktop.png) · [모바일](32-8bbe402/home-mobile.png) |
| 1b6e8a3 | Correct Claude authentication documentation source | 동일 UI 재사용 | [PC](33-1b6e8a3/home-desktop.png) · [모바일](33-1b6e8a3/home-mobile.png) |
| abf20ad | Add three interactive redesign options and clarify personal API keys | 해당 커밋 재현 | [PC](34-abf20ad/home-desktop.png) · [모바일](34-abf20ad/home-mobile.png) |
| 879e294 | Apply selected blue design and add home-screen web app installation | 해당 커밋 재현 | [PC](35-879e294/home-desktop.png) · [모바일](35-879e294/home-mobile.png) |
| 53b4cd4 | Document selected design system and offline font regression coverage | 동일 UI 재사용 | [PC](36-53b4cd4/home-desktop.png) · [모바일](36-53b4cd4/home-mobile.png) |
| 2d4e4f1 | Connect actual design evidence and render video review drafts | 동일 UI 재사용 | [PC](37-2d4e4f1/home-desktop.png) · [모바일](37-2d4e4f1/home-mobile.png) |
| 22ffcab | Record current dependency audit and remaining privacy verification | 동일 UI 재사용 | [PC](38-22ffcab/home-desktop.png) · [모바일](38-22ffcab/home-mobile.png) |
| 490c9d7 | Block explicitly labelled booking references before AI requests and HTML export | 해당 커밋 재현 | [PC](39-490c9d7/home-desktop.png) · [모바일](39-490c9d7/home-mobile.png) |
| 146e6d4 | Show verified API key status and connection management | 해당 커밋 재현 | [PC](40-146e6d4/home-desktop.png) · [모바일](40-146e6d4/home-mobile.png) |
| fe41821 | Keep connected key check icon visible on mobile | 해당 커밋 재현 | [PC](41-fe41821/home-desktop.png) · [모바일](41-fe41821/home-mobile.png) |
| 8c031cd | Record user-confirmed email login and remaining end-to-end checks | 동일 UI 재사용 | [PC](42-8c031cd/home-desktop.png) · [모바일](42-8c031cd/home-mobile.png) |
| c3222f9 | Introduce worldwide travel photography and clarify sample guidebooks | 해당 커밋 재현 | [PC](43-c3222f9/home-desktop.png) · [모바일](43-c3222f9/home-mobile.png) |
| 8fe6fef | Exclude ambiguous travel sources and clarify research failures | 동일 UI 재사용 | [PC](44-8fe6fef/home-desktop.png) · [모바일](44-8fe6fef/home-mobile.png) |
| 496150f | Record third actual development day | 동일 UI 재사용 | [PC](45-496150f/home-desktop.png) · [모바일](45-496150f/home-mobile.png) |
