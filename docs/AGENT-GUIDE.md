# Multi-Agent 사용 가이드

## 에이전트란?

Claude Code에서 **에이전트**란, 특정 전문 분야의 지식과 도구를 갖춘 **전문가 역할**입니다.

```
일반 Claude = 만능 인턴 (뭐든 가능하지만 매번 맥락 설명 필요)
멀티 에이전트 = 전문 팀 (각자 분야가 있어서 바로 실행)
```

## 21개 에이전트

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
| **algorithm-researcher** | Opus | CV, ML, 신호처리, 최적화 |
| **graphics-engineer** | Opus | 3D, Metal, Vulkan, WebGL |
| **sdk-developer** | Opus | SDK, API, 크로스플랫폼 |
| **web-developer** | Sonnet | React, API, DB, 풀스택 |
| **devops-engineer** | Sonnet | CI/CD, Docker, 릴리즈 |
| **maintenance-engineer** | Sonnet | 크래시, OTA, 진단 |
| **product-strategist** | Opus | 로드맵, 경쟁분석, PRD |
| **regulatory-specialist** | Opus | FDA, CE, ISO, IEC |
| **doc-manager** | Sonnet | 기술문서, 코드맵, 릴리즈노트 |
| **qa-engineer** | Sonnet | 테스트 전략, V&V, CI 게이트 |

## 사용법

### 자연어로 요청 (가장 쉬움)
```
"커널에 새 GPIO 드라이버 패치 추가해줘"     → bsp-engineer
"REST API 설계해줘"                        → web-developer
"보안 취약점 검사"                          → security-reviewer
"TDD로 이 모듈 개발"                       → tdd-guide
```

### 에이전트 지정
```
"firmware-engineer로 SPI 드라이버 분석해줘"
"architect한테 아키텍처 리뷰 맡겨"
```

## 모델 선택 기준
- **Opus** (12개): 깊은 분석, 설계, 연구 — 복잡한 추론
- **Sonnet** (9개): 구현, 빌드, 문서 — 빠른 실행
