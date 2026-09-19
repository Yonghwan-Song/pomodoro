# 컬럼 평탄화(Flattening), @IsOptional() 데코레이터와 Drizzle의 부분 업데이트 원리

## 1. 배경: MongoDB 중첩 객체 vs PostgreSQL 평탄화 컬럼

### MongoDB (기존)

MongoDB에서는 3개의 자동 시작 설정을 `autoStartSetting`이라는 하나의 중첩 문서(Embedded Document)로 저장했습니다:

```typescript
// Mongoose Schema
autoStartSetting: {
  doesPomoStartAutomatically: boolean;
  doesBreakStartAutomatically: boolean;
  doesCycleStartAutomatically: boolean;
}
```

### PostgreSQL (새로운 스키마)

PostgreSQL에서는 RDBMS의 원자적 컬럼 관리 및 직관적인 인덱싱/쿼리를 위해 3개의 독립된 boolean 컬럼으로 **평탄화(Flattening)**했습니다:

```typescript
// PostgreSQL Schema (src/postgresql/schema.ts)
doesPomoStartAutomatically: boolean().default(false).notNull(),
doesBreakStartAutomatically: boolean().default(false).notNull(),
doesCycleStartAutomatically: boolean().default(false).notNull(),
```

---

## 2. `@IsOptional()` 데코레이터가 갖는 완벽한 하위 호환성

DTO의 각 프로퍼티에 `@IsOptional()`을 달아주면, **현재 프론트엔드 코드(FE)를 단 1줄도 수정하지 않으면서도 미래의 UI 변경까지 완벽하게 대응**할 수 있습니다.

```typescript
// src/users/dto/update-auto-start-setting.dto.ts
export class UpdateAutoStartSettingDto {
  @IsBoolean()
  @IsOptional()
  doesPomoStartAutomatically?: boolean;

  @IsBoolean()
  @IsOptional()
  doesBreakStartAutomatically?: boolean;

  @IsBoolean()
  @IsOptional()
  doesCycleStartAutomatically?: boolean;
}
```

### 🎯 Case A: 현재 프론트엔드 (SAVE 버튼 기반 폼 제출)

- **FE 동작**: 사용자가 3개 토글을 조작한 뒤 하단의 "SAVE" 버튼을 누르면 3개 필드가 한 번에 전달됩니다.
- **DTO 유효성 검사**: 3개 필드가 모두 존재하므로 `@IsBoolean()` 검사를 정상 통과합니다.
- **결과**: **현재 FE 앱과 100% 호환!**

### 🎯 Case B: 미래의 프론트엔드 (토글 클릭 즉시 자동 저장)

- **FE 동작**: 사용자가 "Auto Start Pomo" 스위치 하나만 켰을 때 `{ doesPomoStartAutomatically: true }` 1개 필드만 전송합니다.
- **DTO 유효성 검사**: 나머지 2개 필드가 누락(`undefined`)되어 있어도 `@IsOptional()` 덕분에 유효성 검사 에러(400 Bad Request)가 발생하지 않습니다.
- **결과**: **백엔드 코드를 전혀 수정하지 않고도 미래의 즉시 저장 UI 지원 가능!**

---

## 3. Drizzle ORM `.set(dto)`의 "똑똑한 부분 업데이트" 동작 원리

Drizzle ORM의 `db.update().set(dto)` 메소드는 JavaScript 객체에서 **`undefined` 값을 가진 키를 자동으로 필터링하여 SQL을 생성**합니다.

### 🔍 동작 예시 1: 3개 필드가 모두 전달된 경우

```typescript
// 요청 DTO: { doesPomoStartAutomatically: true, doesBreakStartAutomatically: false, doesCycleStartAutomatically: true }
await db.update(schema.users).set(dto).where(eq(schema.users.userEmail, email));
```

**생성되는 실제 SQL:**

```sql
UPDATE users
SET does_pomo_start_automatically = true,
    does_break_start_automatically = false,
    does_cycle_start_automatically = true
WHERE user_email = 'user@example.com';
```

---

### 🔍 동작 예시 2: 1개 필드만 전달된 경우 (부분 업데이트)

```typescript
// 요청 DTO: { doesPomoStartAutomatically: true } (나머지 2개는 undefined)
await db.update(schema.users).set(dto).where(eq(schema.users.userEmail, email));
```

**생성되는 실제 SQL:**

```sql
UPDATE users
SET does_pomo_start_automatically = true -- 👈 undefined인 컬럼은 SET 절에서 알아서 제외됨!
WHERE user_email = 'user@example.com';
```

---

## 4. `NOT NULL` 제약조건과 충돌하지 않는 이유

PostgreSQL의 `does_pomo_start_automatically` 등은 `NOT NULL` 컬럼이지만, 부분 업데이트 시 에러가 나지 않습니다.

- `UPDATE` 문에서 특정 컬럼이 `SET` 절에 언급되지 않으면, PostgreSQL은 해당 컬럼에 `NULL`을 넣는 것이 아니라 **기존에 DB에 저장되어 있던 원래 값을 그대로 유지**하기 때문입니다.

---

## 5. 결론 및 요약

1. **컬럼 평탄화**: DB는 3개의 boolean 컬럼으로 관리하되, DTO와 Drizzle을 통해 1:1로 직접 매핑합니다.
2. **`@IsOptional()`**: 현재 프론트엔드의 일괄 전송(`SAVE` 버튼)과 향후 개별 전송(단일 토글)을 모두 지원하는 표준 RESTful `PATCH` 패턴입니다.
3. **Drizzle의 `.set()`**: 넘어온 필드만 동적으로 SQL `SET` 절에 포함시켜 기존 데이터를 안전하게 보존합니다.
