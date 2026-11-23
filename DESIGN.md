---
name: 여행의 결
description: 흰 종이와 파란 표지로 읽는 여행 가이드북
colors:
  primary: "#0754f8"
  primary-hover: "#0642c6"
  lime: "#ceff64"
  focus: "#7036e8"
  revision: "#f4f1fc"
  paper: "#ffffff"
  ink: "#142139"
  cover-ink: "#172228"
  muted: "#526078"
  line: "#d9e0eb"
  surface: "#f3f5f9"
  inverse-muted: "#d3dde5"
typography:
  display:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 64px)"
    fontWeight: 800
    lineHeight: 1.17
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "30px"
    fontWeight: 750
    letterSpacing: "-0.04em"
  book-headline:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "27px"
    fontWeight: 750
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "18px"
    fontWeight: 700
  body:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "16px"
    lineHeight: 1.8
  book-body:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "14px"
    lineHeight: 1.85
  label:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "13px"
    fontWeight: 500
rounded:
  contents: "8px"
  field: "9px"
  secondary: "10px"
  primary: "12px"
  example: "14px"
  panel: "16px"
  chip: "25px"
spacing:
  control-gap: "8px"
  compact-gap: "12px"
  action-gap: "16px"
  grid-gap: "20px"
  navigation-gap: "25px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.primary}"
    padding: "14px 21px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.secondary}"
    padding: "10px 16px"
  button-text:
    textColor: "{colors.ink}"
    padding: "8px 0"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.chip}"
    padding: "8px 16px"
  contents-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    rounded: "{rounded.contents}"
    padding: "7px 12px"
  form-panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "35px 42px"
---

# Design System: 여행의 결

## Overview

**Creative North Star: "여행을 한 권으로"**

흰 종이에 파란 표지를 얹은 한국어 여행 가이드북이다. 굵고 선명한 Pretendard 제목과 넉넉한 본문 행간이 표지에서 실제 일정까지 이어진다. 사용자가 선택한 흰색·파랑이 기본이며, 다중 거점 표지와 안내 영역에는 잉크색·라임을 사용한다.

읽는 영역은 불투명한 종이처럼 유지하고, 화면 위에 머무는 탐색·진행 도구에는 반투명 유리를 쓴다. 입력 화면은 테두리와 정렬로 정보를 구분하고, 한국어 존댓말과 실제 여행 데이터를 중심에 둔다. 이 문서는 구현된 규칙의 기록이며 별도의 디자인 승인 선언이 아니다.

**Key Characteristics:**

- 흰 본문과 선명한 파란 행동·표지.
- Pretendard의 굵기 차이와 한국어 단어 단위 줄바꿈.
- 잉크색·라임의 다중 거점 표지와 안내 영역.
- 유리 탐색 도구와 불투명한 읽기 영역.

근거: [전역 스타일](src/app/globals.css), [가이드북 스타일](src/lib/guidebook-style.ts), [홈·작업 화면](src/app/page.tsx), [가이드북](src/components/Guidebook.tsx), [설치 안내](src/components/InstallApp.tsx). 브랜드 범위는 [PRODUCT.md](PRODUCT.md), 구현 방향은 [방향 기록](docs/design-direction.md)을 따른다. 수치는 소스의 최종 CSS 선언 기준이며 향후 변경 때 재검증한다.

## Colors

선명한 파랑과 흰색을 중심으로, 어두운 표지의 라임과 보조 작업의 연보라를 분리한다. 정확한 값은 위 토큰을 기준으로 한다.

### Primary

- **선명한 파랑 — primary:** 주요 행동, 선택한 테마, 활성 편집 항목, 시간·예산 강조, 단일 거점 표지.
- **깊은 파랑 — primary-hover:** 주요 버튼의 포인터 호버.

### Secondary

- **라임 — lime:** 잉크색 표지 제목·단계 번호·짧은 표지 구분선.

### Tertiary

- **보라 — focus:** 키보드 포커스 윤곽선.
- **연보라 — revision:** 수정 요청과 계정 안내의 보조 바탕.

### Neutral

- **흰 종이 — paper:** 전체 배경, 입력 필드, 본문과 패널.
- **본문 잉크 — ink:** 기본 글자.
- **표지 잉크 — cover-ink:** 다중 거점 표지, 안내 띠, 푸터와 토스트.
- **보조 잉크 — muted:** 설명, 근거, 메타데이터.
- **경계선 — line:** 필드·패널·표 행의 얇은 구획.
- **보조 종이 — surface:** 안내문과 대안 일정의 바탕.
- **밝은 보조 글자 — inverse-muted:** 어두운 안내·푸터의 설명.

