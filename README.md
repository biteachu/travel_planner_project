# 여행의 결

취향을 입력하면 여러 에이전트가 나만의 HTML 여행 가이드북을 만드는 웹앱입니다.

**공개 웹앱:** [여행의 결](https://travel-planner-project-eight.vercel.app)

2026-11-18 공개 주소에서 키 없는 예시 편집·보관·HTML 다운로드·오프라인 열람을 데스크톱과 모바일로 검증했습니다. 개인 Gemini 키로 생성하는 결과 품질과 이메일 로그인·계정 저장의 실제 사용자 흐름은 별도 검증 중입니다.

## 로컬 실행

```sh
npm ci
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 예시 여행은 키 없이 열람·수정·HTML 다운로드할 수 있습니다. 실제 생성에는 사용자가 설정 화면에서 자신의 Gemini API 키를 입력해야 합니다. 키는 새로고침하면 사라지며 서버 요청 외 저장하지 않습니다.

## 기능과 상태

- 구현: 여행 조건·취향 입력, 도시 골격 제안 UI, 역할별 Gemini 서버 호출, 가이드북 렌더링, 예시 2종, 수동 편집·고정·AI 수정안 비교, 브라우저 보관, JSON·HTML 다운로드.
- 구현/외부 검증 대기: 실제 Gemini 생성 품질, Supabase 로그인·DB 저장.
- 구현: 날짜별 요청 분할·중단 후 재개, 예산 항목별 합계·미확인 구분.
- 구현: 내보내기 전 포함 항목 선택·미리보기, 근거가 연결된 식당·숙박 후보 비교. 자유 서술 속 개인정보를 자동 탐지하는 기능은 아닙니다.
- 공개 배포 완료, 실제 AI·계정 흐름 검증과 제출 영상 완성 진행 중. Remotion 영상 코드와 45초 트레일러 초안은 `video/`에 있으며 과정 영상의 실제 수정 증거는 아직 등록 전입니다. 상세 미완료 항목은 [구현 현황](docs/implementation-status.md)을 참고하세요.
- 공개 자료 조사: Gemini가 여행지 문서명을 정하고 Wikivoyage API에서 실제 본문을 읽습니다. 자료가 없으면 미확인으로 남깁니다. 원문·문서 버전·기여자와 CC BY-SA 4.0 표시를 저장·HTML에 보존합니다. Maps/Search Grounding은 호출하지 않습니다. [자료 이용 검토](docs/source-policy.md)를 참고하세요.
- 예시 데이터는 기능 체험용입니다. 최신 관광·영업·교통·가격을 검증한 여행 일정이 아닙니다.

## 선택적 계정 저장

공개 서비스 연결과 배포 주소 검증 절차는 [배포 안내](docs/deployment.md)에 정리했습니다. 배포 주소와 Supabase 환경변수·스키마·로그인 복귀 주소는 설정했으며, 실제 메일 발송과 사용자별 계정 저장 검증은 남아 있습니다.

`.env.example`을 참고해 `.env.local`에 본인의 Supabase URL과 공개 anon 키를 설정합니다. Supabase SQL Editor에서 `supabase/schema.sql`을 적용하고 Auth의 사이트 URL·허용 리디렉션에 배포 주소와 로컬 주소를 등록합니다. 이메일 로그인을 활성화하고 실제 메일 발송 설정을 확인하세요. 서비스 역할 키는 브라우저 환경변수에 넣지 않습니다.

계정 저장 미설정 시에도 브라우저 보관과 가이드북 다운로드를 사용할 수 있습니다. AI 비용과 별도로 배포·DB 사용량 비용이 발생할 수 있습니다.

변경된 계정 저장본은 DB 트리거가 `trip_revisions`에 함께 기록합니다. 일반 사용자는 본인의 버전만 읽을 수 있으며 버전을 직접 수정할 수 없습니다. 과거 버전 복원 화면은 후속 기능입니다. `계정에서도 삭제`는 로그인한 계정의 여행·모든 버전과 현재 브라우저의 보관본을 제거합니다. 다른 기기의 로컬 사본이나 다운로드 파일은 별도로 남습니다. SQL은 재적용 가능하며, 기존 여행은 현재 저장본부터 기록합니다. 트리거 설계는 [PostgreSQL 공식 문서](https://www.postgresql.org/docs/current/plpgsql-trigger.html), 함수 권한 설정은 [Supabase 공식 문서](https://supabase.com/docs/guides/database/functions)를 참고했습니다.

로컬 PGlite 테스트는 같은 SQL로 사용자별 접근·버전 생성·삭제를 검증합니다. Supabase의 실제 인증·메일·네트워크 설정을 대체하는 검증은 아닙니다.

## 검증

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

E2E는 설치된 Google Chrome과 로컬 서버를 사용합니다. HTML은 본문·CSS를 한 파일에 포함하며 외부 지도·출처 링크에는 네트워크가 필요합니다. 상세 요구사항은 [계획서](docs/travel-planner-plan.md), 구현·검증 상태는 [구현 현황](docs/implementation-status.md)을 참고하세요.

## 보안·이력

키를 저장소·DB·로그·HTML에 넣지 않습니다. 사용자 입력과 AI 출력은 스키마로 검증하고, HTML은 고정 템플릿으로 출력합니다. API 오류 원문은 사용자에게 전달하지 않습니다. 이력 보존을 위해 amend·rebase·강제 푸시·squash를 사용하지 않습니다.

로컬 API 제한은 서버 프로세스 기준이며 Vercel 배포에서는 Supabase의 DB 기반 허가를 사용합니다. `supabase/rate-limit.sql`과 서버 전용 키 설정이 없으면 실제 AI 호출을 거절합니다. [배포 안내](docs/deployment.md)를 따라 연결한 뒤 실제 다중 서버·키·DB 권한 검증이 필요합니다.
