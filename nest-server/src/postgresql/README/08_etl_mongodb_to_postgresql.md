# 08. MongoDB에서 PostgreSQL로 이전하는 ETL 가이드

## 이 문서의 목적

이 문서는 MongoDB Atlas의 기존 데이터를 Docker PostgreSQL로 옮길 때 사용하는 ETL의 의미, 설계 원칙, 구현 순서와 검증 방법을 기록한다.

몇 년 뒤 다시 읽더라도 다음 질문에 답할 수 있어야 한다.

- ETL이 무엇인가?
- 단순히 JSON을 복사하는 것과 무엇이 다른가?
- MongoDB ObjectId를 PostgreSQL UUID와 어떻게 연결하는가?
- 어떤 테이블부터 INSERT해야 하는가?
- 데이터가 많을 때 메모리와 transaction은 어떻게 관리하는가?
- 중간에 실패해도 안전하게 다시 실행하려면 어떻게 해야 하는가?
- 이전 결과가 맞다는 것을 어떻게 검증하는가?
- API를 MongoDB에서 PostgreSQL로 전환하는 시점은 언제인가?

관련 문서:

- `05_user_schema_migration_analysis.md`
- `07_schema_application_vs_pg_module.md`
- `connect_sessions_table_and_pomodoros.md`

## ETL이란 무엇인가

ETL은 다음 세 단어의 약자다.

```text
Extract   추출
Transform 변환
Load      적재
```

이 프로젝트에서는 다음 흐름을 의미한다.

```text
MongoDB Atlas
  ↓ Extract: BSON document 읽기
Migration script
  ↓ Transform: PostgreSQL row와 FK 구조로 변환
Docker PostgreSQL
  ↓ Load: 의존성 순서에 따라 INSERT
```

### Extract

원본 시스템에서 데이터를 읽는 단계다. MongoDB Atlas의 `users`, `categories`, `cyclesettings`, `todayrecords`, `pomodoros`, `rooms` collection을 읽는다.

Extract 단계에서는 가능한 한 원본 데이터를 수정하지 않는다. Migration script는 Atlas에 대해 read-only로 동작하는 것이 안전하다.

### Transform

MongoDB document를 PostgreSQL row로 바꾸는 단계다. 이 프로젝트의 핵심 작업 대부분이 여기에 해당한다.

```text
MongoDB userEmail 관계 → PostgreSQL user_id FK
MongoDB ObjectId       → PostgreSQL UUID
embedded cycleStat     → cycle_records의 여러 row
TodayRecord            → timer_sessions row
Pomodoro.taskId        → todoist_tasks의 로컬 UUID FK
누락된 boolean         → 명시적인 기본값
MongoDB Date           → PostgreSQL timestamp
선택한 중첩 object     → JSONB
```

### Load

변환된 row를 PostgreSQL에 INSERT하는 단계다. FK가 있으므로 아무 순서로나 넣을 수 없다. 부모 row를 먼저 넣고, 그 UUID를 참조하는 자식 row를 나중에 넣어야 한다.

## ETL은 JSON 전체 복사가 아니다

MongoDB document를 통째로 JSONB 컬럼 하나에 저장하는 것은 이번 migration의 목표가 아니다.

관계와 검색 조건으로 사용할 값은 PostgreSQL 컬럼과 FK로 분리한다. 애플리케이션에서 하나의 object로 읽고 쓰는 것이 유리한 값만 JSONB로 유지한다.

```text
일반 컬럼 또는 FK
- user_email
- category_id
- cycle_setting_id
- timer_session_id
- todoist_task_id
- duration
- start_time

JSONB
- users.timers_states
- users.task_change_info_array
- users.category_change_info_array
- users.current_cycle_info
- users.goals
- timer_sessions.pause
- todoist_tasks.task_data
```

JSONB를 선택해도 TypeScript의 `$type<T>()`는 compile-time 타입만 제공한다. PostgreSQL이 JSON 내부 구조를 자동 검증하는 것은 아니다. Migration script가 올바른 형태를 만들어야 한다.

## PgModule과 ETL의 관계

Standalone ETL script에는 NestJS `PgModule`이 필요하지 않다.

```text
PgModule
  NestJS Service가 실행 중 PostgreSQL query를 하기 위한 runtime DI module

Standalone ETL script
  MongoDB와 PostgreSQL에 직접 연결하는 일회성 프로그램
```

예상 파일 위치:

```text
nest-server/scripts/migrate-mongodb-to-postgresql.ts
```

스크립트는 다음 환경변수를 사용한다.

```text
MONGODB_URL
DOCKER_POSTGRESQL_URL
```

