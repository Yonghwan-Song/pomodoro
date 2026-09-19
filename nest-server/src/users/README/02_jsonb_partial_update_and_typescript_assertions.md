# PostgreSQL JSONB 부분 병합(Merge), Drizzle `sql` 템플릿, 그리고 TypeScript 이중 타입 단언

이 문서는 `UsersModule` 마이그레이션 과정에서 다룬 핵심 데이터베이스 테크닉과 TypeScript 타입 시스템 패턴을 정리한 기술 가이드입니다.

---

## 1. PostgreSQL JSONB 부분 병합 (Shallow Merge)

### 📌 기존 MongoDB vs PostgreSQL JSONB 업데이트 비교
- **MongoDB**: 중첩 객체의 일부 키만 업데이트하려면 기존 문서를 `findOne`으로 읽어와 자바스크립트에서 `for...in`이나 spread(`...`)로 병합 후 `save()`해야 했습니다 (2회 I/O 발생).
- **PostgreSQL JSONB**: PostgreSQL의 네이티브 **`||` (Concatenation/Merge) 연산자**를 사용하면, **사전 `SELECT` 조회 없이 단 1번의 쿼리로 원자적(Atomic) 부분 머지**가 가능합니다.

```typescript
// nest-server/src/users/users.service.ts
const [pgUser] = await this.db
  .update(schema.users)
  .set({
    timersStates: sql`${schema.users.timersStates} || ${JSON.stringify(updateTimersStatesDto)}::jsonb`,
  })
  .where(eq(schema.users.userEmail, userEmail))
  .returning();
```

---

## 2. 문법 완전 정복: `` sql`...` ``, `||`, `::jsonb`

### ① `` sql`...` `` — Tagged Template Literal (styled-components와 동일)
`styled.div`이나 `css`처럼, ES6 자바스크립트 표준 문법인 **태그드 템플릿 리터럴(Tagged Template Literal)**입니다.

- **역할**: Drizzle의 `sql` 함수가 백틱(`` ` ``) 안의 문자열과 `${...}` 변수를 가로챕니다.
- **보안 (SQL Injection 방어)**: `${JSON.stringify(dto)}`를 raw 텍스트로 붙이는 것이 아니라, PostgreSQL의 **안전한 파라미터 바인딩(`$1`)**으로 자동 치환합니다.

```sql
-- Drizzle이 실제로 PostgreSQL에 전송하는 안전한 쿼리:
UPDATE users 
SET timers_states = "users"."timers_states" || $1::jsonb 
WHERE user_email = $2
-- 파라미터 $1 = '{"running":true}'
```

### ② `||` 연산자 — PostgreSQL JSONB 객체 병합
PostgreSQL에서 `jsonb || jsonb`는 두 JSONB 객체의 최상위 키(Top-level Keys)를 병합합니다.
- 자바스크립트의 `{ ...기존객체, ...새로운객체 }`와 동일하게 작동합니다.
- 새로 들어온 키는 추가되고, 이미 존재하는 키는 새로운 값으로 덮어씌워집니다.

### ③ `::jsonb` 연산자 — PostgreSQL 타입 캐스팅(Type Casting)
PostgreSQL에서 `값::타입`은 표준 SQL `CAST(값 AS 타입)`의 축약 표기법입니다.

- `JSON.stringify(dto)`의 결과는 자바스크립트의 **일반 문자열(`text`)**입니다.
- PostgreSQL에서 `jsonb || text`는 에러를 유발하므로, `::jsonb`를 붙여 **"이 텍스트는 JSON 구조를 가진 바이너리 JSONB 객체다"**라고 명시적으로 변환해 주는 것입니다.

---

## 3. TypeScript 이중 타입 단언 (`as unknown as Target`)

### 📌 문제 상황: 가변 배열(`GoalDto[]`) vs 7개 고정 튜플(`DailyGoals`)
- **DTO (`UpdateGoalsDto`)**: `dailyGoals: GoalDto[]` (배열 길이가 컴파일 타임에 정해지지 않음)
- **DB 스키마 (`Goals`)**: `dailyGoals: [Goal, Goal, Goal, Goal, Goal, Goal, Goal]` (정확히 7개 원소 튜플)

TypeScript 컴파일러는 일반 배열이 7개보다 적을 수도 있다고 판단하여 직접 대입(`updateGoalsDto as Goals`) 시 **`TS2352: Conversion may be a mistake`** 에러를 발생시킵니다.

### 📌 해결 원리
```typescript
updateGoalsDto as unknown as schema.Goals
```

1. **`unknown` (Top Type)**: TypeScript의 모든 타입은 `unknown`에 대입할 수 있습니다 (`value as unknown`).
2. **`unknown`에서 타겟 타입으로 다운캐스팅**: `unknown` 타입은 어떤 타겟 타입(`schema.Goals`)으로도 단언할 수 있습니다.
3. **런타임 검증 결합**: DTO에 `@ArrayMinSize(7)`, `@ArrayMaxSize(7)`를 선언하여 런타임에 7개임을 100% 보장한 상태에서 컴파일러에게 확신을 주는 가장 안전하고 표준적인 패턴입니다.

---

## 4. PostgreSQL에서 `userEmail`로 사용자 식별하기

### ① 성능 보장 (UNIQUE B-Tree 인덱스)
- `users` 테이블의 `user_email` 컬럼에는 `UNIQUE` 제약조건이 걸려 있어 PostgreSQL이 자동으로 B-Tree 고유 인덱스를 생성합니다.
- `WHERE user_email = '...'` 쿼리는 Primary Key(`id`) 조회와 동일하게 **$O(\log N)$의 초고속 인덱스 스캔**으로 동작합니다.

### ② 2계층 식별자 아키텍처 (Best Practice)
- **API 및 인증 계층 (Natural Key)**: Firebase/Google OAuth 토큰에서 넘어오는 불변의 `userEmail`로 사용자를 편리하게 조회합니다.
- **데이터베이스 관계 계층 (Surrogate UUID)**: 자식 테이블(`categories`, `cycle_settings`, `pomodoros`, `todoist_tasks`)의 외래키는 불변의 `users.id` (UUID)를 참조하여 완벽한 관계 무결성을 유지합니다.
