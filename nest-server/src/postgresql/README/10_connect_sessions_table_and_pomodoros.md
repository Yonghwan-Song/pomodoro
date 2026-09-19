# Timer Sessions와 Pomodoros 연결

## 목적

MongoDB의 `TodayRecord`는 이름과 달리 하루 단위 집계가 아니라 Timeline UI에 표시하는 한 번의 타이머 세션이다.

- `kind = 'pomo'`: Focus session
- `kind = 'break'`: Break session
- `pause`: 세션 안에서 일어난 pause 구간
- `pomodoros`: 하나의 Focus session을 Category와 Todoist Task별로 나눈 분석용 기록

한 Focus session 도중 Category나 Todoist Task가 변경되면 여러 Pomodoro document가 만들어질 수 있다. Break session은 Pomodoro를 만들지 않는다.

```text
users 1 ─── 0..N timer_sessions
timer_sessions 1 ─── 0..N pomodoros
```

새 PostgreSQL 구조에서는 `TodayRecord`보다 `timerSessions`라는 이름이 실제 의미를 더 잘 나타낸다.

---

## 기존 MongoDB 데이터의 문제

MongoDB의 `todayrecords`와 `pomodoros`에는 서로를 직접 참조하는 ID가 없다. 두 collection의 저장 요청도 독립적으로 실행되므로 기존 데이터는 timestamp를 이용하여 관계를 추론해야 한다.

관련 스키마:
- `src/schemas/todayRecord.schema.ts`
- `src/schemas/pomodoro.schema.ts`

FE는 Focus session 종료 시 Category 변경, Task 변경, pause 시작/종료 시각을 segment로 변환한다. 그 후 Category와 Task 조합이 바뀌는 구간마다 Pomodoro record를 만든다.

각 Pomodoro의 `startTime`은 다음 중 하나다.
- 전체 Focus session의 `startTime`
- 세션 중 Category가 변경된 timestamp
- 세션 중 Todoist Task가 변경된 timestamp

따라서 정상적으로 생성된 Pomodoro의 `startTime`은 원본 Focus session의 wall-clock 범위 안에 있다. pause는 세션의 `startTime`과 `endTime` 사이에 포함되므로 pause 도중 Task나 Category가 변경된 경우도 같은 규칙으로 찾을 수 있다.

---

## 기존 데이터 연결 규칙

각 Pomodoro에 대해 다음 조건을 만족하는 Focus session을 후보로 찾는다.

```text
Pomodoro.userEmail == TodayRecord.userEmail
TodayRecord.kind == 'pomo'
TodayRecord.startTime <= Pomodoro.startTime
Pomodoro.startTime < TodayRecord.endTime
```

SQL로 표현하면 다음과 같다:

```sql
p.user_id = session.user_id
AND session.kind = 'pomo'
AND p.start_time >= session.start_time
AND p.start_time < session.end_time
```

종료 시각은 포함하지 않는 half-open interval `[startTime, endTime)`을 사용한다. 이전 세션의 `endTime`과 다음 세션의 `startTime`이 같더라도 Pomodoro가 두 세션에 중복 연결되는 것을 방지하기 위해서다.

---

## duration으로 연결하면 안 되는 이유

기존 Pomodoro의 `duration`은 밀리초 단위 segment를 각각 분 단위로 내림한 값이다.

```ts
Math.floor(segmentDurationInMilliseconds / (60 * 1000));
```

하나의 세션이 여러 Category/Task 구간으로 나뉘면 각 구간에서 반올림 손실이 발생한다. 따라서 다음 값은 일반적으로 정확히 일치하지 않는다.

```text
SUM(pomodoros.duration) != TodayRecord.timeCountedDown
```

`TodayRecord.timeCountedDown`도 기존 코드 경로에 따라 밀리초, 분 또는 seed 데이터의 초 단위가 섞였을 가능성이 있으므로 관계를 찾는 기준으로 사용하지 않는다.

`date` 역시 문자열 형식과 timezone 영향을 받으므로 보조 검증 외에는 사용하지 않는다.

---

## 후보 개수별 처리

각 Pomodoro에 대해 시간 범위를 만족하는 논리적 Focus session의 개수를 계산한다.