스크립트 종료 시 MongoDB client와 PostgreSQL Pool을 `finally`에서 반드시 닫아야 한다.

## 작업을 시작하기 전 준비

ETL 전에 PostgreSQL 테이블이 먼저 존재해야 한다.

```bash
docker compose up -d
npm run db:generate
npx drizzle-kit migrate
```

다음 조건도 확인한다.

- `drizzle.config.ts`가 `src/postgresql/schema.ts`를 가리킨다.
- target URL이 운영 PostgreSQL이 아니라 의도한 Docker DB인지 확인한다.
- Atlas backup 또는 snapshot이 준비되어 있다.
- 원본 Atlas 데이터에 쓰기 작업을 하지 않는 계정을 가능하면 사용한다.
- migration 중 오류와 누락 데이터를 저장할 audit 방법을 정한다.
- target DB를 삭제하고 처음부터 재실행할 수 있는 rehearsal 환경을 먼저 사용한다.

Migration script 시작 시 target DB 이름과 host를 출력하고 사용자가 의도하지 않은 DB에는 실행하지 않도록 방어 코드를 두는 것이 좋다. Connection URL과 token 전체는 로그에 출력하지 않는다.

## 명시적인 변환 함수를 사용한다

MongoDB document 전체를 spread하여 INSERT하면 안 된다.

```ts
// 잘못된 방식
await db.insert(users).values({
  ...mongoUser,
});
```

MongoDB에는 `_id`, `__v`, embedded reference 배열처럼 PostgreSQL에 없는 값이 있다. 이름이 같아도 의미나 타입이 다른 필드가 있을 수 있다.

각 테이블마다 명시적인 mapper를 작성한다.

```ts
function mapMongoUserToPostgresUser(mongoUser: MongoUser) {
  return {
    id: crypto.randomUUID(),
    firebaseUid: mongoUser.firebaseUid,
    userEmail: mongoUser.userEmail,
    userNickname: mongoUser.userNickname ?? null,
    todoistAccessToken: mongoUser.todoistAccessToken ?? null,
    isTodoistIntegrationEnabled: mongoUser.isTodoistIntegrationEnabled ?? false,
    currentTaskId: mongoUser.currentTaskId ?? '',
  };
}
```

Mapper는 pure function으로 만들면 DB 없이 unit test하기 쉽다.

## ObjectId를 UUID로 변환하는 방법

MongoDB는 document 관계에 ObjectId를 사용하고 PostgreSQL 스키마는 UUID를 사용한다. Category의 Mongo ObjectId를 버리고 임의 UUID만 만들면, Pomodoro가 어떤 Category를 참조해야 하는지 알 수 없다.

따라서 이전 ID와 새 ID 사이의 mapping이 필요하다.

```text
MongoDB ObjectId                PostgreSQL UUID
65f0... category        →       50ec... category
65f1... cycle setting   →       a038... cycle setting
65f2... TodayRecord     →       2881... timer session
```

Mapping 대상:

- Mongo User 식별자 또는 userEmail → PostgreSQL User UUID
- Mongo Category ObjectId → PostgreSQL Category UUID
- Mongo CycleSetting ObjectId → PostgreSQL CycleSetting UUID
- Mongo TodayRecord ObjectId → PostgreSQL TimerSession UUID
- Mongo Room ObjectId → PostgreSQL Room UUID
- Todoist 외부 Task ID와 User → PostgreSQL TodoistTask UUID

작은 데이터라면 `Map<string, string>`을 메모리에 유지할 수 있다. 데이터가 많고 migration을 재실행해야 한다면 임시 mapping table이 더 안전하다.

```sql
CREATE TABLE migration_id_map (
  entity_type text NOT NULL,
  mongo_id text NOT NULL,
  postgres_id uuid NOT NULL,
  PRIMARY KEY (entity_type, mongo_id)
);
```

이 테이블은 application domain table이 아니라 ETL audit 및 재실행을 위한 임시 도구다. Migration 검증과 최종 전환이 끝난 뒤 제거할 수 있다.

## Load 순서

현재 스키마의 FK 의존성을 고려한 기본 순서는 다음과 같다.

```text
1. users
2. rooms
3. categories
4. cycle_settings
5. cycle_records
6. timer_sessions
7. todoist_tasks
8. pomodoros
9. todoist_tasks.total_focus_duration 재계산
```

`rooms`는 다른 domain table을 참조하지 않으므로 실제로는 어느 부모 단계에서도 이전할 수 있다.

### Users

다른 사용자 소유 데이터가 참조하는 부모다. `userEmail`로 기존 document를 찾아 새 UUID mapping을 만든다.

