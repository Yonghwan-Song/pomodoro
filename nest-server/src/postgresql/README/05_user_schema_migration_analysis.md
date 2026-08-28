# 05. User 스키마 (MongoDB -> PostgreSQL) 타입 분류 및 이관 설계 분석

MongoDB `User` 스키마 (`nest-server/src/schemas/user.schema.ts`)의 모든 속성을 **1) 단순 1:1 매핑 기본 타입**과 **2) 설계 논의가 필요한 복잡한 타입** 2가지 분류로 정리한 분석 문서입니다.

---

## 1. 분류 1: 직관적인 1:1 매핑 기본 타입들 (Basic Types)

SQL 컬럼(`varchar`, `text`, `boolean`, `uuid` 등)으로 즉시 1:1 변환할 수 있는 단순 필드입니다.

| MongoDB 필드명                    | TypeScript 타입  | PostgreSQL/Drizzle 추천 타입                        | 비고 / 제약조건       |
| :-------------------------------- | :--------------- | :-------------------------------------------------- | :-------------------- |
| _(신규 PK)_                       | -                | `uuid('id').defaultRandom().primaryKey()`           | RDBMS 표준 기본키(PK) |
| **`firebaseUid`**                 | `string`         | `varchar('firebase_uid', { length: 255 })`          | `NOT NULL`, `UNIQUE`  |
| **`userEmail`**                   | `string`         | `varchar('user_email', { length: 255 })`            | `NOT NULL`, `UNIQUE`  |
| **`userNickname`**                | `string \| null` | `varchar('user_nickname', { length: 255 })`         | Nullable              |
| **`todoistAccessToken`**          | `string \| null` | `text('todoist_access_token')`                      | Nullable              |
| **`isTodoistIntegrationEnabled`** | `boolean`        | `boolean('is_todoist_integration_enabled')`         | `DEFAULT false`       |
| **`currentTaskId`**               | `string`         | `varchar('current_task_id', { length: 255 })`       | Nullable              |
| **`isUnCategorizedOnStat`**       | `boolean`        | `boolean('is_uncategorized_on_stat')`               | `DEFAULT true`        |
| **`colorForUnCategorized`**       | `string`         | `varchar('color_for_uncategorized', { length: 7 })` | `DEFAULT '#f04005'`   |

---

### IMO

- 1)currentTaskId, 2)isUnCategorizedOnStat, 3)colorForUnCategorized 이런것들은 결국 user 데이터를 가져올때 한꺼번에 가져와야 하기 때문에 여기에 편하게 놓은건데 NoSQL에서는... 그런데 관념적으로 어떻게 구분해야하지?..
- 그리고 update 주기도, 1)>>>2)>3) 정도 같음. 1)은 계속 update되지 않나?... 아닌가.. 이거 무엇을 의미하지?
  - 혹시 todoist관련인가...
  - 이 3개의 목적이 지금 궁금하고 얼마나 자주 update되는지 다른 property들에 비해 생명주기가 짧은것 같은데 그냥 우선은 이 user table에 포함시키고 나중에 분리시키는게 좋은건지 궁금.

## 2. 분류 2: 아키텍처/설계 논의가 필요한 복잡한 타입들 (Complex / Ambiguous Types)

중첩 객체, 배열, 외래키 참조 관계가 얽혀 있어 **JSONB 보관**, **테이블 분리(1:N/N:M)**, **컬럼 평탄화(Flattening)** 중 선택이 필요한 필드들입니다.

### ① `cycleSettings` (`ObjectId[]`) & `categories` (`ObjectId[]`)

- **현재 구조:** MongoDB 문서 내부에서 다른 Collection의 ObjectId들을 배열 형태로 참조하고 있음.
- **설계 선택지:**
  - **옵션 A [권장 - RDBMS 정석]:** `categories`와 `cycle_settings`를 별도 독립 테이블로 구성하고, `user_id`를 외래키(FK)로 연결 (1:N 또는 N:M 조인 테이블).
  - **옵션 B:** PostgreSQL `jsonb` 또는 `uuid[]` 배열 컬럼에 ID 목록만 저장.
- **논의 포인트:** RDBMS의 무결성(Referential Integrity)과 JOIN 성능을 활용하려면 **옵션 A(독립 테이블 분리)**가 최선입니다.

---

### ② `autoStartSetting` (`{ doesPomoStartAutomatically, doesBreakStartAutomatically, doesCycleStartAutomatically }`)

