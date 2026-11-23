# 홈 화면에서 여행의 결 열기

- 주소: https://travel-planner-project-eight.vercel.app/
- 화면 아래 ‘홈 화면에 추가’에서 설치 방법을 확인한다. 지원 브라우저가 설치 가능 상태를 알리면 버튼이 ‘앱 설치’로 바뀐다.
- iPhone/iPad: Safari의 공유 메뉴 → 홈 화면에 추가. ‘웹 앱으로 열기’가 표시되면 켠다.
- Android/컴퓨터: 지원되는 브라우저의 설치 메뉴나 주소창 설치 버튼을 이용한다. 설치 메뉴가 없다면 북마크로 사용한다.

앱스토어에 배포하는 네이티브 앱이 아니라 동일한 사이트를 독립 창과 아이콘으로 여는 설치형 웹앱이다. 실제 기기·브라우저별 메뉴와 지원 여부가 다르므로 최종 설치는 해당 기기에서 확인한다.

API 호출과 계정 저장은 인터넷이 필요하다. 오프라인 실행 시 연결 안내를 보여주며, 미리 받은 HTML 가이드북은 파일 앱에서 인터넷 없이 읽을 수 있다. 설치하더라도 다른 방문자의 키를 사용하지 않으며 각자의 Anthropic 키를 입력한다. 앱 재실행 후에는 키를 다시 입력해야 할 수 있다. 사이트 데이터 삭제·앱 제거 전에는 필요한 여행책을 HTML 또는 JSON으로 내려받는다.

구현: `src/app/manifest.ts`, `src/components/InstallApp.tsx`, `public/sw.js`, `public/icons/`. 서비스워커 캐시는 정적 `offline.html` 하나이며 API·인증·여행 데이터 응답을 캐시하지 않는다. 아이콘 원본은 직접 작성한 SVG이고 `node scripts/build-icons.mjs`로 PNG들을 다시 만든다. 글꼴은 기존 Pretendard 라이선스를 유지한다.

검증: 로컬 프로덕션에서 manifest·아이콘 응답, 모의 설치 취소, 오프라인 복귀와 캐시 내용 검사. 실제 iPhone 홈 화면 추가 및 OS 설치 창의 완료는 별도 확인이 필요하다.

공식 안내: [Apple](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios), [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
