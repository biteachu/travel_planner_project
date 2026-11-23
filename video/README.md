# 영상 제작 코드

Remotion으로 만드는 영상 두 편의 제작 소스입니다. 현재 모두 **검토본**이며 패들릿 제출 완료로 집계하지 않습니다.

- `TrailerDraft`: 45초, 1280×720, 30fps. 자유여행자의 취향 입력 → 에이전트 역할 → HTML 가이드북 → 직접 편집 → 제품 소개. 예시 화면과 프로토타입 상태를 표시합니다. 현재 버전에는 음성·배경음악이 없으며 자막으로 내용을 전달합니다.
- `ProcessDraft`: 2분 30초, 같은 해상도·프레임 속도. 도입 20초 + 수정 사례 3개 각 35초 + 검증 장면 25초. 실제 색상·글꼴·유리 질감 요청과 수정 전후 화면, 이유, 커밋 `879e294`를 연결합니다. 마지막 장면은 실제 키 생성·계정 저장 및 5일 작업 조건이 아직 남아 있음을 구분합니다.

## 실행

프로젝트 루트에서 `npm ci` 후:

```sh
npm run video:typecheck
npm run video:studio
npm run video:trailer
npm run video:process:preview
npm run video:check-evidence
```

Remotion은 기본적으로 렌더링용 브라우저를 준비합니다. 설치된 Chrome을 사용하려면 렌더 명령 뒤에 `-- --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"`를 추가합니다. Pretendard 가변 글꼴과 라이선스를 `public/fonts/`에 보관하며 로딩 후 프레임을 렌더링합니다. [렌더링 공식 문서](https://www.remotion.dev/docs/cli/render)

결과는 Git에서 제외한 `video/out/`에 저장합니다. 영상 파일은 최종 검증 후 제출 위치에 별도로 올립니다. 프로젝트 소스와 입력 이미지는 저장소에 보관합니다.

## 실제 화면 캡처

`npm run build`와 `npm run start`로 로컬 앱을 실행한 뒤 `node video/capture.mjs`를 실행합니다. 별도 브라우저의 비밀정보 없는 예시 입력·편집 화면만 캡처합니다. `public/`의 가이드북 화면은 프로젝트 E2E에서 생성한 체험용 예시 이미지입니다. 영상 촬영용 입력을 사용자 수정 지시나 과제 전후 증거로 집계하지 않습니다.

## 과정 영상 완성 조건

`evidence.json`의 각 사례에 실제 전후 이미지 경로(public 기준), 사용자 지시 원문, 변경 이유, 관련 커밋을 넣고 대조 후 `verified`를 설정합니다. `video:check-evidence`는 빈 필드와 파일 누락을 검사하며, 내용의 진실성을 자동으로 입증하지 않습니다.

현재 세 사례의 입력 자료를 등록하여 검사가 통과합니다. 사용자 지시는 `docs/process/prompts.md`, 비교 원본은 `docs/process/before/`와 `after/`에 있습니다. 영상에서는 원본의 일부를 잘라 확대하며 이미지 내용을 새로 만들어 넣지 않습니다. 세 번째 비교는 정지 화면에서 유리 질감을 보여주며, 호버 동작 자체를 촬영한 영상으로 오인하지 않도록 합니다. 실제 키 생성·계정 검증 및 작업일 조건이 충족되면 마지막 상태 장면을 갱신하고 최종 제출본을 렌더링합니다.

## 검토본 파일 검사 (2026-11-23)

- `out/process-draft.mp4`: FFprobe 측정 150초, H.264, 1280×720, 30fps.
- `out/trailer-draft.mp4`: FFprobe 측정 45초, H.264, 1280×720, 30fps.
- 두 파일 모두 FFmpeg 전체 프레임 디코딩·재인코딩 검사 통과. 비교 장면 3개와 마지막 상태 장면의 글자 배치를 확인했습니다.
- `video:typecheck`, `video:check-evidence` 통과. 영상은 무음 자막 검토본이며 최종 제출 완료를 뜻하지 않습니다.

## 소재

제품 화면은 이 저장소의 구현과 예시 데이터입니다. 책 표지와 도형은 JSX/CSS로 직접 그립니다. 외부 사진·음악·로고·API 키·개인 예약정보는 포함하지 않습니다.
