# 뽀모도로 기록(Pomodoros) 마이그레이션 및 ShadowDiff 실시간 검증 가이드

이 문서는 `PomodorosModule`을 MongoDB(Mongoose)에서 PostgreSQL(Drizzle ORM)로 점진적 이관(Migration)하며 구축한 외래키(FK) 매핑, Todoist 누적 시간 원자적 증분, 그리고 통계 집계 쿼리 설계를 정리한 문서입니다.

---

## 1. 개요 (Overview)

`PomodorosService`는 뽀모도로 세션이 끝났을 때의 기록 적재(`POST /pomodoros`), 통계 차트용 전체 이력 조회(`GET /pomodoros`), 그리고 오늘 누적 집중 시간 집계(`GET /pomodoros/today/total`)를 담당합니다.

---

## 2. 핵심 엔드포인트별 마이그레이션 설계

### ① `persistPomodoroRecordsAndTaskTrackingDurations` (POST `/pomodoros`)

```typescript
// 1. 카테고리 & 태스크 외래키(FK) 조회 및 매핑
let categoryId: string | null = null;
if (val.category?.name) {
  const foundCategory = await this.db.query.categories.findFirst({
    where: and(eq(schema.categories.userId, pgUser.id), eq(schema.categories.name, val.category.name)),
    columns: { id: true },
  });
  if (foundCategory) categoryId = foundCategory.id;
}

// 2. 뽀모도로 레코드 일괄 INSERT
await this.db.insert(schema.pomodoros).values(pgPomodoroValues).returning();

// 3. todoist_tasks 테이블 누적 집중 시간 원자적 증분 (+)
for (const tracking of safeTrackingArr) {
  if (tracking.taskId) {
    await this.db
      .update(schema.todoistTasks)
      .set({
        totalFocusDuration: sql`${schema.todoistTasks.totalFocusDuration} + ${tracking.duration}`,
      })
      .where(and(eq(schema.todoistTasks.userId, pgUser.id), eq(schema.todoistTasks.todoistTaskId, tracking.taskId)));
  }
}
```

- **FK 매핑**: 클라이언트가 보낸 카테고리 이름(`category.name`)과 Todoist 문자열 ID(`task.id`)를 PostgreSQL의 내부 고유 UUID FK로 매핑합니다.
- **방어 로직**: DTO상 optional인 `taskTrackingArr`에 대해 `(createPomodoroDto.taskTrackingArr ?? [])` 방어 코드를 적용하여 `TypeError`를 원천 차단했습니다.

---

### ② `getAllPomodoroRecordsByUserEmail` (GET `/pomodoros`)

- **PostgreSQL 릴레이션 쿼리 (`db.query.pomodoros.findMany`)**:
  - `with: { category: { columns: { name: true, color: true, isOnStat: true } } }` 조인을 통해 카테고리 메타데이터를 함께 결합하여 반환합니다.

---

### ③ `getTodayTotalDurationByUserEmail` (GET `/pomodoros/today/total?date=...`)

```typescript
const [pgResult] = await this.db
  .select({
    todayTotal: sql<number>`COALESCE(SUM(${schema.pomodoros.duration}), 0)`,
  })
  .from(schema.pomodoros)
  .where(and(eq(schema.pomodoros.userId, pgUser.id), eq(schema.pomodoros.date, todayDateString)));
```
- PostgreSQL의 집계 함수 `SUM()`과 `COALESCE()`를 활용하여 해당 날짜의 총 집중 시간을 단 1회의 초고속 인덱스 스캔으로 계산합니다.

---

### ④ `createDemoData` & `deleteDemoData` (POST / DELETE `/pomodoros/demo-data`)
- **배치 INSERT 청크 분할**: 40일치 대량 더미 데이터(수백 행)를 PostgreSQL에 넣을 때 매개변수 바인딩 한도를 넘지 않도록 500개씩 청크(`chunk`)로 쪼개어 안전하게 삽입합니다.
- **`isDummy: true` 삭제**: 단일 DELETE 쿼리로 더미 데이터만 깔끔하게 제거합니다.
