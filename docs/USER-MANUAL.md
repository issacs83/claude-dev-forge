# claude-dev-forge v2.0 사용법 매뉴얼

## 목차
1. [설치](#1-설치)
2. [시작하기](#2-시작하기)
3. [자율 운영 모드](#3-자율-운영-모드)
4. [PDLC 파이프라인](#4-pdlc-파이프라인)
5. [커맨드 레퍼런스](#5-커맨드-레퍼런스)
6. [에이전트 카테고리별 사용법](#6-에이전트-카테고리별-사용법)
7. [문서 산출물](#7-문서-산출물)
8. [대시보드](#8-대시보드)
9. [리버스 엔지니어링](#9-리버스-엔지니어링)
10. [프로젝트 오버레이](#10-프로젝트-오버레이)
11. [환경 관리](#11-환경-관리)
12. [FAQ](#12-faq)

---

## 1. 설치

### 1.1 사전 요구사항
- Node.js v18+
- Python 3.8+
- git, jq

### 1.2 기본 설치
```bash
git clone https://github.com/issacs83/claude-dev-forge.git
cd claude-dev-forge
chmod +x install.sh
./install.sh
```

### 1.3 추가 패키지 설치 (문서 생산용)
```bash
pip3 install python-docx python-pptx pyhwpx openpyxl Pillow
```

### 1.4 E2E 테스트 환경
```bash
npm install -g playwright
npx playwright install chromium
```

### 1.5 대시보드 설치
```bash
cd dashboard
npm install
```

### 1.6 환경 자동 점검
Claude Code에서:
```
/health-check
```
→ 모든 에이전트 의존성을 자동 스캔하고 부족분을 알려줍니다.

---

## 2. 시작하기

### 2.1 Claude Code 실행
```bash
claude                    # 기본 실행
claude --resume           # 이전 세션 이어서
```

### 2.2 현재 설정 확인
```
/show-setup
```

### 2.3 첫 번째 프로젝트 시작
```
/init-project
```
→ 도메인 선택 (yocto-bsp / web-fullstack / firmware) → 프로젝트 오버레이 생성

---

## 3. 자율 운영 모드

**v2.0의 핵심 기능**: 슬래시 커맨드를 몰라도, **자연어로 말하면** project-director가 알아서 실행합니다.

### 3.1 자연어 요청 예시

#### 제품 기획
```
"스마트 카메라 제품을 만들건데, 시장 상황 좀 파악해줘"
→ project-director → product-strategist 자동 배정
→ 시장분석 보고서 자동 생성
```

#### 기술 연구
```
"객체 탐지 관련 최신 논문 조사해줘"
→ paper-patent-researcher 자동 배정
→ 선행기술 조사서 생성
```

#### 개발
```
"로그인 기능 구현해줘"
→ web-developer + tdd-guide 자동 배정
→ 코드 구현 + 테스트 자동 실행
```

#### 테스트
```
"이 웹앱 전체 기능 테스트해줘"
→ e2e-tester 배정
→ 실제 브라우저에서 클릭/입력/검증
→ 스크린샷 + 결과 보고서 생성
```

#### 문서
```
"테스트 결과 보고서 워드로 만들어줘"
→ report-writer 배정
→ 전문 서식의 .docx 파일 생성
```

#### 인증
```
"이 제품 FDA 인증 준비해야 해"
→ regulatory-specialist + report-writer 자동 배정
→ DHF, V&V 문서 자동 생성
```

### 3.2 자동 체이닝

에이전트 실행 완료 후 다음 작업이 자동으로 이어집니다:

| 트리거 | 자동 다음 액션 |
|--------|--------------|
| 분석/설계 완료 | → 문서 자동 생성 (doc-manager → writer) |
| 테스트 실패 | → 개발 에이전트 수정 → 재테스트 |
| 규제 검토 완료 | → 규제 문서 자동 생성 |
| 코드 구현 완료 | → 코드 리뷰 → 검증 |
| 전체 완료 | → 평가 → 디버그 루프 판단 |

---

## 4. PDLC 파이프라인

### 4.1 전체 파이프라인 실행
```
/lifecycle "스마트 카메라 제품 개발"
```

### 4.2 12단계 상세

| Phase | 이름 | 주요 에이전트 | 산출물 |
|-------|------|-------------|--------|
| 0 | 선행연구 | paper-patent-researcher | 선행기술 조사서, 특허맵 (.docx) |
| 1 | VOC | voc-researcher | VOC 보고서, 페르소나 (.docx) |
| 2 | 시장조사 | product-strategist | 시장분석서, 경쟁비교표 (.docx/.xlsx/.pptx) |
| 3 | 기획/디자인 | ux-designer, marketing-strategist | PRD, UX 사양서, GTM 전략 (.docx) |
| 4 | 세부기획 | planner + 도메인 에이전트 | SRS, HRS, ICD (.docx) |
| 5 | 아키텍처 | architect + planner | 아키텍처 문서, WBS (.docx/.pptx) |
| 6 | 파트별설계 | 도메인 에이전트 (병렬) | 설계 문서, API 스펙, BOM (.docx/.xlsx) |
| 7 | 세부설계 | 도메인 + security-reviewer | 상세 설계서, DB 스키마 (.docx) |
| 8 | 구현 | 도메인 + tdd-guide + verify | 소스 코드, 단위 테스트 |
| 9 | 테스트 | qa-engineer + e2e-tester | 테스트 보고서, 스크린샷 (.docx/.xlsx) |
| 10 | 검증 | regulatory + qa | DHF, V&V 보고서, 매뉴얼 (.docx/.xlsx) |
| 11 | 평가 | evaluator | 평가 보고서, 회고록 (.docx/.pptx) |

### 4.3 디버그 루프
Phase 11 평가 결과:
- **Grade A/B** → 릴리즈 진행
- **Grade C** → Phase 9 (재테스트)로 루프
- **Grade D/F** → Phase 8 (재구현)로 루프
- 사용자 만족까지 반복

### 4.4 개별 단계 실행
전체가 아닌 특정 단계만 실행할 수도 있습니다:
```
/voc                              # Phase 1만
/market-analysis "스마트 카메라"    # Phase 2만
/research "object detection"       # Phase 0만
/e2e-test http://localhost:3000   # Phase 9만
/evaluate                          # Phase 11만
```

---

## 5. 커맨드 레퍼런스

### PDLC 커맨드
| 커맨드 | 설명 |
|--------|------|
| `/lifecycle [description]` | 전체 PDLC 12단계 실행 |
| `/voc [data source]` | VOC 분석 |
| `/market-analysis [market/product]` | 시장조사 + 경쟁사 분석 |
| `/research [keywords]` | 논문/특허 선행연구 |
| `/design-spec [feature]` | UX/UI 사양서 생성 |
| `/e2e-test [URL]` | Playwright E2E 브라우저 테스트 |
| `/evaluate [scope]` | 프로젝트 평가/회고 |
| `/dashboard [port]` | 대시보드 시작 (기본 7700) |
| `/health-check` | 전체 에이전트 환경 점검 |

### 개발 커맨드
| 커맨드 | 설명 |
|--------|------|
| `/plan [description]` | 구현 계획 수립 (3+ 파일 시 필수) |
| `/auto [mode] [description]` | 원버튼 파이프라인 (feature/bugfix/refactor) |
| `/build` | 범용 빌드 (bitbake/cmake/npm 자동감지) |
| `/tdd [module]` | TDD 워크플로우 |
| `/code-review` | 2단계 코드 리뷰 |
| `/security-review` | 보안 감사 |
| `/verify-loop` | 빌드→테스트 자동 재시도 (3회) |
| `/test-coverage` | 테스트 커버리지 분석 |

### Git 워크플로우
| 커맨드 | 설명 |
|--------|------|
| `/quick-commit` | 빠른 커밋+푸시 |
| `/commit-push-pr` | 커밋→푸시→PR 자동화 |
| `/release` | 릴리즈 준비 (버전, 체인지로그, 태그) |
| `/checkpoint` | 작업 상태 스냅샷 |
| `/worktree-start` | 격리된 git worktree 생성 |

### 문서/유틸
| 커맨드 | 설명 |
|--------|------|
| `/sync-docs` | 문서-코드 동기화 |
| `/update-docs` | 문서 업데이트 |
| `/explore [topic]` | 코드베이스 탐색 |
| `/learn [topic]` | 패턴/교훈 기록 |
| `/handoff` | 세션 핸드오프 문서 생성 |
| `/show-setup` | 현재 설정 표시 |
| `/init-project` | 프로젝트 오버레이 초기화 |
| `/orchestrate [task]` | 멀티 에이전트 오케스트레이션 |

### 임베디드
| 커맨드 | 설명 |
|--------|------|
| `/flash` | 디바이스 플래싱 (UUU/dd/fastboot) |
| `/dts-check` | 디바이스 트리 검증 |

---

## 6. 에이전트 카테고리별 사용법

### 6.1 AI/ML 파이프라인

```
1. "최신 object detection 논문 조사해줘"
   → paper-patent-researcher

2. "YOLOv8 기반 커스텀 모델 학습 전략 수립해줘"
   → ai-trainer

3. "학습 데이터 파이프라인 구축해줘"
   → data-engineer

4. "객체 탐지 라벨링 가이드라인 만들어줘"
   → labeling-manager

5. "라벨링 품질 검수해줘"
   → labeling-reviewer

6. "모델 학습 시작해줘"
   → ai-trainer

7. "학습된 모델 RKNN으로 양자화해줘"
   → npu-engineer

8. "TensorRT 엔진 빌드해줘"
   → inference-optimizer

9. "모델 배포 파이프라인 만들어줘"
   → mlops-engineer
```

### 6.2 GPU/NPU 최적화

```
# CUDA 최적화
"이 연산 CUDA 커널로 최적화해줘"        → cuda-engineer
"멀티 GPU 학습 설정해줘"                → cuda-engineer

# NPU 양자화
"이 모델 INT8로 양자화해줘"             → npu-engineer
"Edge TPU용으로 변환해줘"               → npu-engineer

# 추론 최적화
"TensorRT 엔진 빌드해줘"               → inference-optimizer
"Triton 서버 설정해줘"                  → inference-optimizer
```

### 6.3 문서 생산

```
# 기술 보고서 (Word)
"V&V 보고서 작성해줘"                   → report-writer (.docx)

# 발표자료 (PowerPoint)
"경영진 보고 PPT 만들어줘"              → presentation-writer (.pptx)

# 한글 문서
"KC 인증 신청서 작성해줘"               → hwp-writer (.hwpx)

# 데이터 시트 (Excel)
"BOM 작성해줘"                         → spreadsheet-writer (.xlsx)
"FMEA 워크시트 만들어줘"                → spreadsheet-writer (.xlsx)
```

### 6.4 리버스 엔지니어링

```
# 제품 역분석
"이 경쟁사 제품 회로 분석해줘"            → reverse-engineer
"이 레거시 코드 구조 분석해줘"            → reverse-engineer

# 역방향 문서 생성
"이 코드베이스에서 SRS 문서 만들어줘"     → retroactive-documenter
"이 기존 제품 FDA 인증 문서 생성해줘"     → retroactive-documenter
```

---

## 7. 문서 산출물

### 7.1 자동 문서 생성
각 PDLC 단계 완료 시 적절한 포맷의 문서가 자동 생성됩니다.

### 7.2 출력 디렉토리
```
output/
├── phase-0-research/          # 선행기술 조사서
├── phase-1-voc/               # VOC 분석 보고서
├── phase-2-market/            # 시장분석, 경쟁비교
├── phase-3-planning/          # PRD, UX 사양서, GTM
├── phase-4-requirements/      # SRS, HRS, ICD
├── phase-5-architecture/      # 아키텍처, WBS
├── phase-6-design/            # 설계 문서, BOM
├── phase-7-detailed-design/   # 상세 설계서
├── phase-8-implementation/    # 코드 리뷰 기록
├── phase-9-testing/           # 테스트 보고서
├── phase-10-verification/     # DHF, V&V, 매뉴얼
├── phase-11-evaluation/       # 평가 보고서
├── screenshots/               # E2E 테스트 스크린샷
└── retroactive/               # 역방향 문서 패키지
```

### 7.3 포맷별 라이브러리

| 포맷 | 라이브러리 | 설치 |
|------|----------|------|
| .docx | python-docx | `pip3 install python-docx` |
| .pptx | python-pptx | `pip3 install python-pptx` |
| .hwpx | pyhwpx | `pip3 install pyhwpx` |
| .xlsx | openpyxl | `pip3 install openpyxl` |

---

## 8. 대시보드

### 8.1 시작
```
/dashboard
```
또는:
```bash
cd ~/.claude/dashboard
npm install && npm start
```
→ http://localhost:7700

### 8.2 기능
- **칸반 보드**: To Do → Claimed → In Progress → Review → Done (5컬럼)
- **PDLC 진행률**: 12단계 진행 막대
- **에이전트 모니터**: 현재 실행 중인 에이전트 실시간 상태
- **문서 추적**: 생성된 산출물 목록
- **필터링**: Role 기반 태스크 필터

### 8.3 API
```
GET  /api/status      — 전체 상태
GET  /api/agents      — 에이전트 상태
GET  /api/tasks       — 태스크 목록
POST /api/tasks       — 태스크 생성
PATCH /api/tasks/:id  — 태스크 업데이트
POST /api/events      — 이벤트 발행
WebSocket ws://        — 실시간 푸시
```

---

## 9. 리버스 엔지니어링

### 9.1 제품 역분석
```
"이 PCB 사진 보고 회로 분석해줘"
"이 펌웨어 바이너리 분석해줘"
"이 앱 네트워크 프로토콜 분석해줘"
```

### 9.2 역방향 문서 생성 (핵심 기능)
이미 만들어진 제품이나 코드에 대해 PDLC 문서를 **역으로** 생성합니다:

```
"이 코드베이스를 분석해서 전체 문서 패키지 만들어줘"

→ retroactive-documenter:
  1. 코드 분석 (구조, 모듈, API)
  2. 요구사항 역추출 (SRS)
  3. 설계 문서 역생성 (SDS)
  4. 테스트 케이스 도출
  5. 추적성 매트릭스 생성
  6. 규제 문서 생성 (필요 시)
  7. 갭 분석 보고서
```

---

## 10. 프로젝트 오버레이

### 10.1 초기화
```
/init-project
```
→ 도메인 선택 → `.claude/` 디렉토리에 프로젝트별 설정 생성

### 10.2 구조
```
.claude/
├── agents/     # 프로젝트 전용 에이전트
├── rules/      # 프로젝트 코딩 규칙
├── memory/     # 프로젝트 지식 베이스
└── prompts/    # 시스템 프롬프트
```

### 10.3 도메인 프리셋
- `yocto-bsp`: Yocto/커널/U-Boot 프로젝트
- `web-fullstack`: React/Node.js 풀스택
- `firmware`: MCU/FPGA/RTOS

---

## 11. 환경 관리

### 11.1 전체 헬스체크
```
/health-check
```
→ 모든 에이전트의 의존성을 스캔하고 상태 테이블을 출력합니다.

### 11.2 자동 프로비저닝
에이전트 실행 전 `env-provisioner`가 자동으로 환경을 확인합니다.
부족한 패키지가 있으면 사용자 확인 후 자동 설치합니다.

### 11.3 업데이트
```bash
cd ~/work/claude-dev-forge
git pull
# 심볼릭 링크 → 자동 반영
```

---

## 12. FAQ

### Q: 슬래시 커맨드를 다 외워야 하나요?
**A**: 아니요. 자연어로 말하면 `project-director`가 자동 판단합니다. 커맨드는 편의 기능입니다.

### Q: 에이전트가 실패하면?
**A**: `project-director`가 자동으로 재시도하거나 대안 에이전트를 투입합니다. 해결 불가 시 사용자에게 보고합니다.

### Q: 대시보드 없이도 사용 가능한가요?
**A**: 네. 대시보드는 선택 기능입니다. 터미널에서도 모든 기능을 사용할 수 있습니다.

### Q: 기존 v1.0 설정과 호환되나요?
**A**: 네. v1.0의 모든 에이전트/커맨드가 유지됩니다. v2.0은 순수 추가입니다.

### Q: 문서 생성에 Microsoft Office가 필요한가요?
**A**: 아니요. Python 라이브러리(python-docx, python-pptx 등)로 직접 생성합니다. 열기에는 Office나 LibreOffice가 필요합니다.

### Q: 오프라인에서 사용 가능한가요?
**A**: 대부분 가능합니다. 단, 논문/특허 검색(WebSearch)과 시장조사는 인터넷이 필요합니다.