**The Paper Reading Rule.** 긴 일정 본문은 흰 바탕에서 읽고, 파랑과 잉크색 면은 표지·행동·안내 역할에 사용한다.

## Typography

**Display Font:** Pretendard, sans-serif fallback.
**Body Font:** Pretendard, sans-serif fallback. 별도의 장식용·고정폭 글꼴은 없다.

로컬 가변 WOFF2를 사용한다. 제목의 굵기와 자간으로 표지의 힘을 만들고, 본문은 행간으로 밀도를 조절한다. 규칙적인 배율 하나로 만든 타입 스케일은 아니다.

### Hierarchy

- **Display:** 홈의 큰 제목은 display 토큰. 화면 폭 800px 이하에서 `clamp(40px, 9vw, 58px)`, 380px 이하에서 39px.
- **Headline:** 홈 섹션 제목은 headline 토큰, 800px 이하에서는 27px. 가이드북 섹션은 book-headline 토큰, 600px 이하에서는 25px.
- **Title:** 가이드북 활동 제목은 title 토큰. 날짜 행의 제목은 20px·650이며 600px 이하에서는 18px.
- **Body:** 앱은 body 토큰, 가이드북 활동 설명은 book-body 토큰. 전역 스타일의 행간 1.7은 페이지에 주입되는 가이드북 스타일의 body 선언으로 1.8이 된다. 가이드북 문단의 최대 폭은 75ch.
- **Label:** 필드 이름은 label 토큰. 근거·메타데이터·보조 버튼에는 12–14px를 사용한다. 입력한 값은 16px.
- **Book cover:** 제목은 `clamp(30px, 5vw, 58px)`·750·행간 1.18, 모바일에서는 37px. 날짜·시간·예산 숫자는 tabular-nums로 정렬한다.

**The Korean Word Rule.** 제목은 단어를 보존해 줄바꿈하고, 긴 문자열에만 overflow-wrap을 허용한다.

## Layout

홈은 최대 1320px의 두 열(1.15fr / 1fr)이며 좌우 여백은 6%, 열 간격은 60px다. 800px 이하에서는 한 열로 바뀌고 좌우 여백은 7%다. 넓은 화면의 여유와 좁은 화면의 세로 흐름을 같은 읽기 순서로 연결한다.

입력 필드는 두 열·20px 간격이며 500px 이하에서는 한 열이다. 입력 패널은 데스크톱 35px 42px, 800px 이하 25px, 500px 이하 23px 18px의 여백을 사용한다. 편집 사이드 탐색은 모바일에서 가로 스크롤로 전환한다.

가이드북은 최대 1000px. 섹션은 42px 7%, 모바일에서는 30px 6% 여백이다. 일정은 시간과 본문의 두 열(65px / 1fr), 모바일에서는 45px / minmax(0, 1fr)이다. 600px 이하에서는 예산·거점 목록이 한 열이 된다. 인쇄에서는 앱 도구와 목차를 숨기고 표지·활동의 페이지 분할을 억제한다.

## Elevation & Depth

본문과 입력 패널은 경계선으로 나뉜다. 책 모형과 화면 위 도구에는 부드러운 그림자가 있으며, 이는 실제 책과 겹쳐진 도구의 깊이를 표현한다. 헤더는 흰색 84%와 blur(22px) saturate(150%), 진행 패널은 흰색 90%와 blur(20px)를 사용한다.

### Shadow Vocabulary

- **책 모형:** `14px 25px 35px #10182824`.
- **부유 안내:** `0 12px 30px #10182818`.
- **진행 패널:** `0 14px 45px #10182826`.
- **주요 버튼 호버:** `0 10px 25px #10182824`.

**The Glass Tools Rule.** 유리 효과는 탐색·진행·부유 안내에 사용하며 가이드북 본문은 불투명하게 유지한다.

## Shapes

필드·목차·버튼은 작은 곡률, 패널·모달은 큰 곡률을 사용한다. 정확한 반경은 rounded 토큰에 있다. 테마 선택은 둥근 칩, 단계·거점 번호는 원형이다. 책 모형은 등 쪽의 작은 곡률과 바깥쪽의 큰 곡률(3px 15px 15px 3px)을 가진다. 가이드북 컨테이너는 데스크톱 16px, 모바일 12px이며 인쇄에서는 반경과 경계를 제거한다.

## Components

### Buttons

