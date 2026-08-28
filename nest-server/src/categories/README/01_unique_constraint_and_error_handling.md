# Categories 유니크 제약조건(Unique Constraint)과 에러 처리 아키텍처

이 문서는 `categories` 테이블의 유니크 제약조건 설계 배경, PostgreSQL 에러 코드(`23505`), 그리고 Drizzle 쿼리 시 `await ... .catch()` 체이닝을 지양하고 `try-catch`를 사용하는 이유를 정리한 문서입니다.

---

## 1. 유니크 제약조건(Unique Constraint) vs 유니크 인덱스(Unique Index)

```typescript
// PostgreSQL schema.ts
export const categories = pgTable('categories', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar({ length: 255 }).notNull(),
  color: varchar({ length: 7 }).notNull(),
}, (table) => [
  unique('categories_user_id_name_unique').on(table.userId, table.name),
]);
```

### 📌 개념과 물리적 동작의 차이
- **개념적**: `unique(...)`는 "동일한 유저(`userId`) 안에서 중복된 카테고리 이름(`name`)을 허용하지 않는다"는 **비즈니스 무결성 규칙(Constraint)**입니다.
- **물리적**: PostgreSQL 엔진은 이 제약조건을 $O(\log N)$ 속도로 즉시 검증하기 위해 **백그라운드에서 동일한 이름의 `Unique B-Tree Index`를 자동으로 생성**합니다.
- 따라서 제약조건을 선언하는 것만으로 **중복 방지와 초고속 검색 인덱스 혜택**을 동시에 얻게 됩니다.

---

## 2. 제약조건 위배 시 에러 처리 흐름

중복된 카테고리 이름으로 INSERT 또는 UPDATE를 시도하면 각 DB 엔진은 고유한 에러 코드를 반환합니다:

| 데이터베이스 | 에러 코드 | 의미 |
| :--- | :--- | :--- |
| **MongoDB (Mongoose)** | `11000` | Duplicate Key Error |
| **PostgreSQL** | `'23505'` | `unique_violation` (Unique Constraint Violated) |

### 📌 백엔드 처리 코드 ([categories.service.ts](file:///home/yhs/repos/pomodoro/nest-server/src/categories/categories.service.ts))
```typescript
try {
  // DB 연산 수행
} catch (error: any) {
  if (error.code === 11000 || error.code === '23505') {
    throw new ConflictException(
      `Category with name '${createCategoryDto.name}' already exists for this user.`,
    );
  }
  throw error;
}
```
- NestJS는 `ConflictException`을 받아 클라이언트(FE)에 HTTP **`409 Conflict`** 상태 코드를 일관되게 반환합니다.

---

## 3. 왜 `returning().catch(...)` 체이닝 대신 `try-catch`를 써야 하는가?

```typescript
// ❌ 안티패턴: await와 .catch()의 혼용
const [insertedCategory] = await this.db
  .insert(schema.categories)
  .values(...)
  .returning()
  .catch((err) => {});
```

### ⚠️ 문제점 3가지
1. **배열 비구조화 시 2차 런타임 크래시 발생**:
   - `.catch((err) => {})` 콜백이 아무것도 반환하지 않으면 에러 발생 시 프로미스의 해결값(Resolved Value)은 **`undefined`**가 됩니다.
   - 이때 `const [insertedCategory] = undefined` 비구조화가 실행되면서 `TypeError: Cannot read property of undefined` 에러로 **서버 프로세스가 다운**됩니다.
2. **비동기 제어 흐름의 불투명성**:
   - 현대 TypeScript/JavaScript에서는 `await`를 사용할 때 **`try-catch` 블록으로 일관되게 감싸는 것**이 표준입니다.
   - 내부의 인라인 `.catch()`는 에러를 삼켜버려(swallow) 외부 `try-catch`나 로거가 에러 발생 사실을 추적하지 못하게 만듭니다.
3. **Shadow Run 아키텍처 일관성**:
   - Drizzle 코드를 `try { ... } catch (err) { console.error('[ShadowDiff Error]', err); }` 블록 안에 두면, INSERT 도중 어떤 오류가 발생해도 안전하게 로깅되고 메인 Mongoose 흐름에 악영향을 주지 않습니다.

---

## 4. 공식 레퍼런스 링크

- [Drizzle ORM: Indexes & Constraints 공식 문서](https://orm.drizzle.team/docs/indexes-constraints#unique)
- [PostgreSQL 공식 문서: Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL Error Codes (Appendix A - 23505 unique_violation)](https://www.postgresql.org/docs/current/errcodes-appendix.html)
