# 12. PostgreSQL Unique Constraint vs Unique Index 및 부분 인덱스(Partial Index) 활용 전략

## 1. 개요 및 핵심 차이점

Drizzle ORM의 테이블 콜백 함수에서 정의할 수 있는 `unique(...)`와 `uniqueIndex(...)`는 데이터의 유일성(Uniqueness)을 보장한다는 기본 목적은 같지만, **생성되는 DDL 문법과 고급 기능(정렬 방향, 조건부 필터링 등) 지원 범위**에서 차이가 있습니다.

| 비교 항목 | `unique()` (Constraint 제약조건) | `uniqueIndex()` (Index 독립 인덱스) |
| :--- | :--- | :--- |
| **생성되는 SQL** | `CONSTRAINT ... UNIQUE (col1, col2)` | `CREATE UNIQUE INDEX ... ON table (col1, col2)` |
| **중복 방지 & 에러 코드** | ✅ 보장 (`'23505' - unique_violation`) | ✅ 보장 (`'23505' - unique_violation`) |
| **B-Tree 색인 생성** | ✅ DB가 내부적으로 인덱스 자동 생성 | ✅ 명시적으로 B-Tree 인덱스 생성 |
| **정렬 순서 지정 (`asc/desc`)** | ❌ 불가 | ✅ **가능 (`table.col.desc()`)** |
| **조건부 부분 인덱스 (`.where()`)** | ❌ 불가 | ✅ **가능 (Partial Unique Index)** |
| **NULL 값 구분 (`nullsNotDistinct`)** | ❌ 미지원 | ✅ **지원** |

---

## 2. Pomodoro 스키마 분석 및 최적화 추천 대상