Migration 시 nullable과 default를 코드에서 명시적으로 정규화한다.

```ts
const isEnabled = mongoUser.isTodoistIntegrationEnabled ?? false;
const currentTaskId = mongoUser.currentTaskId ?? '';
```

### Categories

MongoDB의 `userEmail`을 PostgreSQL `userId`로 바꾼다. Mongo Category ObjectId와 새 UUID mapping을 보존하여 Pomodoro의 `categoryId`를 연결한다.

`(userId, name)` unique 제약에 충돌하는 중복 Category가 있는지 INSERT 전에 검사한다.

### CycleSettings와 CycleRecords

MongoDB `CycleSetting`의 embedded `cycleStat` 배열을 분리한다.

```text
CycleSetting document 1개
  → cycle_settings row 1개
  → cycle_records row 0개 이상
```

먼저 `cycle_settings.id`를 만든 후 각 `cycle_records.cycleSettingId`에 넣는다. `(userId, name)` 중복도 사전에 검사한다.

### TimerSessions

MongoDB `TodayRecord`를 PostgreSQL `timer_sessions`로 옮긴다.

Pause는 빠른 migration을 위해 JSONB로 유지한다.

```ts
type Pause = {
  totalLength: number;
  record: Array<{ start: number; end: number }>;
};
```

일부 seed 또는 오래된 데이터에 `pause.pause` 형태가 있을 수 있으므로 flat shape으로 정규화한다.

`timeCountedDown`은 기존 코드 경로에 따라 단위가 다를 가능성이 있다. 원본 값, 추정 단위, 정규화 결과를 audit하고 임의로 조용히 변환하지 않는다.

### TodoistTasks

기존 Pomodoro에는 Todoist 외부 `taskId`만 있고 Task 전체 object는 없을 수 있다. `(userId, todoistId)`별 로컬 Task UUID가 필요하다.

과거 Task가 Todoist API에서 더 이상 조회되지 않을 수 있으므로 legacy placeholder를 허용하려면 `taskData`가 nullable이어야 한다.

```text
todoist_id: 기존 Pomodoro.taskId
task_data: NULL
is_active: false
```

이후 Todoist Sync가 Task를 다시 찾으면 `taskData`를 채우고 `isActive`를 갱신한다.

### Pomodoros

User, Category, TimerSession, TodoistTask mapping이 준비된 후 마지막에 넣는다.

```text
Mongo userEmail          → userId
Mongo category ObjectId  → categoryId
Mongo taskId string      → todoistTaskId
시간 범위로 찾은 session  → timerSessionId
```

## TimerSession과 Pomodoro 연결

기존 MongoDB에는 직접 FK가 없으므로 같은 사용자의 시간 범위로 추론한다.

```text
session.kind == 'pomo'
session.startTime <= pomodoro.startTime
pomodoro.startTime < session.endTime
```

후보 개수에 따라 처리한다.

| 후보             | 처리                                    |
| ---------------- | --------------------------------------- |
| 정확히 1개       | 해당 `timerSessionId` 설정              |
| 0개              | 레거시 unmatched로 기록하고 `NULL` 유지 |
| 2개 이상         | ambiguous로 기록하고 자동 연결하지 않음 |
| `isDummy = true` | 자동 연결 대상에서 제외                 |

세부 규칙과 audit 방법은 `connect_sessions_table_and_pomodoros.md`를 참고한다.

## 데이터가 많을 때의 Extract 방식

다음 코드는 모든 document를 한 번에 메모리에 올리므로 데이터가 많을 때 피한다.

```ts
const allPomodoros = await collection.find().toArray();
```

MongoDB cursor와 batch 처리를 사용한다.

```ts
const cursor = collection.find({}).batchSize(1_000);

for await (const document of cursor) {
  // transform and append to current batch
  // flush when batch reaches the chosen size
}
```

PostgreSQL도 한 row씩 INSERT하지 않고 적절한 batch로 넣는다.

```ts
await db.insert(pomodoros).values(batch);
```

초기 batch size는 500~1,000 정도로 시작하고 실제 row 크기와 메모리 사용량을 측정하여 조정한다. JSONB가 큰 테이블은 더 작은 batch가 안전할 수 있다.

## Transaction 전략

전체 migration을 하나의 거대한 transaction으로 묶으면 중간 실패 시 모두 rollback할 수 있지만 다음 문제가 있다.

- transaction이 너무 오래 유지됨
- lock과 WAL 사용량 증가
- 실패 시 처음부터 다시 처리해야 함
- 대량 메모리와 긴 복구 시간

