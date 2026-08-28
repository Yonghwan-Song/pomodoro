# Todoist 태스크 동기화 및 Upsert / 비활성화(Soft Deactivation) 아키텍처

## 1. 개요 (Overview)

`todoist_tasks` 테이블은 Todoist 공식 서버의 할 일 목록을 로컬 PostgreSQL에 캐싱하고, 우리 앱 고유의 데이터인 **누적 집중 시간(`totalFocusDuration`)**을 결합하여 관리하는 핵심 엔티티입니다.

`TodoistService.syncAndGetTasks(userId, accessToken)` 메소드는 사용자가 앱을 열거나 "Sync Tasks" 버튼을 누를 때 호출되어 실시간 상태를 동기화합니다.

```text
[Todoist Cloud API] ──── (api.getTasks) ────> [Incomplete Tasks]
                                                      │
         ┌────────────────────────────────────────────┴────────────────────────────────────────────┐
         ▼                                                                                         ▼
1) active 태스크 목록 Upsert                                                            2) 누락된 태스크 비활성화
   - ON CONFLICT (userId, todoistTaskId)                                                   - WHERE user_id = $1
   - DO UPDATE SET taskData, isActive=true, syncedAt                                         AND todoist_task_id NOT IN ($activeIds)
                                                                                           - SET isActive = false
         │                                                                                         │
         └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                                      ▼
                                3) totalFocusDuration 조회 및 결합
                                   - taskFocusDuration 으로 프로퍼티 매핑 후 FE 반환
```

---

## 2. `.onConflictDoUpdate()` — 원자적 Upsert 처리

```typescript
      await tx
  .insert(schema.todoistTasks)
  .values({
    userId,
    todoistTaskId: task.id,
    taskData: task,
    isActive: true,
    syncedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [
      schema.todoistTasks.userId,
      schema.todoistTasks.todoistTaskId,
    ],
    set: {
      taskData: task,
      isActive: true,
      syncedAt: new Date(),
    },
  });
```

### 왜 필요한가? (Why Upsert?)
1. **UNIQUE 제약조건 충돌 방지**:
   - `schema.ts`에 `unique('todoist_tasks_user_id_todoist_task_id_unique').on(table.userId, table.todoistTaskId)` 제약조건이 걸려 있습니다.
   - 단순 `.insert()`를 실행하면, 유저가 동기화를 2번 이상 실행할 때마다 `duplicate key error (23505)`가 발생하여 서버가 다운됩니다.
2. **최신 메타데이터 갱신**:
   - 이미 존재하는 태스크라도 Todoist 앱에서 제목(`content`), 마감일(`due`), 우선순위(`priority`) 등이 바뀌었을 수 있으므로 `taskData`를 최신 JSON으로 덮어씁니다.
3. **태스크 재활성화(Uncomplete) 자동 처리**:
   - 과거에 완료 체크되어 `isActive = false` 상태였던 태스크를 유저가 Todoist 앱에서 '미완료'로 되돌린 경우, `isActive: true`로 즉시 복구됩니다.

---

## 3. `.where(and(eq(...), notInArray(...)))` — Soft Deactivation

```typescript
if (activeTodoistTaskIds.length > 0) {
  await tx
    .update(schema.todoistTasks)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.todoistTasks.userId, userId),
        notInArray(
          schema.todoistTasks.todoistTaskId,
          activeTodoistTaskIds,
        ),
      ),
    );
} else {
  // Todoist에 미완료 태스크가 0개인 경우 해당 유저의 모든 태스크 비활성화
  await tx
    .update(schema.todoistTasks)
    .set({ isActive: false })
    .where(eq(schema.todoistTasks.userId, userId));
}
```

### 생성되는 실제 SQL
```sql
UPDATE todoist_tasks
SET is_active = false
WHERE user_id = '유저_UUID'
  AND todoist_task_id NOT IN ('task_1', 'task_2', ...);
```