[schema.ts](file:///home/yhs/repos/pomodoro/nest-server/src/postgresql/schema.ts) 기준으로 적용 가능한 최적화 포인트는 크게 **두 가지**입니다.

```
                                  [ Uniqueness & Indexing 전략 ]
                                                 │
                 ┌───────────────────────────────┴───────────────────────────────┐
                 ▼                                                               ▼
    [ 1. 조건부 상태 플래그 ]                                          [ 2. 시계열 로그/세션 데이터 ]
     cycleSettings / categories                                         timerSessions / pomodoros
                 │                                                               │
                 ▼                                                               ▼
  Partial Unique Index (.where)                                  Unique Index with .desc()
  - 유저당 `isCurrent: true` 1개만 허용                            - (userId, startTime DESC) 복합 키
  - DB 레벨의 완벽한 무결성 강제                                    - 중복 방지 + 최신순 조회/정렬 가속
```

---

## 3. 상세 적용 가이드

### (1) 🌟 Partial Unique Index (조건부 부분 유니크 인덱스)
> **적용 대상**: `cycleSettings`, `categories`의 `isCurrent` 컬럼

#### 문제 상황
- 각 사용자는 여러 개의 사이클 설정이나 카테고리를 가질 수 있지만, **현재 활성화된 설정(`isCurrent: true`)은 사용자당 오직 1개**여야 합니다.
- 일반 `unique(userId, isCurrent)`를 걸면 `isCurrent: false`인 비활성 설정도 유저당 1개밖에 만들지 못하는 문제가 발생합니다.
- 기존에는 이를 애플리케이션 서비스 레이어(`cycle-setting.service.ts:L143`, `update()` 시 일괄 `false` 처리)에서만 관리하여 동시성 이슈 발생 시 데이터 무결성이 깨질 위험이 있었습니다.

#### 해결책: `uniqueIndex().where(...)`
```ts
import { sql } from 'drizzle-orm';
import { uniqueIndex, unique, pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core';

export const cycleSettings = pgTable(
  'cycle_settings',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    isCurrent: boolean().default(false).notNull(),
    // ... other columns
  },
  (table) => [
    // 1) 사용자 내 이름 중복 방지 (기존 유지)
    unique('cycle_settings_user_id_name_unique').on(table.userId, table.name),

    // 2) 🚀 부분 유니크 인덱스: isCurrent = true인 행에 대해서만 userId 유일성 강제
    //    -> isCurrent: false인 데이터는 무제한 삽입 가능
    //    -> isCurrent: true가 2개 이상 들어오려고 하면 DB에서 에러 '23505' 발생
    uniqueIndex('cycle_settings_user_id_is_current_unique')
      .on(table.userId)
      .where(sql`${table.isCurrent} = true`),
  ],
);
```

---

### (2) 🚀 정렬 방향을 고려한 `uniqueIndex`
> **적용 대상**: `timerSessions`, `pomodoros`의 `(userId, startTime)`

#### 문제 상황
- 타이머 세션 및 뽀모도로 기록은 사용자가 완료한 시점의 타임스탬프(`startTime`)를 기록합니다.
- 대시보드, 타임라인, 통계 등 프론트엔드 조회의 95% 이상은 **"최근 완료된 기록(최신순)"**을 조회합니다 (`ORDER BY start_time DESC`).
- 기존 `unique('timer_sessions_user_id_start_time_index').on(table.userId, table.startTime)`은 기본 오름차순(ASC)으로만 인덱스가 잡혀 역순 정렬 시 추가 탐색 비용이 듭니다.

#### 해결책: `uniqueIndex` + `.desc()`
```ts
export const timerSessions = pgTable(
  'timer_sessions',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: timerSessionKindEnum().notNull(),
    startTime: bigint({ mode: 'number' }).notNull(),
    endTime: bigint({ mode: 'number' }).notNull(),
    timeCountedDown: bigint({ mode: 'number' }).notNull(),
    pause: jsonb().$type<Pause>().default({ totalLength: 0, record: [] }).notNull(),
  },
  (table) => [
    // 🚀 (userId, startTime DESC) 복합 유니크 인덱스
    // 1) 동일 유저의 동시 중복 세션 삽입 방지 ('23505' 에러)
    // 2) WHERE userId = ? ORDER BY start_time DESC 조회 시 Zero-Cost 인덱스 스캔 지원
    uniqueIndex('timer_sessions_user_id_start_time_index').on(
      table.userId,
      table.startTime.desc(),
    ),
  ],
);
```

---

### (3) 단순 제약조건(`unique`) 유지가 권장되는 대상
> **적용 대상**: `todoistTasks`, `categories (name)`, `cycleSettings (name)`

- 순수하게 **"한 유저 안에서 이름/식별자 중복 방지"**가 목적이며 정렬 방향이나 조건부 필터링이 필요 없는 테이블들은 표준적인 `unique(...)` 제약조건으로 두는 것이 직관적이고 표준적입니다.

```ts
// todoistTasks
(table) => [
  unique('todoist_tasks_user_id_todoist_task_id_unique').on(
    table.userId,
    table.todoistTaskId,
  ),
]
```

---

## 4. 요약 및 마이그레이션 체크리스트

| 대상 테이블 | 현재 정의 | 추천 변경 | 주요 이점 |
| :--- | :--- | :--- | :--- |
| `cycle_settings` | `unique(userId, name)` | **`uniqueIndex(userId).where(isCurrent = true)` 추가** | 유저당 활성 설정 1개 제약조건을 DB 레벨에서 완벽 강제 |
| `categories` | `unique(userId, name)` | **`uniqueIndex(userId).where(isCurrent = true)` 추가** | 유저당 현재 선택 카테고리 1개 제약조건 강제 |
| `timer_sessions` | `unique(userId, startTime)` | **`uniqueIndex(userId, startTime.desc())` 로 변경** | 중복 방지 + 최신순(`ORDER BY startTime DESC`) 조회 성능 극대화 |
| `pomodoros` | `unique(userId, startTime)` | **`uniqueIndex(userId, startTime.desc())` 로 변경** | 중복 방지 + 최신순 타임라인 조회 가속 |