반대로 row마다 transaction을 사용하면 매우 느리다.

권장 시작점은 논리 단위 또는 batch 단위 transaction이다.

```text
Users batch transaction
Categories batch transaction
CycleSetting 하나와 해당 CycleRecords transaction
TimerSessions batch transaction
Pomodoros batch transaction
```

부모와 자식이 반드시 함께 성공해야 하는 경우에는 같은 transaction으로 묶는다.

## 재실행 가능성과 Idempotency

ETL은 첫 실행에서 완벽하게 성공한다고 가정하면 안 된다. 중간 실패 후 안전하게 다시 실행할 수 있어야 한다.

Idempotent하다는 것은 같은 입력으로 script를 다시 실행해도 데이터가 중복되지 않고 같은 결과가 된다는 뜻이다.

가능한 방법:

- migration mapping table에 처리한 Mongo `_id` 기록
- unique key를 기준으로 `ON CONFLICT DO UPDATE` 또는 `DO NOTHING` 사용
- batch 처리 완료 checkpoint 기록
- rehearsal에서는 target DB를 비우고 처음부터 재실행
- INSERT와 mapping 기록을 같은 transaction에 저장

무조건 `DO NOTHING`을 사용하면 변환 오류를 숨길 수 있다. Conflict가 예상된 것인지 audit log에 남긴다.

## Source of Truth와 파생 값

Pomodoro row가 집중 시간의 원본 데이터다.

```text
pomodoros = source of truth
todoist_tasks.totalFocusDuration = cached aggregate
```

Pomodoro 이전이 끝난 후 Task별 누적 시간을 PostgreSQL에서 다시 계산한다. MongoDB의 기존 tracking 값과 비교할 수 있지만 그대로 신뢰하여 복사할 필요는 없다.

개념적인 SQL은 다음과 같다.

```sql
UPDATE todoist_tasks AS task
SET total_focus_duration = COALESCE((
  SELECT SUM(p.duration)
  FROM pomodoros AS p
  WHERE p.todoist_task_id = task.id
), 0);
```

향후 API에서는 Pomodoro INSERT와 cached aggregate 증가를 같은 transaction에서 처리한다.

## 검증은 ETL의 일부다

에러 없이 script가 끝났다는 사실만으로 migration이 성공한 것은 아니다. 검증도 ETL 구현에 포함한다.

### Row count

MongoDB document 수와 PostgreSQL row 수를 비교한다.

단순히 항상 같아야 하는 것은 아니다. Embedded array를 별도 테이블로 나누거나 duplicate를 제거하면 예상 count 공식이 달라진다.

```text
Mongo users 수             ≈ PostgreSQL users 수
Mongo categories 수        ≈ PostgreSQL categories 수
Mongo cycleStat 원소 총합  ≈ PostgreSQL cycle_records 수
Mongo TodayRecords 수      ≈ PostgreSQL timer_sessions 수
Mongo Pomodoros 수         ≈ PostgreSQL pomodoros 수
```

제외한 invalid/dummy/duplicate row가 있다면 수와 이유를 audit에 남긴다.

### NULL과 FK

다음 값을 확인한다.

- 필수 컬럼에 예상하지 않은 NULL이 없는가?
- 모든 Category와 CycleRecord가 올바른 부모를 참조하는가?
- nullable `timerSessionId`가 몇 개인가?
- nullable `todoistTaskId`가 몇 개인가?
- 다른 사용자의 Category, Task, Session을 잘못 참조하지 않는가?

### Unique constraint

다음 중복을 사전에 확인한다.

```text
users.firebaseUid
users.userEmail
categories(userId, name)
cycleSettings(userId, name)
todoistTasks(userId, todoistId)
```

`pomodoros.startTime`은 unique key가 아니다. 같은 사용자에게도 같은 timestamp를 가진 여러 Pomodoro가 존재할 수 있다.

### Sample comparison

무작위 사용자 몇 명을 선택하여 Atlas와 PostgreSQL을 수동 비교한다.

- Category 이름과 색상
- CycleSetting 값과 CycleRecord 수
- 오늘과 과거 Pomodoro 총 duration
- Timeline session과 pause JSONB
- Todoist Task별 누적 집중 시간
- Room 이름과 permanent 설정

### Aggregate comparison

사용자별, 날짜별, Category별 Pomodoro 합계를 양쪽 DB에서 계산하여 비교한다. 개별 row만 비교하는 것보다 누락된 batch를 발견하기 쉽다.

## 오류 처리와 Audit

잘못된 document 하나 때문에 전체 migration을 중단할지, 격리하고 계속할지 정책을 정한다.

권장 방식:

