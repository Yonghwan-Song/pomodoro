# 03. Drizzle TS 스키마 vs PostgreSQL DB 스키마

Drizzle ORM을 다룰 때 혼동하기 쉬운 **PostgreSQL DB 스키마**와 **Drizzle TypeScript 스키마**의 개념적 차이와 매핑 원리를 정리합니다.

---

## 1. 두 스키마 개념의 차이점

| 구분 | PostgreSQL DB 스키마 (DBeaver에 표시) | Drizzle TS 스키마 (`drizzle({ schema })`) |
| :--- | :--- | :--- |
| **속한 위치** | PostgreSQL 데이터베이스 엔진 내부 | Node.js / TypeScript 애플리케이션 코드 내부 |
| **역할** | DB 내부의 테이블 그룹/네임스페이스 (폴더 역할) | Drizzle ORM의 TS 테이블 구조 및 타입 정의서 묶음 |
| **기본값** | `public` | 엔티티 파일들의 `export *` 객체 |

---

## 2. Drizzle 인스턴스에 `schema` 전달이 필수인 이유

```typescript
import * as schema from './entities/test-record.entity';

const db = drizzle({ client: pool, schema });
```

`drizzle()`에 `schema` 객체를 전달하지 않으면:
1. **Relational Queries 사용 불가:** `db.query.users.findMany({ with: { posts: true } })`와 같은 Drizzle 특유의 관계형 쿼리 빌더를 사용할 수 없습니다.
2. **타입 추론 제한:** 테이블 구조에 대한 TypeScript 자동완성 및 타입 체크를 100% 활용할 수 없고 단순 SQL 실행기 역할만 수행하게 됩니다.

---

## 3. DB 스키마 매핑 원리

### ① 기본 매핑 (`public` 스키마)
Drizzle 코드에서 별도로 DB 스키마를 지정하지 않고 `pgTable()`을 사용하면, PostgreSQL의 기본 스키마인 **`public`** 스키마(DBeaver에서 보이는 `public` 폴더)에 테이블이 매핑됩니다.

```typescript
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

// PostgreSQL의 'public.users' 테이블로 매핑됨
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
});
```

### ② 커스텀 DB 스키마 지정 방법
만약 `public` 외에 별도의 DB 스키마(예: `auth`, `analytics`)에 테이블을 생성하고 싶다면 `pgSchema()`를 사용합니다.

```typescript
import { pgSchema, serial, text } from 'drizzle-orm/pg-core';

// PostgreSQL 내부에 'auth' 스키마(폴더)를 지정
export const authSchema = pgSchema('auth');

// 'auth.users' 테이블로 매핑됨
export const users = authSchema.table('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
});
```
