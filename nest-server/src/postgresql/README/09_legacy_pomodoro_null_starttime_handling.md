# 레거시 Pomodoro 데이터의 startTime NULL 처리 및 Fallback 전략

## 1. 문제 배경 (Problem Background)

PostgreSQL의 `pomodoros` 테이블은 다음과 같이 `startTime`에 `NOT NULL` 제약조건이 걸려 있습니다:

```typescript
// src/postgresql/schema.ts
export const pomodoros = pgTable('pomodoros', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  duration: integer().notNull(),
  startTime: bigint({ mode: 'number' }).notNull(), // NOT NULL 제약조건
  date: text().notNull(),
  ...
});
```

그러나 실제 MongoDB Atlas에 누적된 **5,505건의 뽀모도로 데이터**를 전수 조사한 결과, 프로젝트 극초기에 수동으로 입력되었거나 특정 데모/시드 경로로 생성된 일부 레거시 문서에서 **`startTime` 필드가 누락(`null` 또는 `undefined`)되고 `date` 필드(예: `'8/13/2025'`)만 존재하는 데이터**가 발견되었습니다.

### 발생했던 에러 로그
```text
error: null value in column "start_time" of relation "pomodoros" violates not-null constraint
detail: 'Failing row contains (ecf9f079-..., 06599eb6-..., 120, null, 8/13/2025, f, null, null, null).'
```

---

## 2. 해결 및 Fallback 처리 원칙

데이터 유실 없이 모든 뽀모도로 기록을 보존하기 위해, ETL 스크립트(`migratePomodoros`)에서 3단계 Fallback 전략을 적용합니다:

```typescript
// src/database-migration/migrate.ts
const startTime =
  typeof doc.startTime === 'number' && !isNaN(doc.startTime)
    ? doc.startTime // 1순위: 정상 타임스탬프
    : doc.date && !isNaN(Date.parse(doc.date))
    ? new Date(doc.date).getTime() // 2순위: date 문자열 파싱
    : 0; // 3순위: 기본값 0
```

1. **1순위 (정상 데이터)**: MongoDB 문서에 유효한 숫자형 `doc.startTime`이 존재하면 그대로 사용합니다.
2. **2순위 (startTime 누락 레거시)**: `doc.date`(예: `'8/13/2025'`) 문자열을 파싱하여 해당 날짜의 00:00:00 UTC 밀리초 타임스탬프로 변환합니다.
3. **3순위 (date마저 없는 경우)**: `0` (1970-01-01T00:00:00Z)을 기본값으로 할당하여 PostgreSQL의 `NOT NULL` 제약조건을 만족시킵니다.

---

## 3. TimerSession 매칭 시의 처리 정책

원래 MongoDB에서 `startTime`이 `null`이었던 레거시 뽀모도로는 정확한 초 단위 세션 시작 시각을 알 수 없으므로, **억지로 특정 `timer_sessions`에 매칭하지 않고 `timerSessionId = NULL`로 유지**합니다:

```typescript
if (isDummy || doc.startTime === null || doc.startTime === undefined) {
  if (isDummy) dummyCount++;
  else unmatchedCount++;
  // timerSessionId = null 유지 (억지 연결 방지)
} else {
  // 정상 범위 매칭: [session.startTime, session.endTime)
  const candidates = userSessions.filter(
    (s) => s.startTime <= startTime && startTime < s.endTime,
  );
  if (candidates.length === 1) {
    timerSessionId = candidates[0].id;
    matchedCount++;
  }
}
```

---

## 4. TimerSessions (`todayrecords`)의 Null-Safety 방어 로직

`todayrecords` 컬렉션의 세션 데이터 역시 동일한 이유로 시작/종료 시각이 누락될 수 있으므로, `migrateTimerSessions`에서 다음과 같이 방어 코드를 작성하여 안전성을 확보했습니다:

```typescript
const sessionStartTime =
  typeof doc.startTime === 'number' && !isNaN(doc.startTime)
    ? doc.startTime
    : 0;

const sessionEndTime =
  typeof doc.endTime === 'number' && !isNaN(doc.endTime)
    ? doc.endTime
    : sessionStartTime;
```