```text
Schema 또는 FK를 깨는 필수 부모 오류
  해당 논리 단위 rollback 후 audit, 전체 작업 중단 여부 판단

복구할 수 없는 legacy session 연결
  Pomodoro는 보존하고 timerSessionId를 NULL로 둔 뒤 audit

선택 필드 형식 오류
  명시적인 fallback 적용 후 원본 ID와 이유를 audit
```

Audit record 예시:

```ts
type MigrationAudit = {
  entityType: string;
  mongoId: string;
  status: 'migrated' | 'skipped' | 'unmatched' | 'ambiguous' | 'failed';
  reason?: string;
  postgresId?: string;
};
```

로그에는 access token, MongoDB URL, PostgreSQL password 같은 secret을 남기지 않는다.

## Rehearsal과 최종 Cutover

API가 계속 Mongoose를 사용하면 Atlas는 계속 변경되고 PostgreSQL snapshot은 곧 오래된 데이터가 된다. 첫 ETL은 최종 전환이 아니라 rehearsal이다.

권장 단계:

```text
1. Docker PostgreSQL에 전체 ETL rehearsal
2. 결과 검증과 mapper 수정
3. target DB 초기화 후 반복 실행
4. ETL 실행 시간 측정
5. API의 Service를 Drizzle로 전환할 준비
6. 최종 cutover 직전 MongoDB write 중지
7. 마지막 전체 ETL 또는 검증된 delta ETL
8. PostgreSQL API 활성화
9. 일정 기간 Atlas를 read-only backup으로 보존
```

현재 MongoDB schema 중 다수는 `updatedAt`이 없다. 모든 변경분을 안전하게 찾는 delta migration은 생각보다 어렵다. 빠르고 안전한 전환이 목표라면 짧은 maintenance window 동안 write를 중지하고 최종 전체 ETL을 다시 실행하는 방식이 단순하다.

## 구현 구조 예시

실제 script는 역할별로 나눈다.

```text
scripts/migration/
  migrate-mongodb-to-postgresql.ts
  connections.ts
  id-map.ts
  audit.ts
  extractors/
  transformers/
  loaders/
  validators/
```

처음부터 너무 많은 abstraction을 만들 필요는 없다. 다만 다음 책임은 코드에서 구분하는 것이 좋다.

```text
Extract: MongoDB cursor 관리
Transform: document → row pure function
Load: batch INSERT와 transaction
Mapping: 이전 ID → 새 UUID
Audit: skip, 오류, ambiguous 기록
Validation: count, FK, aggregate 비교
```

최상위 실행 흐름의 예시는 다음과 같다.

```ts
async function migrate() {
  const source = await connectMongo();
  const target = await connectPostgres();

  try {
    await assertSafeTarget(target);
    await migrateUsers(source, target);
    await migrateRooms(source, target);
    await migrateCategories(source, target);
    await migrateCycleSettingsAndRecords(source, target);
    await migrateTimerSessions(source, target);
    await migrateTodoistTasks(source, target);
    await migratePomodoros(source, target);
    await rebuildTaskDurationAggregates(target);
    await validateMigration(source, target);
  } finally {
    await source.close();
    await target.end();
  }
}
```

이 코드는 구조를 설명하기 위한 예시다. 실제 구현에서는 각 단계의 batch, transaction, mapping 및 audit 정책을 함께 적용해야 한다.

## 최종 체크리스트

```text
[ ] PostgreSQL schema 검토 완료
[ ] Drizzle migration SQL 생성 및 Docker DB 적용
[ ] Atlas backup 준비
[ ] Target DB 안전 확인 로직 작성
[ ] Mongo ObjectId → UUID mapping 전략 구현
[ ] 명시적인 table별 mapper 구현
[ ] FK 의존 순서에 따른 loader 구현
[ ] Cursor와 batch 처리 구현
[ ] Transaction 경계 결정
[ ] 재실행 및 conflict 정책 구현
[ ] TimerSession/Pomodoro legacy matching audit 구현
[ ] Todoist legacy placeholder 정책 구현
[ ] Row count 검증
[ ] FK/NULL/unique 검증
[ ] Aggregate 검증
[ ] 무작위 사용자 sample 비교
[ ] 전체 실행 시간 측정
[ ] 최종 cutover 및 rollback 계획 작성
```

## 한 문장 요약

ETL은 MongoDB document를 PostgreSQL에 단순 복사하는 작업이 아니라, 원본을 안전하게 읽고 관계형 구조로 명시적으로 변환하여 의존 순서대로 적재한 뒤 그 결과를 검증하고 재실행 가능하게 만드는 전체 과정이다.
