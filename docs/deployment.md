# 공개 배포와 실제 연결 검증

상태: 배포 설정 코드 준비. 공개 URL·실제 계정 연결 검증은 아직 완료하지 않았다.

## Vercel 연결

본인 Vercel 계정에서 GitHub 저장소 `biteachu/travel_planner_project`를 Import하고 루트 디렉터리를 저장소 루트로 둔다. 프로젝트의 `vercel.json`은 Next.js, `npm ci`, `npm run build`를 지정한다. 빌드 스크립트는 이 프로젝트에서 검증한 Webpack 방식을 사용한다. [Vercel GitHub 연결](https://vercel.com/docs/git/vercel-for-github), [프로젝트 설정](https://vercel.com/docs/project-configuration/vercel-json)

| 환경변수 | 설정 방식 |
|---|---|
| `GEMINI_MODEL` | 본인 키로 사용 가능함을 실제 확인한 모델 식별자. 미설정 시 코드 기본값 사용. 기본값을 검증된 모델이라고 간주하지 않는다. |
| `NEXT_PUBLIC_SUPABASE_URL` | 본인 Supabase 프로젝트 URL. 계정 저장을 연결할 때 설정. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS를 사용하는 공개 anon 키. 서비스 역할 키를 넣지 않는다. |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 service_role JWT. DB 기반 요청 제한 함수 호출에만 사용하며 브라우저로 전달하지 않는다. 실제 값은 호스팅 환경변수에 직접 입력한다. |
| `AGENT_LIMITER_MODE` | Vercel에서는 미설정이어도 `database`. 로컬 기본값은 `process`이며 실제 DB 검증 시 `database`로 설정한다. |

개인 Gemini 키는 배포 환경변수에 넣지 않는다. 각 사용자가 웹앱의 API 키 설정에서 입력한다. 계정 저장을 설정하기 전에도 예시 열람·수동 편집·HTML 출력은 동작해야 한다. Supabase 공개 환경변수를 바꾸면 다시 배포하고 새 빌드를 확인한다.

배포 후 로그인하지 않은 별도 브라우저에서 공개 URL을 열어 접근 제한 화면이 없는지 확인한다. 프로젝트의 인증 보호·환경 설정은 실제 계정에서 확인할 사항이며 로컬 설정 파일만으로 공개 접근이 검증되지는 않는다. 배포 URL은 확인한 후 README와 CHECKLIST에 기록한다.

## Supabase 연결

1. 본인 프로젝트에 `supabase/schema.sql`을 적용한다.
   공개 AI 실행에는 `supabase/rate-limit.sql`도 적용한다. 계정 저장 UI를 사용하지 않더라도 배포 서버의 요청 제한을 위해 프로젝트 URL과 서버 키가 필요하다.
2. Auth의 사이트 URL과 허용 리디렉션 URL을 실제 배포 주소에 맞춘다.
3. 이메일 발송과 링크 복귀를 실제 계정으로 확인한다. 일반 사용자 대상 이메일 인증은 별도 SMTP 설정·발송 제한을 확인한다. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
4. 서로 다른 두 계정으로 저장·불러오기·수정·삭제를 검사하고, 상대방의 여행과 버전 기록에 접근할 수 없는지 확인한다.
5. 로그아웃 후 다른 계정으로 로그인하는 흐름도 검사한다. 브라우저에 따로 보관한 여행 파일은 계정 데이터와 구분한다.

## 배포 주소에서 키 없는 흐름 검사

아래 `실제배포주소`를 확인한 HTTPS 주소로 바꾼다. 설정하면 Playwright가 로컬 서버를 띄우지 않고 지정된 주소를 검사한다. 이 명령은 예시 열람·편집·HTML 다운로드·오프라인 표시를 데스크톱과 모바일 크기에서 검사하며 실제 Gemini 호출·계정 저장 성공을 증명하지 않는다.

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://실제배포주소'
npm run test:e2e -- --grep '키 없이 예시'
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

## 계정 응답 지연의 로컬 회귀 검사

실제 계정 없이 저장·불러오기·삭제 중 사용자의 편집을 검사하려면 별도 PowerShell에서 아래 개발 서버를 시작한다. 아래 값은 테스트용 가짜 설정이며 배포 환경에는 사용하지 않는다.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://account-test.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-public-key'
npm run dev -- --hostname 127.0.0.1 --port 3102
```

다른 PowerShell에서 실행한다. 테스트는 이 호스트의 인증·DB 요청을 가로채 모의 응답을 반환한다. 실행 후 개발 서버를 종료한다. 실제 Supabase 인증·권한 검증과는 별개의 검사다.

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3102'
$env:RUN_ACCOUNT_MOCK = '1'
npx playwright test e2e/account.spec.ts --workers=1
Remove-Item Env:PLAYWRIGHT_BASE_URL, Env:RUN_ACCOUNT_MOCK
```

## 실제 생성 검증

본인 키를 웹앱에서 직접 입력해 단일 거점과 여러 거점 여행을 각각 생성한다. 문서 선택의 국가·도시 일치, 취향 반영, 확정 일정 보존, 자료 부족 표시, 식당·숙박 근거와 HTML 출처·라이선스를 확인한다. 중단 후 재개와 잘못된 키·할당량 오류도 확인한다. 키·개인 예약정보를 녹화나 화면 캡처에 포함하지 않는다.

Vercel에서는 DB 기반 실행 허가가 설정되지 않거나 연결에 실패하면 실제 AI 호출을 503으로 거절한다. 예시 열람은 사용할 수 있다. 같은 키의 동시 실행은 1개, 60초 동안 허가는 최대 15개이며 실행 허가는 300초 후 만료된다. 이 값은 앱 운영 한도로 제공사의 요금·할당량과 다르다. 성공·실패 후 허가를 해제하며, 해제 통신이 실패해도 완료 결과는 유지하고 만료를 기다린다.

DB에는 API 키의 SHA-256 지문·횟수·실행 토큰만 저장한다. 하루 이상 오래되고 실행 중이 아닌 기록은 새 허가 요청 때 정리한다. 일반 사용자·anon은 테이블 및 허가 함수에 접근할 수 없다. 실제 Supabase에서 별도 서버 두 개의 동시 요청, 429 거절, 장애 시 503, 허가 만료·정리를 검증해야 한다. 키를 바꿔 보내는 공격까지 막는 사이트 전체 방화벽은 이 제한의 범위가 아니다. [PostgreSQL 행 잠금](https://www.postgresql.org/docs/current/explicit-locking.html), [Supabase 함수 권한](https://supabase.com/docs/guides/database/functions)
