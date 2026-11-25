# PC에서 ChatGPT 구독으로 여행 만들기

## 실행

이 PC에서는 프로젝트 폴더의 **여행 플래너 PC 실행.cmd**를 더블클릭하면 실행과 브라우저 열기를 함께 처리합니다. 이미 실행 중이면 해당 앱을 엽니다.

1. 프로젝트 폴더에서 `npm install`을 한 번 실행합니다.
2. `npm run dev:local`로 Windows용 로컬 앱을 실행합니다.
3. `http://127.0.0.1:3417/`을 엽니다. 실행 창은 여행을 만드는 동안 유지합니다.
4. 상단 연결 설정 → **Continue with ChatGPT** → 본인 계정 선택 → 구독 사용에 동의합니다.
5. 계정에서 제공되는 모델을 선택하고 여행 조건을 입력합니다.

연결 후 상단에는 **ChatGPT 구독 연결됨**이 표시됩니다. 역할별 계획·조사·일정·검토는 기존 파이프라인을 사용하고 모델 호출만 공식 Responses 경로로 전환됩니다. Claude API로 바꾸려면 ChatGPT 연결을 먼저 해제합니다.

구독 사용량은 무제한이 아닙니다. 추가 지출 없이 시험하려면 [ChatGPT 사용량 설정](https://chatgpt.com/settings/usage)에서 크레딧 사용 및 자동 구매를 허용하지 마세요. 이 앱은 한도·권한·응답 오류 시 별도 API 결제로 자동 전환하지 않습니다. 한도에 도달하면 완료한 단계를 유지하고 중단합니다.

## 공개 사이트와 PC 실행의 차이

현재 구현은 공식 오픈소스·로컬 앱용 동적 등록 방식입니다. 공개 Vercel 서버에서 이 경로로 구독 토큰을 사용하지 않습니다. 공개 사이트는 개인 Claude API 키를 사용합니다. 공개 사이트에도 ChatGPT 구독 연결을 제공하려면 OpenAI의 원격 호스팅/파트너 등록 조건을 충족해야 합니다.

## 연결 정보와 해제

- Windows 사용자에 묶인 DPAPI로 `.local-chatgpt/accounts.dpapi`를 암호화합니다. 해당 폴더는 Git 제외 대상입니다.
- 토큰은 브라우저 저장소·응답·서버 로그에 넣지 않습니다. 브라우저에는 HttpOnly 세션 식별자만 둡니다.
- 호스트 ID와 계정별 발급 client ID를 유지하며 다시 로그인할 때 재사용합니다. 실행 프로세스를 다시 시작하면 저장된 계정으로 로그인합니다.
- PKCE·state·nonce와 서명·issuer·audience·만료를 검증합니다. 계정이 바뀌면 모델을 다시 선택합니다.
- 연결 해제 시 원격 갱신 세션 해제를 시도하고 로컬 토큰을 지웁니다. 원격 해제 확인에 실패하면 화면에서 안내하며 ChatGPT 설정에서도 해제할 수 있습니다.
- 서버는 `127.0.0.1:3417`에만 바인딩합니다. 로컬 전용 플래그·Host·Origin·세션을 검사합니다. Vercel에서는 기능이 비활성입니다.

## 확인 근거

2026-11-25 공식 문서 확인. 제공사 조건은 바뀔 수 있으므로 배포 범위를 넓히기 전에 재확인합니다.

- [오픈소스·로컬 앱의 ChatGPT 구독 사용](https://developers.openai.com/siwc/token-sharing-open-source)
- [등록·로그인·검증](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [모델 목록과 Responses 호출](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [토큰 보관·갱신·연결 해제](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [지원 범위와 제한](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

검증 상태: 사용자 동의 후 공식 로그인 성공과 계정별 모델 목록·모델 선택을 실제 확인했습니다. 여행 전체 생성과 계정 저장은 별도 사용자 시험 결과를 기다립니다.
