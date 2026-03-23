# claude-dev-forge

> Claude Code를 위한 범용 개발 프레임워크 — 21개 에이전트, 24개 커맨드, 12개 훅, 12개 규칙, 17개 스킬, 5개 MCP 서버

## 특징

| 구성요소 | 수량 | 설명 |
|----------|------|------|
| **에이전트** | 21 | 12 Opus (분석/설계) + 9 Sonnet (구현/실행) |
| **커맨드** | 24 | 코드 품질 + BSP/임베디드 + Git 워크플로우 |
| **스킬** | 17 | 멀티스텝 워크플로우 + 컨텍스트 관리 + C++/ML 패턴 |
| **훅** | 12 | 보안 6-layer + 품질 게이트 + 컨텍스트 추적 + 세션 관리 |
| **규칙** | 12 | 코딩 원칙, 보안, 테스트, Git, 워크플로우, 패턴, 성능 |
| **MCP** | 5 | memory, github, context7, fetch, jina-reader |

## 빠른 설치

```bash
git clone https://github.com/issacs83/claude-dev-forge.git
cd claude-dev-forge
chmod +x install.sh
./install.sh
```

## 에이전트 구성

### 프로세스 에이전트 (SW 개발 워크플로우)
| Agent | 모델 | 역할 |
|-------|------|------|
| planner | Opus | 구현 계획 수립, 리스크 분석 |
| architect | Opus | 시스템 설계, 의존성 분석 |
| code-reviewer | Opus | 코드 품질 + 보안 리뷰 |
| security-reviewer | Opus | OWASP 감사, 위협 모델링 |
| tdd-guide | Opus | RED→GREEN→REFACTOR TDD |
| build-error-resolver | Sonnet | 빌드 에러 자동 해결 |
| verify-agent | Sonnet | 빌드→테스트→린트 파이프라인 |

### 도메인 에이전트 (전문 분야)
| Agent | 모델 | 역할 |
|-------|------|------|
| bsp-engineer | Sonnet | Yocto, 커널, U-Boot, DTS |
| firmware-engineer | Opus | MCU, FPGA, RTOS, RTL |
| circuit-engineer | Opus | 회로, PCB, 전원, EMC |
| hardware-engineer | Opus | 광학, 센서, 열관리, 기구 |
| algorithm-researcher | Opus | CV, ML, 신호처리, 최적화 |
| graphics-engineer | Opus | 3D 렌더링, Metal, Vulkan, WebGL |
| sdk-developer | Opus | SDK, API 설계, 드라이버 래핑 |
| web-developer | Sonnet | React, API, DB, 풀스택 |
| devops-engineer | Sonnet | CI/CD, Docker, 릴리즈 |
| maintenance-engineer | Sonnet | 크래시 분석, OTA, 진단 |
| product-strategist | Opus | 로드맵, 경쟁 분석 |
| regulatory-specialist | Opus | FDA, CE, ISO, IEC |
| doc-manager | Sonnet | 기술문서 + 코드맵 동기화 |
| qa-engineer | Sonnet | 테스트 전략, V&V, CI 게이트 |

## 핵심 커맨드

```
/plan              — 구현 계획 수립 (3+ 파일 변경 시 필수)
/auto              — 원버튼 파이프라인 (feature/bugfix/refactor)
/code-review       — 2단계 코드 리뷰
/verify-loop       — 빌드→테스트 자동 재시도 (3회)
/commit-push-pr    — 커밋→푸시→PR 자동화
/quick-commit      — 빠른 커밋+푸시
/build             — 범용 빌드 (bitbake/cmake/npm 자동감지)
/flash             — 디바이스 플래싱 (UUU/dd/fastboot)
/show-setup        — 현재 설정 표시
/init-project      — 프로젝트 오버레이 초기화
```

## 워크플로우

### 기능 개발
```
/plan → 구현 → /tdd → /code-review → /verify-loop → /commit-push-pr
```

### 버그 수정
```
/explore → 수정 → /verify-loop → /quick-commit
```

### 보안 감사
```
/security-review → 수정 → /verify-loop
```

## 아키텍처

```
글로벌 (~/.claude/)                     프로젝트 (.claude/)
┌─────────────────────────┐            ┌──────────────────────┐
│ agents/ (21개)          │            │ agents/ (프로젝트 추가)│
│ commands/ (24개)        │            │ rules/ (프로젝트 규칙) │
│ skills/ (17개)          │            │ memory/ (프로젝트 지식) │
│ hooks/ (12개)           │            │ prompts/ (시스템 프롬프트)│
│ rules/ (12개)           │            └──────────────────────┘
│ settings.json           │              프로젝트 레벨이 글로벌 확장
│ mcp-servers.json        │
└─────────────────────────┘
```

## 프로젝트 오버레이

프로젝트별 커스터마이징은 `/init-project`로 시작:

```bash
# Claude Code에서:
/init-project    # → 도메인 선택 (yocto-bsp / web-fullstack / firmware)
```

## 업데이트

```bash
cd ~/work/claude-dev-forge
git pull
# 심볼릭 링크는 자동 반영됨
```

## 라이선스

MIT
