# 01. Drizzle 풀 관리 및 초기화 방식 (Pool Management)

## 1. Drizzle ORM PostgreSQL (`node-postgres`) 초기화 3가지 방식

Drizzle ORM에서 `node-postgres`(`pg`) 드라이버를 인스턴스화할 때는 크게 3가지 형태가 존재합니다.

### ① 암시적 풀 (Implicit Pool): `drizzle(DATABASE_URL)`
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
const db = drizzle(process.env.DATABASE_URL);
```
- **특징:** Drizzle 내부에서 입력받은 `DATABASE_URL`을 바탕으로 `new pg.Pool()`을 자동 생성합니다.
- **장점:** 초깃값이 단순하며 빠른 프로토타이핑에 유용합니다.
- **단점:**
  - 풀 크기(`max`), 타임아웃, SSL 옵션 등을 세부 커스텀할 수 없습니다.
  - 생성된 내부 `pg.Pool` 인스턴스 참조를 가져올 수 없어, 서버 종료 시 `pool.end()`를 직접 호출할 수 없습니다.

### ② 명시적 풀 (Explicit Pool): `drizzle({ client: pool, schema })` ⭐ **[권장]**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

const db = drizzle({ client: pool, schema });
```
- **특징:** 개발자가 직접 `pg.Pool` 객체를 생성하고 Drizzle에 전달합니다.
- **권장 이유 (NestJS 프로덕션/개발 환경):**
  1. **Hot-Reload 시 커넥션 누수 방지:** NestJS 개발 모드(`npm run start:dev`)에서 파일 수정 시 서버가 재시작되는데, 이때 구 버전의 DB 커넥션 풀이 닫히지 않고 남아 PostgreSQL의 `Too many clients` 에러를 유발하는 현상을 제어할 수 있습니다.
  2. **세부 설정 제어:** 최대 커넥션 수(`max: 10`), 커넥션 타임아웃, AWS RDS/Supabase 등의 SSL 접속 옵션을 명시할 수 있습니다.
  3. **Graceful Shutdown:** NestJS의 `OnApplicationShutdown` 생명주기 훅에서 `await pool.end()`를 호출하여 DB 자원을 안전하게 회수할 수 있습니다.
  4. **기존 커넥션 공유:** 프로젝트 내 세션 저장소(`connect-pg-simple`)나 레거시 raw query 등과 동일한 DB Pool을 공유할 수 있습니다.

### ③ 단일 클라이언트 (Single Client): `new Client(...)`
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle({ client });
```
- **특징:** 커넥션 풀을 생성하지 않고 단 1개의 연결만 유지합니다.
- **사용처:** 마이그레이션 스크립트 실행, CLI 도구 등 일회성 작업.

---

## 2. 요약 가이드

| 유즈케이스 | 권장 방식 | 이유 |
| :--- | :--- | :--- |
| **NestJS / Express 백엔드 서버** | **`drizzle({ client: pool, schema })`** | 커넥션 수 제한, Hot-reload 안정성, Graceful Shutdown |
| **단순 CLI / 마이그레이션 스크립트** | **`new Client(...)`** | 단발성 실행 후 커넥션 즉시 종료 (`client.end()`) |
| **Serverless (Vercel, AWS Lambda)** | **Neon Serverless / PgBouncer** | 람다 인스턴스 급증 시 DB 커넥션 고갈 방지 |