- **현재 구조:** 3개의 boolean 설정값을 담은 단일 객체.
- **설계 선택지:**
  - **옵션 A [컬럼 평탄화]:** `users` 테이블 내에 `auto_start_pomo`, `auto_start_break`, `auto_start_cycle` 3개의 boolean 컬럼으로 직접 풀어서 저장.
  - **옵션 B [JSONB]:** `jsonb('auto_start_setting')` 컬럼 하나로 직렬화하여 저장.
- **논의 포인트:** 고정된 3개 boolean 값이므로, 컬럼으로 평탄화(옵션 A)하면 JSON 파싱 오버헤드가 없고 쿼리가 단순해집니다.

#### IMO

cycleSetting도 결국 setting이고 이것도 setting이니까 한데 묶으면 좋아보일 지도 모르는데, cycleSetting은 그 사이클에 묶여잇고, autoStartSetting은 지금 사이클 설정과 관계없이 독립적으로 언제든지 곧바로 적용되는 것이니 굳이 묶지 않는게 좋겠다. 그리고 user말고 다른 table로 빼는게 좋은지도 모르겠다. 어차피 1:1관계인데... 따로 정리해야할 이유가?... 만약 매우 좀 자주 다른 property들과 다른 수준으로 update된다면 모르겠는데... 거의 update 안했음 나는...

#### Criti

update되는 주기가 user와 좀 동떨어져 있는 것 같다.

---

### ③ `timersStates` (`{ duration, pause: { totalLength, record: [...] }, repetitionCount, running, startTime }`)

- **현재 구조:** 실시간 타이머 상태 및 일시정지 기록(중첩 배열 `record: [{ start, end }]`)을 포함한 객체.
- **설계 선택지:**
  - **옵션 A [JSONB 권장]:** 구조가 중첩되어 있고 일시정지 이력 배열이 존재하므로 `jsonb('timers_states')` 컬럼 하나로 다루는 것이 유연함.
  - **옵션 B [별도 타이머 상태 테이블]:** `user_timer_states` 1:1 테이블 분리.
- **논의 포인트:** 유저당 1개의 실시간 뽀모도로 상태이므로 `jsonb`로 저장하는 것이 읽기/쓰기 시 오버헤드를 줄입니다.

#### IMO

- 이것도 뭐... 유저당 1개의 실시간 상태이고 계속 변한다고 하는데, 결국 update주기가 매우 빠름.
  - `isUnCategorizedOnStat, colorForUnCategorized, autoStartSetting 등을 묶어 사용자 설정 전용 테이블로 분리` <-- 이런식으로 고려해보라는데 [POINT]

---

### ④ `currentCycleInfo` (`{ totalFocusDuration, cycleDuration, cycleStartTimestamp, ... }`)

- **현재 구조:** 현재 사이클 진행 상황 5가지 숫자를 포함한 객체.
- **설계 선택지:**
  - **옵션 A [JSONB]:** `jsonb('current_cycle_info')`로 통째로 저장.
  - **옵션 B [컬럼 평탄화]:** `cycle_total_focus_duration`, `cycle_start_timestamp` 등 5개 숫자 컬럼으로 개별 저장.

---

### ⑤ `goals` (`{ weeklyGoal: Goal, dailyGoals: DailyGoals }`)

- **현재 구조:** 주간 목표 및 7일간의 일일 목표 배열(크기 7 고정 객체 배열).
- **설계 선택지:**
  - **옵션 A [JSONB 권장]:** 요일별 목표 배열 구조를 갖추고 있으므로 `jsonb('goals')`로 보관하는 것이 데이터 다루기에 훨씬 용이함.
  - **옵션 B [별도 목표 테이블]:** `user_daily_goals` 테이블을 생성하여 1:N으로 관리.

---

### ⑥ `taskChangeInfoArray` & `categoryChangeInfoArray` (이력/로그 배열)

- **현재 구조:** 유저가 작업/카테고리를 변경할 때마다 기록되는 객체 배열 (`[{ id, taskChangeTimestamp }, ...]`).
- **설계 선택지:**
  - **옵션 A [JSONB]:** 단순 조회/보관용 히스토리라면 `jsonb` 배열 컬럼에 계속 덧붙임(append).
  - **옵션 B [1:N 이력 테이블 분리]:** 통계 쿼리나 변경 이력 조회가 자주 일어난다면 `user_task_change_logs` 1:N 테이블로 분리.
