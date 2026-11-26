# Google Maps 한국어 내장 지도 설정

상태: 코드·모의 브라우저 검증 완료. Google Cloud에서 Maps Embed API 및 두 웹사이트 리퍼러로 키 제한을 저장하고 Vercel 운영 환경변수를 등록했습니다. 2026-11-26 로컬 Chrome과 운영 Edge의 저장된 간사이 여행책에서 실제 Google 지도 로딩과 후쿠시마·니시우메다 등의 한국어 지명 표시를 확인했습니다. 일부 일본어 병기는 남아 있습니다.

사용자 지시: 기존 OpenStreetMap에 일본어 지명만 보여 읽기 어렵다는 피드백. 새 Google Cloud 설정 진행 요청.

- 환경변수: `GOOGLE_MAPS_EMBED_KEY` (로컬 `.env.local`, Vercel 운영 환경).
- 이 키는 iframe 사용을 위해 브라우저에 전달됩니다. 비밀 서버 키가 아닙니다. Google Cloud에서 API 제한을 **Maps Embed API만**으로 지정하고 웹사이트 제한을 반드시 함께 적용합니다.
- 허용 리퍼러: `https://travel-planner-project-eight.vercel.app/*`, `http://127.0.0.1:3417/*`. 다른 API·다른 사이트를 추가하지 않습니다.
- Maps Embed API 활성화 및 결제 계정 연결 필요. 결제정보와 약관은 사용자가 직접 확인합니다. 유료 월 구독은 필요하지 않습니다.
- 키가 없으면 일본어 OSM을 대신 표시하지 않고 Google Maps 외부 링크를 제공합니다.
- 임베드는 `language=ko`; 같은 위치가 연속되는 일정은 하나의 주변 지도로 표시합니다. 서로 다른 위치는 구간별 directions로 보여 주고 이동 수단을 선택할 수 있습니다.
- 한국어가 제공되지 않는 일부 지도 타일·지명은 현지 언어가 남을 수 있습니다.
- HTML 내보내기는 Google 지도 이미지·타일·키를 포함하지 않습니다. 기존 방문 순서 그림과 온라인 링크를 유지합니다.

검증: 타입 검사, 단위 테스트 101건 통과(1건 기존 보류), PC·모바일 브라우저 4건 통과, 운영 빌드 성공. 자동 브라우저 테스트의 Google 응답은 모의 응답입니다. 별도로 실제 키를 연결한 로컬·운영 화면에서 단일 위치 주변 지도 렌더링을 확인했습니다. 실제 다중 구간 경로 및 이동 수단 변경은 별도 실사용 확인이 필요합니다.

공식 자료:
- https://developers.google.com/maps/documentation/embed/quickstart
- https://developers.google.com/maps/documentation/embed/embedding-map
- https://developers.google.com/maps/documentation/embed/usage-and-billing
- https://developers.google.com/maps/documentation/embed/get-api-key
