# Approval Gate Rule (결재 필수 규칙)

## HARD GATE — 모든 에이전트, 모든 프로젝트, 모든 상태 이동에 적용

### 핵심 원칙
**모든 태스크의 모든 상태 이동은 사용자 결재 승인 없이 불가능합니다.**
예외 없음. 반려 시 재검토 및 재수행됩니다.

### 에이전트 허용 상태 전환 (결재 불필요)
에이전트가 API로 직접 변경 가능한 전환:
```
todo → claimed         (태스크 확인/수령)
claimed → in_progress  (작업 착수)
in_progress → hold     (결재 대기 또는 블로커)
in_progress → review   (작업 완료, 검증 대기)
review → hold          (결재 대기)
hold → in_progress     (반려 후 재작업)
```

### 사용자 결재 필수 상태 전환
아래 전환은 **사용자 결재 승인 후에만** 가능:
```
* → done               (모든 상태에서 done 이동)
done → *               (done에서 다른 상태 이동)
review → done          (검증 완료 → 결재 필수)
hold → done            (대기 → 결재 필수)
```

### 절대 금지
- ❌ 결재 없이 어떤 태스크든 done으로 이동
- ❌ 에이전트가 자체적으로 done 처리
- ❌ 서버 자동 로직으로 done 처리 (auto_done 금지)
- ❌ 결재 요청 없이 상태만 변경
- ❌ 사용자 승인 없이 다음 Phase 진행

### 필수 프로세스
1. 작업 완료 후 태스크 상태를 **hold** 또는 현재 상태 유지
2. 결재 요청 API 호출:
   ```bash
   curl -s -X POST http://58.29.21.11:7700/api/tasks/TASK_ID/approval \
     -H 'Content-Type: application/json' \
     -d '{"summary":"작업 요약","deliverables":["산출물목록"]}'
   ```
3. 채팅으로 사용자에게 결재 요청 알림
4. 사용자 승인 대기 (hold 상태 유지)
5. 승인 시 → 서버가 자동으로 done 이동
6. 반려 시 → in_progress 복귀, 사유 반영 후 재작업 → 재결재 요청

### 서버 강제 적용
- `PATCH /api/tasks/:id` — 에이전트(x-user-action 헤더 없음)의 비허용 전환 시 403 반환
- `POST /api/tasks/:id/approve` — 승인 시 자동 done 이동
- `POST /api/tasks/:id/reject` — 반려 시 in_progress 복귀 + 재작업 지시
- Health Monitor — 에이전트 완료 시 hold(결재대기)로 이동, done 아님

### 적용 범위
- Full PDLC 프로젝트: 모든 Phase의 태스크
- Lite PDLC 프로젝트: 모든 태스크
- Kanban 프로젝트: 모든 이슈
- 모든 에이전트(43개 전체)
- 대시보드 UI(x-user-action 헤더)만 전체 상태 전환 가능