| 후보 개수 | 처리 | 설명 |
| :--- | :--- | :--- |
| **1** | **자동으로 연결** | `timerSessionId = session.id` |
| **0** | **`legacy-unmatched`로 기록하고 FK를 `NULL`로 유지** | 과거 삭제 로직(`deleteRecordsBeforeToday`)으로 세션이 이미 DB에서 삭제된 경우 |
| **2 이상** | **`ambiguous`로 기록하고 자동 연결하지 않음 (`NULL`)** | 서로 다른 세션의 시간 범위가 중복되어 관계를 확정할 수 없는 경우 |
| **`isDummy = true`** | **연결 대상에서 제외 (`NULL`)** | TodayRecord와 별개로 생성된 더미 데이터 |

---

## 복구할 수 없는 기존 데이터의 원인

다음 경우에는 두 collection만으로 원래 관계를 정확히 복원할 수 없다.

- 과거 `deleteRecordsBeforeToday()` 로직으로 `TodayRecord`가 주기적으로 삭제된 경우 (가장 주된 원인: `pomodoros` 5,505개 vs `todayrecords` 1,735개)
- Pomodoro 저장만 성공하고 TodayRecord 저장은 실패한 경우
- TodayRecord 저장만 성공하고 Pomodoro 저장은 실패한 경우
- 독립적인 요청 retry로 document가 중복된 경우
- 동일 사용자의 서로 다른 Focus session이 겹친 경우
- Pomodoro demo endpoint와 TodayRecord seed endpoint로 각각 생성된 dummy 데이터

따라서 레거시 데이터 이전 시 `pomodoros.timerSessionId`는 nullable로 유지하며, 복구할 수 없는 기존 데이터만 `NULL`로 남긴다.

```ts
timerSessionId: uuid().references(() => timerSessions.id),
```

---

## 실제 구현 및 최적화 결과 (`src/database-migration/migrate.ts`)

본 아키텍처 문서를 기반으로 실제 ETL 스크립트에 구현된 상세 내용 및 최적화 기법은 다음과 같다:

### 1. In-Memory 세션 인덱싱 & 고속 구간 검색
- 5,505건의 뽀모도로마다 개별 DB SELECT 쿼리를 날리지 않고, 5단계(`migrateTimerSessions`)에서 추출한 Focus 세션들을 사용자별 Map(`Map<userId, FocusSessionCandidate[]>`)으로 메모리에 인덱싱함.
- 5,505건의 뽀모도로 구간 매칭 연산이 Node.js 메모리 상에서 **10ms 이내**로 초고속 완료됨.

### 2. 레거시 `startTime: null` 방어 로직 (3단계 Fallback)
- MongoDB 레거시 데이터 중 `date: '8/13/2025'`만 존재하고 `startTime: null`인 문서가 발견됨.
- `doc.startTime` (1순위) ➡️ `new Date(doc.date).getTime()` (2순위) ➡️ `0` (3순위)로 Fallback을 적용하여 PostgreSQL `NOT NULL` 제약조건 위반을 방지함.
- 원래 `startTime`이 없었던 문서는 세션 오매칭을 방지하기 위해 `unmatched`로 안전하게 분류함.

### 3. 배치 적재(Batch INSERT) 최적화
- 변환된 5,505건의 뽀모도로 데이터를 **1,000건 단위의 Chunk**로 분할하여 배치 INSERT 실행.
- 전체 데이터 적재를 **1~2초 이내**에 완료.

### 4. 마이그레이션 실행 감사(Audit) 메트릭 출력
- 스크립트 실행 완료 시 콘솔에 아래 통계를 자동 출력하여 데이터 무결성을 검증함:
  - 세션 매칭 성공 개수 (`matchedCount`)
  - 과거 세션 삭제로 인한 미매칭 개수 (`unmatchedCount`)
  - 모호한 중복 세션 개수 (`ambiguousCount`)
  - 더미 데이터 개수 (`dummyCount`)

---

## 앞으로 생성되는 데이터의 구조

앞으로 생성되는 신규 데이터는 timestamp 추론을 사용하지 않고, 타이머 시작 시 클라이언트/서버가 생성한 immutable UUID인 `sessionId`를 트랜잭션 내에서 공유하여 정확한 FK로 직접 연결한다:

```text
timer_sessions.id
       ↑ (FK)
pomodoros.timer_session_id
```

```text
BEGIN
  timer_session INSERT
  pomodoros INSERT (timer_session_id 포함)
  todoist_tasks.totalFocusDuration 원자적 증가
COMMIT
```
