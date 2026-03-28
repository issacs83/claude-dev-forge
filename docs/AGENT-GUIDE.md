# Multi-Agent 사용 가이드

## 에이전트란?

Claude Code에서 **에이전트**란, 특정 전문 분야의 지식과 도구를 갖춘 **전문가 역할**입니다.

```
일반 Claude = 만능 인턴 (뭐든 가능하지만 매번 맥락 설명 필요)
멀티 에이전트 = 전문 팀 (각자 분야가 있어서 바로 실행)
project-director = 팀장 (자연어로 말하면 알아서 팀 배정)
```

## 41개 에이전트

### 관리 에이전트 (자율 운영)

| Agent | 모델 | 역할 |
|-------|------|------|
| **project-director** | Opus | 팀장 — 자연어 해석, 에이전트 자동 배정, 반복 관리 |
| **env-provisioner** | Sonnet | 지원전담 — 의존성 점검, 자동 설치, 환경 준비 |

### 연구 에이전트

| Agent | 모델 | 역할 |
|-------|------|------|
| **paper-patent-researcher** | Opus | 논문 서베이, 특허 조사, SOTA, 특허 회피 |
| **algorithm-researcher** | Opus | 알고리즘 설계, 수학적 모델링, 비교 실험 |

### AI/ML 에이전트

| Agent | 모델 | 역할 |
|-------|------|------|
| **data-engineer** | Sonnet | 데이터 수집, 전처리, 파이프라인, 증강 |
| **labeling-manager** | Opus | 라벨링 가이드라인, 클래스 정의, 작업 설계 |
| **labeling-reviewer** | Opus | 라벨 품질 검증, IAA, 오라벨링 탐지 |
| **ai-trainer** | Opus | 학습 전략, loss 설계, 하이퍼파라미터 튜닝 |
| **mlops-engineer** | Sonnet | 모델 배포, 버전 관리, 드리프트 모니터링 |

### GPU/NPU 에이전트

| Agent | 모델 | 역할 |
|-------|------|------|
| **cuda-engineer** | Opus | CUDA 커널, cuDNN, NCCL, Mixed Precision |
| **npu-engineer** | Opus | INT8/INT4 양자화, RKNN/SNPE/Edge TPU 변환 |
| **inference-optimizer** | Sonnet | TensorRT, ONNX Runtime, Triton 추론 최적화 |

### PDLC 에이전트

| Agent | 모델 | 역할 |
|-------|------|------|
| **voc-researcher** | Opus | VOC 분석, 페르소나, 사용자 여정 |
| **ux-designer** | Opus | UX 설계, 와이어프레임, Figma 연동 |
| **marketing-strategist** | Opus | GTM 전략, 포지셔닝, 브랜딩 |

### 문서 생산 에이전트

| Agent | 모델 | 출력 | 역할 |
|-------|------|------|------|
| **report-writer** | Opus | .docx | 보고서, 규격 문서, 매뉴얼, 인증 문서 |
| **presentation-writer** | Opus | .pptx | 발표자료, 제안서, 리뷰 발표 |
| **hwp-writer** | Opus | .hwpx | 한글 공문서, 인증 신청서, 납품 문서 |
| **spreadsheet-writer** | Sonnet | .xlsx | BOM, 테스트 매트릭스, 예산표, FMEA |

### 테스트/평가 에이전트

| Agent | 모델 | 역할 |
|-------|------|------|
| **e2e-tester** | Sonnet | Playwright 실제 브라우저 테스트 + 스크린샷 |
| **evaluator** | Opus | 프로젝트 평가, KPI, 회고, 디버그 루프 판단 |

### 프로세스 에이전트 (SW 개발 워크플로우)

| Agent | 모델 | 역할 |
|-------|------|------|
| **planner** | Opus | 구현 계획 수립, 리스크 분석 |
| **architect** | Opus | 시스템 설계, 읽기전용 분석 |
| **code-reviewer** | Opus | 2단계 코드 리뷰 (보안→품질) |
| **security-reviewer** | Opus | OWASP/CWE 보안 감사 |
| **tdd-guide** | Opus | RED→GREEN→REFACTOR TDD |
| **build-error-resolver** | Sonnet | 빌드 에러 자동 해결 |
| **verify-agent** | Sonnet | 빌드→테스트→린트 파이프라인 |

