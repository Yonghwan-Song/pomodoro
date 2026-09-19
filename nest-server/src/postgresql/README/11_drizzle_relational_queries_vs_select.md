# Drizzle Relational Queries (`db.query.findFirst`) vs SQL-like (`db.select`) 쿼리 API 비교 가이드

이 문서는 Drizzle ORM에서 단일/다수 레코드를 조회할 때 사용하는 두 가지 쿼리 패러다임(`db.select()` vs `db.query`)의 차이점, 런타임 안전성, 그리고 올바른 사용 기준을 정리한 문서입니다.

---

## 1. 개요 (Overview)

Drizzle ORM은 데이터 조회를 위해 크게 2가지 스타일의 API를 제공합니다:

```typescript
// 스타일 A: SQL-like Query API
const users = await db
  .select({ id: schema.users.id })
  .from(schema.users)
  .where(eq(schema.users.userEmail, userEmail))
  .limit(1);
// 👉 결과: 항상 배열 Array<{ id: string }> 반환

// 스타일 B: Relational Query API (RQB) ⭐
const user = await db.query.users.findFirst({
  where: eq(schema.users.userEmail, userEmail),
  columns: { id: true },
});
// 👉 결과: 단일 객체 { id: string } 또는 undefined 반환
```

---

## 2. 왜 단일 행 조회 시 `db.query.findFirst`가 권장되는가?

### ① 배열 비구조화 할당에 의한 런타임 크래시(Crash) 방지 ⚠️
`db.select()`는 검색 조건에 일치하는 결과가 없으면 **빈 배열 `[]`**을 반환합니다.

```typescript
// ❌ 위험한 코드: 만약 일치하는 유저가 없으면 빈 배열 []이 반환됨
const [{ userId }] = await this.db
  .select({ userId: schema.users.id })
  .from(schema.users)
  .where(eq(schema.users.userEmail, userEmail));
// 👉 TypeError: Cannot read property 'userId' of undefined 에러와 함께 서버 다운!
```

반면 `db.query.users.findFirst()`는 데이터가 없으면 **`undefined`**를 반환하므로 안전하게 예외 처리가 가능합니다:

```typescript
// ⭕ 안전한 코드
const pgUser = await this.db.query.users.findFirst({
  where: eq(schema.users.userEmail, userEmail),
  columns: { id: true },
});

if (!pgUser) {
  throw new NotFoundException(`User with email ${userEmail} not found`);
}
const userId = pgUser.id;
```

---

### ② 단일 객체 반환의 직관성 및 Mongoose/Prisma 유사성
- `db.select()`는 단 1개의 결과를 가져오더라도 무조건 배열(`T[]`)로 감싸서 반환하므로 항상 `[0]` 인덱스나 비구조화 괄호(`[...]`)를 써야 합니다.
- `db.query.findFirst()`는 단일 객체(`T | undefined`)를 즉시 반환하여 코드가 훨씬 간결하고 가독성이 높습니다.

---

### ③ 컬럼 프로젝션(`columns`) 및 중첩 관계 조회(`with`)의 편리함
- **필요한 컬럼만 선택 (Projection)**:
  ```typescript
  columns: { id: true, name: true }
  ```
- **Mongoose의 `populate`와 같은 관계 테이블 자동 결합**:
  ```typescript
  with: {
    cycleSettings: true,
    categories: true,
  }
  ```

---

## 3. 매번 `findFirst`를 사용해도 되는가? (성능 및 기준)

👉 **네, 단일 행 조회 시에는 100% 매번 사용하셔도 되며, Drizzle 공식 문서에서도 권장하는 패턴입니다.**

- **성능**: Drizzle이 내부적으로 최적화된 `SELECT ... WHERE ... LIMIT 1` SQL을 생성하여 PostgreSQL에 전송하므로 `db.select()`와 성능이 100% 동일합니다.

### 📌 선택 기준 요약

| 상황 | 권장 API | 반환 타입 |
| :--- | :--- | :--- |
| **단일 레코드(1건) 조회** | `db.query.테이블명.findFirst()` | `T \| undefined` |
| **단순 목록(N건) 또는 중첩 관계 조회** | `db.query.테이블명.findMany()` | `T[]` |
| **복잡한 JOIN, GROUP BY, 집계 함수(COUNT, SUM 등)** | `db.select().from(...)...` | `Array<...>` |