### 왜 DELETE 대신 `isActive = false`인가?
- 유저가 Todoist에서 태스크를 완료(`isCompleted: true`)하거나 삭제하면, Todoist API 응답 목록(`activeTodoistTaskIds`)에서 제외됩니다.
- 이때 이 태스크를 PostgreSQL에서 `DELETE` 해버리면 **과거 해당 태스크에 걸려있던 `pomodoros` 기록의 외래키(`todoist_task_id`) 참조와 누적 통계(`totalFocusDuration`)가 손실**됩니다.
- 따라서 행(row)은 그대로 유지하되 `isActive = false`로 상태만 비활성화하여 **과거 데이터 무결성을 100% 보존**합니다.

---

## 4. `totalFocusDuration` ➡️ `taskFocusDuration` 매핑

Todoist 공식 API는 우리 뽀모도로 타이머의 집중 시간을 알지 못하므로, 로컬 DB에서 집계된 시간을 꺼내와 프론트엔드 인터페이스에 맞춰 주입합니다:

```typescript
// 1. PostgreSQL todoist_tasks 테이블에서 totalFocusDuration 조회
const trackingRows = await this.db.query.todoistTasks.findMany({
  where: eq(schema.todoistTasks.userId, userId),
  columns: {
    todoistTaskId: true,
    totalFocusDuration: true,
  },
});

const trackingMap = new Map(
  trackingRows.map((row) => [row.todoistTaskId, row.totalFocusDuration]),
);

// 2. FE 계약 인터페이스(taskFocusDuration)로 바인딩하여 반환
return incompleteTasks.map((task) => ({
  ...task,
  taskFocusDuration: trackingMap.get(task.id) ?? 0,
}));
```

---

## 5. PostgreSQL Credential Source

- OAuth 연결 시 PostgreSQL user 존재를 먼저 확인한 뒤 `todoistAccessToken`, `isTodoistIntegrationEnabled`, `currentTaskId`, `taskChangeInfoArray`를 PostgreSQL에 기록합니다.
- 연결 해제 시 Todoist API 호출에는 PostgreSQL의 access token을 사용하고, 성공 후 PostgreSQL의 token과 연동 상태를 해제합니다.
- `getTasks()`와 `UsersService.getUserInfo()`도 PostgreSQL의 연동 상태와 token만 사용합니다. 기존 MongoDB 조회 코드는 이전 구현 참고용 주석으로만 보존합니다.
- token은 로그, API 응답, PostgreSQL `.returning()` 결과에 포함하지 않습니다.
- Todoist OAuth 연결·해제 경로는 MongoDB에 write하지 않으며 PostgreSQL을 authoritative source로 사용합니다.

## 6. Transaction 및 동시 실행 제어

Todoist Cloud API 호출은 PostgreSQL transaction을 열기 전에 수행합니다. 외부 네트워크 응답을 기다리는 동안 DB connection과 lock을 점유하지 않기 위함입니다.

API 응답을 받은 뒤에는 다음 작업을 하나의 PostgreSQL transaction으로 실행합니다.

1. `users` row를 `FOR UPDATE`로 잠가 같은 유저의 자동/수동 sync를 직렬화합니다.
2. active task를 upsert합니다.
3. API 응답에서 사라진 task를 비활성화합니다.
4. 누적 집중 시간을 읽어 FE 응답에 결합합니다.

따라서 PG write 또는 마지막 read가 실패하면 해당 sync의 PG 변경 전체가 rollback됩니다.

## 7. 자동 Sync와 수동 Sync의 실패 정책

`GET /users`에서 수행하는 자동 sync는 앱 초기화를 막지 않도록 resilient하게 동작합니다.

- 연동이 꺼져 있으면 `todoistTasks: []`를 반환합니다.
- 연동이 켜져 있고 token이 있으면 Todoist Cloud와 동기화합니다.
- Todoist API 또는 sync가 실패하면 PG에서 `isActive = true`인 cache를 읽어 반환합니다.
- 연동은 켜져 있지만 PG token이 없는 비정상 상태도 오류를 기록하고 active cache를 반환합니다.
- cache 조회 자체나 사용자 PG 조회가 실패하면 HTTP 500으로 전달합니다.

사용자가 "Sync Tasks" 버튼으로 호출하는 `GET /todoist/tasks`는 명시적인 최신화 요청이므로 cache fallback을 사용하지 않습니다. Todoist API 또는 PG sync 실패는 HTTP 500으로 전달합니다.