### 도메인 에이전트 (전문 분야)

| Agent | 모델 | 핵심 키워드 |
|-------|------|------------|
| **bsp-engineer** | Sonnet | Yocto, 커널, DTS, U-Boot |
| **firmware-engineer** | Opus | MCU, FPGA, Cortex-M, RTOS |
| **circuit-engineer** | Opus | 회로, PCB, 전원, 임피던스 |
| **hardware-engineer** | Opus | 광학, 센서, 열관리, 기구 |
| **graphics-engineer** | Opus | 3D, Metal, Vulkan, WebGL |
| **sdk-developer** | Opus | SDK, API, 크로스플랫폼 |
| **web-developer** | Sonnet | React, API, DB, 풀스택 |
| **devops-engineer** | Sonnet | CI/CD, Docker, 릴리즈 |
| **maintenance-engineer** | Sonnet | 크래시, OTA, 진단 |
| **product-strategist** | Opus | 로드맵, 경쟁분석, 시장조사 |
| **regulatory-specialist** | Opus | FDA, CE, ISO, IEC |
| **doc-manager** | Sonnet | 기술문서, 문서 라우팅, 코드맵 |
| **qa-engineer** | Sonnet | 테스트 전략, V&V, CI 게이트 |

## 사용법

### 방법 1: 자연어로 요청 (가장 쉬움 — 추천!)

project-director가 자동으로 해석하고 적절한 에이전트를 배정합니다:

```
"스마트 카메라 시장 조사해줘"             → product-strategist
"이 모델 RKNN으로 양자화해줘"            → npu-engineer
"웹앱 전체 기능 테스트해줘"              → e2e-tester
"테스트 결과 보고서 워드로 만들어줘"      → report-writer
"라벨링 가이드라인 작성해줘"             → labeling-manager
"FDA 인증 준비해야 해"                  → regulatory-specialist
```

### 방법 2: 슬래시 커맨드

```
/lifecycle "스마트 카메라"     → 전체 PDLC 파이프라인
/voc                         → VOC 분석
/research "object detection"  → 논문/특허 조사
/e2e-test http://localhost:3000  → E2E 브라우저 테스트
/dashboard                    → 실시간 모니터링
/health-check                 → 전체 환경 점검
```

### 방법 3: 에이전트 직접 지정

```
"cuda-engineer로 이 커널 최적화해줘"
"labeling-reviewer한테 품질 검수 맡겨"
```

## 자율 운영 흐름

```
사용자: "스마트 카메라 제품 개발하자"

project-director:
├── Phase 0: paper-patent-researcher (선행연구)
├── Phase 1: voc-researcher (고객 분석)
├── Phase 2: product-strategist (시장조사)
│   └── report-writer → 시장분석_보고서.docx
│   └── presentation-writer → 경영진_보고.pptx
├── Phase 3: ux-designer + marketing-strategist (기획)
├── Phase 4~7: 도메인 에이전트 (설계)
│   └── regulatory-specialist → 규제문서 병렬 생성
├── Phase 8: 도메인 에이전트 + tdd-guide (구현)
├── Phase 9: e2e-tester (실제 브라우저 테스트)
│   └── 실패 → web-developer 수정 → 재테스트 (자동 루프)
├── Phase 10: regulatory + qa (검증)
└── Phase 11: evaluator (평가)
    └── Grade < B → Phase 8로 돌아가서 반복

대시보드 (localhost:7700)에서 전체 진행 실시간 확인
```

## 모델 선택 기준
- **Opus** (24개): 깊은 분석, 설계, 연구, 전략 — 복잡한 추론
- **Sonnet** (17개): 구현, 빌드, 배포, 데이터 처리 — 빠른 실행
