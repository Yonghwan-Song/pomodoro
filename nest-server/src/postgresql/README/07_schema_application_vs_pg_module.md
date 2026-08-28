# 07. PostgreSQL 스키마 적용과 PgModule의 역할

## 혼동했던 부분

`src/postgresql/schema.ts`에 Drizzle 테이블을 정의한 뒤 `PgModule`을 `AppModule`에 등록하면 Docker PostgreSQL에 테이블이 생성될 것이라고 생각하기 쉽다.

하지만 현재 구조에서 `PgModule`과 `pgProviderByDrizzle`은 테이블을 생성하지 않는다. 이들은 NestJS 애플리케이션이 실행 중인 PostgreSQL에 접속하여 query를 수행할 수 있도록 Drizzle DB 인스턴스를 dependency injection으로 제공할 뿐이다.

## 각 구성 요소의 역할

```text
schema.ts
  PostgreSQL에 만들고 싶은 테이블, 컬럼, 인덱스, 제약 및 relation 정의

drizzle-kit
  schema.ts를 읽고 migration SQL을 생성하거나 PostgreSQL에 스키마를 적용

pgProviderByDrizzle
  PostgreSQL Pool과 Drizzle DB 인스턴스 생성

PgModule
  pgProviderByDrizzle을 NestJS의 다른 Module과 Service에 제공
```

핵심 구분은 다음과 같다.

```text
테이블 생성 및 변경: drizzle-kit
애플리케이션 실행 중 query: PgModule + pgProviderByDrizzle
```

## Docker PostgreSQL에 테이블 적용하기

먼저 PostgreSQL container를 실행한다.

```bash
docker compose up -d
```

권장 방식은 migration SQL을 생성한 뒤 적용하는 것이다.

```bash
npm run db:generate
npx drizzle-kit migrate
```

처리 과정은 다음과 같다.

```text
src/postgresql/schema.ts
  ↓ drizzle-kit generate
drizzle/*.sql
  ↓ drizzle-kit migrate
Docker PostgreSQL의 실제 테이블
```

`package.json`에는 아직 `db:migrate` script가 없으므로 현재는 `npx drizzle-kit migrate`를 직접 실행한다. 추후 다음 script를 추가할 수 있다.

```json
{
  "scripts": {
    "db:migrate": "drizzle-kit migrate"
  }
}
```

## db:push와 migration의 차이

개발 중인 일회성 Docker DB에 빠르게 테이블을 만들고 싶다면 다음 명령도 사용할 수 있다.

```bash
npm run db:push
```

`db:push`는 `schema.ts`와 현재 DB를 비교하여 변경 사항을 직접 반영한다. 빠른 실험에는 편리하지만 변경 이력을 SQL migration 파일로 관리하는 흐름에는 적합하지 않다.

```text
db:push
  빠른 로컬 실험용
  DB에 스키마를 직접 반영

generate + migrate
  실제 migration 작업에 권장
  SQL 파일로 변경 이력을 보존
  같은 변경을 다른 환경에도 반복 적용 가능
```

MongoDB에서 PostgreSQL로 전환하는 현재 프로젝트에서는 `generate + migrate` 방식을 기본으로 사용한다.

## PgModule을 import해도 테이블이 생성되지 않는 이유

현재 `pgProviderByDrizzle`은 Pool과 Drizzle 인스턴스만 생성한다.

```ts
const pool = new Pool({ connectionString: uri, max: 10 });
const db = drizzle({ client: pool, schema, casing: 'snake_case' });

return db;
```

여기에는 migration을 실행하는 코드가 없다. 따라서 `PgModule`을 `AppModule`에 import해도 PostgreSQL 연결만 준비될 뿐, 빈 DB에 테이블이 자동 생성되지는 않는다.

Drizzle migration을 NestJS 시작 시 자동 실행하도록 별도 코드를 작성할 수도 있지만, 애플리케이션 시작과 DB schema 변경을 결합하면 배포 시 제어가 어려워질 수 있다. 현재 프로젝트에서는 migration command를 애플리케이션 실행과 분리한다.

## Atlas 데이터를 먼저 이전할 때 PgModule이 필요한가

MongoDB API를 계속 사용하는 상태에서 Atlas 데이터를 Docker PostgreSQL로 복사하는 일회성 ETL 작업에는 `PgModule`이 필요하지 않다.

독립적인 migration script가 MongoDB와 PostgreSQL에 직접 연결하면 된다.

```text
MongoDB Atlas
  ↓ MONGODB_URL로 읽기
Standalone migration script
  ↓ 변환 및 INSERT
Docker PostgreSQL
  ↓ DOCKER_POSTGRESQL_URL로 쓰기
```

예상 파일 위치:

```text
scripts/migrate-mongodb-to-postgresql.ts
```

이 script는 NestJS dependency injection을 거치지 않고 MongoDB client와 PostgreSQL Pool을 직접 열고, 작업이 끝나면 두 연결을 닫는다.

## PgModule이 필요한 시점

다음 단계에서 `PgModule`이 필요하다.

- `UsersService`가 Mongoose 대신 Drizzle로 PostgreSQL을 조회할 때
- `PomodorosService`가 PostgreSQL transaction으로 세션과 Pomodoro를 저장할 때
- Category, CycleSetting, Todoist, Room API를 PostgreSQL로 전환할 때
- NestJS 내부에서 `PG_DB_BY_DRIZZLE` provider를 inject해야 할 때

권장 구조는 다음과 같다.

```text
AppModule
  └── PgModule
      └── pgProviderByDrizzle
          └── PostgreSQL Pool + Drizzle DB
```

`PgModule`을 global module로 만들면 `AppModule`에서 한 번 import하고 각 Service에서 DB token을 inject할 수 있다. Global module로 만들지 않으면 DB가 필요한 각 feature module이 `PgModule`을 import해야 한다.

## 전체 작업 순서

```text
1. schema.ts 완성 및 검토
2. drizzle-kit generate로 migration SQL 생성
3. drizzle-kit migrate로 Docker PostgreSQL에 테이블 생성
4. Atlas -> PostgreSQL ETL script 실행
5. row count, FK, NULL, aggregate 및 레거시 매칭 결과 검증
6. PgModule 생성 및 AppModule에 등록
7. Mongoose Service를 Drizzle Service로 하나씩 교체
8. 최종 전환 시 MongoDB write 중지 또는 delta migration 수행
9. PostgreSQL API 전환 완료 후 Mongoose 의존성 제거
```

API가 계속 MongoDB에 write하는 동안 PostgreSQL에 복사한 데이터는 테스트용 snapshot이다. 최종 전환 시에는 첫 복사 이후 변경분을 다시 옮기는 delta migration이나 짧은 maintenance window가 필요하다.

## 결론

```text
schema.ts를 작성하는 것만으로는 DB 테이블이 생성되지 않는다.
PgModule을 import하는 것만으로도 DB 테이블이 생성되지 않는다.
Docker PostgreSQL에 테이블을 만드는 주체는 drizzle-kit migrate 또는 db:push다.
PgModule은 API가 PostgreSQL을 사용하기 시작할 때 필요하다.
Standalone ETL script에는 PgModule이 필요하지 않다.
```
