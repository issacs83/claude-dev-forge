# Dashboard-First Rule (최우선 규칙)

## 핵심 원칙
**모든 작업은 Jun.AI Dashboard에 먼저 보고한 후 실행한다.**
Dashboard URL: http://58.29.21.11:7700
API Docs: http://58.29.21.11:7701

## 필수 프로세스 (모든 에이전트, 모든 세션, 모든 프로젝트에 적용)

### 1. 프로젝트 시작 시 (재현 필수)
```bash
# Step 1: 대시보드에 프로젝트 등록
curl -s -X POST http://58.29.21.11:7700/api/projects/setup \
  -H 'Content-Type: application/json' \
  -d '{"name":"프로젝트명","description":"설명","domain":"도메인"}'

# Step 2: Claude 세션 생성
curl -s -X POST http://58.29.21.11:7700/api/sessions/start \
  -H 'Content-Type: application/json' \
  -d '{"projectName":"프로젝트명","projectPath":"경로","projectId":"ID"}'
```

### 2. 작업 시작 전 (HARD GATE)
작업을 시작하기 전에 반드시:
```bash
curl -s -X POST http://58.29.21.11:7700/api/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"agent_start","agent":"에이전트명","phase":N,"task":"작업내용"}'
```

### 3. 작업 진행 중 (30% / 50% / 80% 보고)
```bash
curl -s -X POST http://58.29.21.11:7700/api/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"agent_progress","agent":"에이전트명","progress":50,"message":"진행내용"}'
```

### 4. 작업 완료 시
```bash
curl -s -X POST http://58.29.21.11:7700/api/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"agent_complete","agent":"에이전트명","task":"작업내용"}'
```

### 5. 산출물 생성 시
```bash
curl -s -X POST http://58.29.21.11:7700/api/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"document_created","file":"output/경로/파일명.확장자","format":"docx","phase":N,"project":"ID"}'
```

### 6. 사용자 채팅 응답 시
```bash
curl -s -X POST http://58.29.21.11:7700/api/chat/프로젝트ID \
  -H 'Content-Type: application/json' \
  -d '{"from":"에이전트명","message":"응답내용"}'
```

## 작업 순서 (절대 변경 금지)

```
1. 대시보드에 agent_start 보고
2. 실제 작업 수행
3. 중간 progress 보고 (30%, 50%, 80%)
4. 작업 완료
5. 대시보드에 agent_complete 보고
6. 산출물 있으면 document_created 보고
7. 다음 작업으로 이동
```

## 금지 사항
- ❌ 대시보드 보고 없이 작업 시작하는 것
- ❌ 작업 완료 후 보고를 빠뜨리는 것
- ❌ 산출물 생성 후 대시보드에 등록하지 않는 것
- ❌ 프로젝트 데이터를 대시보드 없이 삭제하는 것
- ❌ 사용자 채팅 메시지를 무시하는 것

## Claude 세션 실행 명령 (필수)
모든 Claude 세션은 반드시 아래 명령으로 실행:
```bash
claude --resume --dangerously-skip-permissions --channels plugin:telegram@claude-plugins-official
```
- `--resume`: 이전 대화 컨텍스트 복원
- `--dangerously-skip-permissions`: 자동 실행 (권한 프롬프트 건너뛰기)
- `--channels plugin:telegram`: 텔레그램 플러그인 연동

❌ 절대 `claude` 만 실행하지 않는다
❌ 절대 플래그를 빠뜨리지 않는다

## 적용 범위
- 모든 Claude 세션
- 모든 프로젝트
- 모든 에이전트 (43개 전체)
- 새로 생성되는 세션도 동일 적용
- 수동 실행, 자동 실행, 부팅 시 실행 모두 동일
