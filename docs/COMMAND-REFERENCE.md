# 커맨드 레퍼런스

## 핵심 워크플로우

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/plan` | 구현 계획 수립 | 3+ 파일 변경 전 필수 |
| `/auto` | 원버튼 파이프라인 | feature/bugfix/refactor 자동화 |
| `/code-review` | 2단계 코드 리뷰 | 보안 + 품질 검사 |
| `/verify-loop` | 빌드→테스트 자동 재시도 | 커밋 전 검증 (3회) |
| `/explore` | 코드베이스 탐색 | 읽기전용 조사 |

## Git 워크플로우

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/commit-push-pr` | 커밋→푸시→PR | 전체 Git 자동화 |
| `/quick-commit` | 빠른 커밋+푸시 | 작은 변경 (<3 파일) |
| `/checkpoint` | 작업 스냅샷 | save/restore/list/diff |
| `/worktree-start` | 격리 워크트리 | 병렬 작업 |

## 테스트

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/tdd` | TDD 사이클 | RED→GREEN→REFACTOR |
| `/test-coverage` | 커버리지 분석 | 목표: 80%+ |

## 보안

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/security-review` | 보안 감사 | OWASP, CWE, 시크릿 스캔 |

## 문서

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/sync-docs` | 문서 동기화 | 코드맵/README 업데이트 |
| `/update-docs` | 문서 업데이트 | 특정 문서 갱신 |

## 세션 관리

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/handoff` | 인수인계 문서 | 세션 컨텍스트 보존 |
| `/learn` | 패턴 학습 | 지식 기록/축적 |

## 빌드/임베디드

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/build` | 범용 빌드 | bitbake/cmake/npm 자동감지 |
| `/flash` | 디바이스 플래싱 | UUU/dd/fastboot |
| `/dts-check` | DTS 검증 | 문법/바인딩/핀먹스 충돌 |
| `/release` | 릴리즈 준비 | 버전/태그/패키지 |

## 유틸리티

| 커맨드 | 설명 | 용도 |
|--------|------|------|
| `/refactor-clean` | 코드 정리 | 미사용 코드/임포트 제거 |
| `/orchestrate` | 멀티에이전트 조율 | 복합 작업 |
| `/show-setup` | 설정 표시 | 현재 forge 구성 확인 |
| `/init-project` | 프로젝트 초기화 | 오버레이 템플릿 적용 |

## 워크플로우 예시

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

### BSP 개발
```
/build → /dts-check → /flash → 테스트 → /release
```
