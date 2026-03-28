# claude-dev-forge

> Claude Code를 위한 범용 제품 개발 프레임워크 — 43개 에이전트, 33개 커맨드, 19개 스킬, 12개 훅, 13개 규칙, 5개 MCP 서버, 실시간 대시보드

## 특징

| 구성요소 | 수량 | 설명 |
|----------|------|------|
| **에이전트** | 43 | 26 Opus (분석/설계) + 17 Sonnet (구현/실행) |
| **커맨드** | 33 | PDLC + 코드 품질 + BSP/임베디드 + Git 워크플로우 |
| **스킬** | 19 | 멀티스텝 워크플로우 + PDLC + 컨텍스트 관리 + 패턴 |
| **훅** | 12 | 보안 6-layer + 품질 게이트 + 컨텍스트 추적 + 세션 관리 |
| **규칙** | 13 | 코딩 원칙, 보안, 테스트, Git, PDLC, 워크플로우, 패턴 |
| **MCP** | 5 | memory, github, context7, fetch, jina-reader |
| **대시보드** | 1 | TaskForce.AI 칸반 보드 (WebSocket 실시간) |

## 빠른 설치

```bash
git clone https://github.com/issacs83/claude-dev-forge.git
cd claude-dev-forge
chmod +x install.sh
./install.sh
```

## PDLC 파이프라인 (12단계)

```
Phase 0: 선행연구 → Phase 1: VOC → Phase 2: 시장조사 →
Phase 3: 기획/디자인 → Phase 4: 세부기획 → Phase 5: 아키텍처 →
Phase 6: 파트별설계 → Phase 7: 세부설계 → Phase 8: 구현 →
Phase 9: 테스트 → Phase 10: 검증 → Phase 11: 평가
(부족 시 디버그 루프 → Phase 8~10 재진입)
```

각 단계별 문서 산출물 자동 생성 (.docx, .pptx, .hwpx, .xlsx)

## 에이전트 구성 (41개)

### 관리 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| project-director | Opus | 자율 판단 오케스트레이터 (팀장/PM) |
| env-provisioner | Sonnet | 의존성 점검, 자동 설치, 환경 준비 |

### 연구 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| paper-patent-researcher | Opus | 논문 서베이, 특허 조사, SOTA 분석 |
| algorithm-researcher | Opus | 알고리즘 설계, 수학적 모델링 |

### AI/ML 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| data-engineer | Sonnet | 데이터 수집, 전처리, 파이프라인 |
| labeling-manager | Opus | 라벨링 가이드라인, 작업 설계 |
| labeling-reviewer | Opus | 라벨 품질 검증, IAA 측정 |
| ai-trainer | Opus | 모델 학습, 하이퍼파라미터 튜닝 |
| mlops-engineer | Sonnet | 모델 배포, 버전 관리, 모니터링 |

### GPU/NPU 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| cuda-engineer | Opus | CUDA 커널, cuDNN, 멀티GPU |
| npu-engineer | Opus | INT8/INT4 양자화, NPU 변환 |
| inference-optimizer | Sonnet | TensorRT, ONNX Runtime, 추론 최적화 |

### PDLC 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| voc-researcher | Opus | VOC 분석, 페르소나, 사용자 여정 |
| ux-designer | Opus | UX 설계, 와이어프레임, Figma 연동 |
| marketing-strategist | Opus | GTM 전략, 포지셔닝, 브랜딩 |

### 문서 생산 에이전트
| Agent | 모델 | 출력 | 역할 |
|-------|------|------|------|
| report-writer | Opus | .docx | 기술 보고서, 규격 문서, 매뉴얼 |
| presentation-writer | Opus | .pptx | 발표자료, 제안서, 리뷰 발표 |
| hwp-writer | Opus | .hwpx | 한글 공문서, 인증 신청서 |
| spreadsheet-writer | Sonnet | .xlsx | BOM, 테스트 매트릭스, 예산표 |

### 리버스 엔지니어링 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| reverse-engineer | Opus | HW/SW/FW 역분석, 회로/코드/프로토콜 리버싱 |
| retroactive-documenter | Opus | 기존 제품/코드 → PDLC 산출물/인증문서 역생성 |