명확한 행동 중심의 버튼이다. 주요 버튼은 파랑·흰 글자, 최소 높이 46px이며 홈의 주요 행동만 16px 23px 여백이다. 보조 버튼은 흰색·경계선·최소 높이 44px, 텍스트 버튼은 작은 글자와 투명 바탕이다. 포인터 호버에서 주요 버튼은 2px 올라가고 보조 버튼은 보조 종이색으로 변한다. 비활성은 opacity 0.5와 not-allowed 커서다. 키보드 포커스는 보라색 3px 윤곽선과 5px 간격이다.

### Chips

테마 선택은 경계선이 있는 칩으로, 선택 시 파랑 바탕·흰 글자다. 가이드북 목차는 작은 사각 곡률의 링크이며 호버에서 같은 파랑·흰색 관계를 쓴다. 상태 설명은 실제 상태를 표시하는 테두리 배지다.

### Cards / Containers

폼 패널은 흰색·얇은 경계선이며 그림자 없이 내용을 정렬한다. 예시 카드는 파랑 또는 잉크색 표지와 그 아래 캡션으로 구성되며 포인터 호버에서 표지만 5px 올라간다. 안내문은 보조 종이색 면과 20px 여백이다.

### Inputs / Fields

흰색·경계선·본문 잉크를 사용한다. 폼 내부 필드는 field 반경, 다른 기본 필드는 5px 반경이다. 입력 포커스는 파란색 2px 윤곽선과 5px 간격이며 placeholder는 별도의 보조 회색을 사용한다. 텍스트 영역은 세로 크기 변경이 가능하다.

### Navigation

헤더는 상단 고정 유리 면(86px, 800px 이하 76px). 데스크톱 탐색은 13px, 모바일은 12px이며 작은 화면에서는 브랜드 보조 설명을 숨긴다. 가이드북 목차는 줄바꿈 가능한 링크 목록이다. 편집의 선택 항목은 파랑 바탕·흰 글자로 현재 위치를 알린다.

### Book and reading flow

표지 제목, 구분선, 실제 일정 메타데이터, 목차, 날짜별 펼침 영역을 따른다. 다중 거점 표지만 잉크색·라임으로 구별한다. 날짜 행은 펼쳐진 상태에서 표시 아이콘을 45도 회전한다. 설치 안내는 흰 바탕·상단 경계선과 보조 버튼을 사용하며 모바일에서 줄바꿈한다.

색·그림자 변화는 0.2s ease, 이동은 0.25s ease. prefers-reduced-motion에서는 애니메이션·전환·부드러운 스크롤을 제거한다.

## Do's and Don'ts

### Do:

- **Do** 흰 본문과 파란 행동·표지의 역할을 유지한다.
- **Do** 한국어 제목의 단어 단위 줄바꿈과 본문 가독성을 확인한다.
- **Do** 키보드 포커스, 선택 상태, 동작 감소 환경을 유지한다.
- **Do** 표지와 탐색 도구의 재료 차이를 유지한다.

### Don't:

- **Don't** 기본 시스템 글꼴을 의도된 디스플레이 서체로 교체한다.
- **Don't** 흰 기본 바탕을 누런 파스텔로 교체한다.
- **Don't** 보조 정보에 표지 제목과 같은 시각적 우선순위를 부여한다.

Not canonized: 소스에 남아 있는 section-kicker 명칭은 재사용할 장식 규칙으로 기록하지 않았다. 샘플링한 사용처는 숙소 분류와 예산 범위 등 실제 데이터이므로 새 눈썹 문구를 만드는 근거가 아니다. 이전 CSS 선언과 뒤쪽 재정의가 함께 남아 있는 구조는 문서 범위를 벗어나므로 수정하지 않았다.

사이드카의 tonalRamp는 패널 표시를 위해 합성한 색 단계이며 실제 구현 토큰이나 새 색상 사용 허가가 아니다.

### 세계 여행 첫 화면 (2026-11-23 후속 수정)

첫 화면은 세계 여행 메시지와 세 장의 실제 사진으로 서비스 범위를 전달한다. 데스크톱은 1 / 1.15 열 비율이며 오른쪽 사진은 세로 도시 사진과 산·해안 두 장의 비대칭 구성이다. 900px 이하에서 한 열, 480px 이하에서 사진 행 높이를 155px로 줄인다. 사진 설명은 어두운 하단 그라데이션 위 흰 글자, 가이드북 안내는 반투명 흰색 면이다. 특정 지역 표지는 하단 체험용 예시에서만 사용한다. 사진은 가이드북 조사 근거나 출력용 자산이 아니다.
