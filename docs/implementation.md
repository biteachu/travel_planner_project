# 구현 순서 및 검증

목표: docs/travel-planner-plan.md의 사용자 키 기반 여행 가이드북 웹앱을 구현한다.
구조: 검증된 Trip 데이터 → 웹 편집·가이드북 공통 뷰 → 단일 HTML. 서버의 단계별 AI 호출과 선택적 Supabase 저장을 분리한다.

## 작업
- [ ] 데이터: src/lib/trip.ts의 Zod 스키마·날짜·예산·고정 검사. tests/trip.test.ts에서 잘못된 날짜, 중복 날짜, 고정 변경, 미확인 비용 검증.
- [ ] 출력: src/components/Guidebook.tsx와 src/lib/export.ts. 오프라인 HTML, XSS·위험 링크 방어, 인쇄 확인.
- [ ] 웹: src/app/page.tsx의 취향 입력·골격 승인·편집·예시·키 설정. 모바일 및 키 없는 다운로드 E2E.
- [ ] AI: src/app/api/agent/route.ts, src/lib/agents.ts. 키 비저장, 단계별 호출·중단·오류 처리·근거 보존.
- [ ] 저장: Supabase SQL/RLS 및 선택적 이메일 인증. 미설정 상태에서 로컬 보관 유지.
- [ ] 제출: CHECKLIST와 과정 자료, video 코드, 배포·운영 안내. 실제 수정 증거 없이 전후 사례를 꾸미지 않는다.

## 검증 기준
키는 메모리와 요청에만 존재하며 export/localStorage/DB에 저장하지 않는다. 입력·응답·불러오기 모두 같은 스키마로 검증한다. 비용 null은 0원으로 표시하지 않는다. 확정 예약은 AI가 변경하지 않는다. 외부 서비스 미설정·실제 키 미검증은 완료로 보고하지 않는다.

## 화면 방향
밝은 종이색 #f6f4ed, 바다색 #174e49, 잉크 #233a36, 안개 #e8eeea, 노랑 #e6c771. 한국어 시스템 고딕 본문과 바탕체 제목. 가이드북 표지·목차가 주인공인 좌측 정렬 화면. 반복 카드 대신 책장과 일정표의 위계를 사용한다.