### 테스트/평가 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| e2e-tester | Sonnet | Playwright 실제 브라우저 테스트 |
| evaluator | Opus | 프로젝트 평가, KPI 분석, 회고 |

### 프로세스 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| planner | Opus | 구현 계획 수립, 리스크 분석 |
| architect | Opus | 시스템 설계, 의존성 분석 |
| code-reviewer | Opus | 코드 품질 + 보안 리뷰 |
| security-reviewer | Opus | OWASP 감사, 위협 모델링 |
| tdd-guide | Opus | RED→GREEN→REFACTOR TDD |
| build-error-resolver | Sonnet | 빌드 에러 자동 해결 |
| verify-agent | Sonnet | 빌드→테스트→린트 파이프라인 |

### 도메인 에이전트
| Agent | 모델 | 역할 |
|-------|------|------|
| bsp-engineer | Sonnet | Yocto, 커널, U-Boot, DTS |
| firmware-engineer | Opus | MCU, FPGA, RTOS, RTL |
| circuit-engineer | Opus | 회로, PCB, 전원, EMC |
| hardware-engineer | Opus | 광학, 센서, 열관리, 기구 |
| graphics-engineer | Opus | 3D 렌더링, Metal, Vulkan, WebGL |
| sdk-developer | Opus | SDK, API 설계, 드라이버 래핑 |
| web-developer | Sonnet | React, API, DB, 풀스택 |
| devops-engineer | Sonnet | CI/CD, Docker, 릴리즈 |
| maintenance-engineer | Sonnet | 크래시 분석, OTA, 진단 |
| product-strategist | Opus | 로드맵, 경쟁 분석, 시장조사 |
| regulatory-specialist | Opus | FDA, CE, ISO, IEC |
| doc-manager | Sonnet | 기술문서 + 문서 라우팅 |
| qa-engineer | Sonnet | 테스트 전략, V&V, CI 게이트 |

## 핵심 커맨드

```
/lifecycle       — 전체 PDLC 파이프라인 실행
/dashboard       — 실시간 모니터링 대시보드 시작
/voc             — VOC 분석
/market-analysis — 시장조사/경쟁사 분석
/research        — 논문/특허 선행연구
/design-spec     — UX/UI 사양서 생성
/e2e-test        — Playwright E2E 브라우저 테스트
/evaluate        — 프로젝트 평가/회고
/health-check    — 전체 에이전트 환경 점검
/plan            — 구현 계획 수립
/auto            — 원버튼 파이프라인
/verify-loop     — 빌드→테스트 자동 재시도
/commit-push-pr  — 커밋→푸시→PR 자동화
```

## 자율 운영

```
사용자가 자연어로 입력
  → project-director가 자동 해석
  → env-provisioner가 환경 준비
  → 적절한 에이전트 자동 배정
  → 결과 → 다음 에이전트 자동 체이닝
  → 문서 자동 생성
  → 대시보드에서 실시간 모니터링
  → 사용자 만족까지 반복
```

## 대시보드

```bash
# Claude Code에서:
/dashboard

# 또는 직접 실행:
cd dashboard && npm install && npm start
# → http://localhost:7700
```

TaskForce.AI 칸반 보드: 5컬럼 (To Do → Claimed → In Progress → Review → Done), 실시간 WebSocket, 에이전트 모니터, PDLC 진행률, 문서 산출물 추적

## 아키텍처

```
글로벌 (~/.claude/)                     프로젝트 (.claude/)
┌─────────────────────────┐            ┌──────────────────────┐
│ agents/ (43개)          │            │ agents/ (프로젝트 추가)│
│ commands/ (33개)        │            │ rules/ (프로젝트 규칙) │
│ skills/ (19개)          │            │ memory/ (프로젝트 지식) │
│ hooks/ (12개)           │            │ prompts/ (시스템 프롬프트)│
│ rules/ (13개)           │            └──────────────────────┘
│ dashboard/              │              프로젝트 레벨이 글로벌 확장
│ settings.json           │
│ mcp-servers.json        │
└─────────────────────────┘
```

## 업데이트

```bash
cd ~/work/claude-dev-forge
git pull
# 심볼릭 링크는 자동 반영됨
```

## 라이선스

MIT
