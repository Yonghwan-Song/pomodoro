# PostgreSQL & Drizzle ORM 모듈 문서 지식베이스 (Knowledge Base)

이 폴더는 NestJS + Drizzle ORM + PostgreSQL 환경 구축 및 운영에 관한 모든 결정 사항, 아키텍처 배경, 트러블슈팅 경험을 주제별로 작성해둔 문서 저장소입니다.

유지보수 시 추가 AI 질의 없이 본 문서들을 참고하여 빠르게 맥락을 파악하고 개발을 진행할 수 있습니다.

---

## 📚 주제별 문서 목록

1. **[01. Drizzle 풀 관리 및 초기화 방식 (Pool Management)](./01_drizzle_pool_management.md)**
   - `drizzle(url)` (Implicit Pool) vs `drizzle({ client: pool })` (Explicit Pool) 차이점
   - NestJS 개발 환경(Hot-Reload) 및 프로덕션에서 명시적 Pool 생성이 필수인 이유
   - Graceful Shutdown 및 커넥션 자원 해제 관리

2. **[02. NestJS Provider 설계 & ConfigService 아키텍처](./02_nestjs_provider_design.md)**
   - `pgProviderByDrizzle` 커스텀 프로바이더 구조
   - `process.env` 직접 접근 대신 `ConfigService`를 주입받아 사용하는 이유 (테스트 용이성, DI 패러다임)
   - 환경변수 예외 처리 가이드

3. **[03. Drizzle TS 스키마 vs PostgreSQL DB 스키마](./03_drizzle_schema_vs_postgres_schema.md)**
   - `drizzle({ client: pool, schema })`의 TS `schema` 역할 (Relational Queries & 타입 추론)
   - DBeaver에서 보이는 `public` 스키마(PostgreSQL DB 네임스페이스)와 Drizzle TS 코드 스키마의 구별 및 매핑 원리

4. **[04. Docker & DBeaver 개발 환경 구축](./04_docker_and_dbeaver_environment.md)**
   - PostgreSQL `docker-compose.yml` 설정과 `.env` 연결 매핑
   - DBeaver / Beekeeper Studio GUI 데이터베이스 클라이언트 접속 정보 설정
   - 우분투(Ubuntu) / Fish Shell 환경에서의 Docker 및 Apt 트러블슈팅

5. **[05. User 스키마 (MongoDB -> PostgreSQL) 타입 분류 및 이관 설계 분석](./05_user_schema_migration_analysis.md)** ⭐
   - 기본 타입(1:1 매핑) vs 복잡한 타입(JSONB / 컬럼 평탄화 / 테이블 분리) 2가지 분류 분석

6. **[06. PostgreSQL numeric 타입 선택](./06-numeric.md)**
   - `integer`, `bigint`, `numeric`, 부동소수점 타입의 차이와 선택 기준

7. **[07. PostgreSQL 스키마 적용과 PgModule의 역할](./07_schema_application_vs_pg_module.md)**
   - `schema.ts`, `drizzle-kit`, `pgProviderByDrizzle`, `PgModule`의 역할 구분
   - Docker PostgreSQL에 테이블을 생성하는 실제 명령과 순서
   - Atlas 데이터 ETL과 NestJS API 전환 시점의 차이

8. **[08. MongoDB에서 PostgreSQL로 이전하는 ETL 가이드](./08_etl_mongodb_to_postgresql.md)**
   - Extract, Transform, Load의 의미와 이 프로젝트에서의 실제 적용 방식
   - ObjectId→UUID mapping, FK 적재 순서, batch, transaction과 idempotency
   - 데이터 검증, audit, rehearsal과 최종 cutover 절차

9. **[09. 레거시 Pomodoro 데이터의 startTime NULL 처리 및 Fallback 전략](./09_legacy_pomodoro_null_starttime_handling.md)**
   - MongoDB 레거시 뽀모도로 문서의 `startTime` 누락 원인 분석
   - `NOT NULL` 제약조건 방어를 위한 3단계 Fallback 전략 (`doc.startTime` -> `doc.date` -> `0`)
   - 누락 데이터의 `timer_sessions` 매칭 시 `timerSessionId = NULL` 유지 정책

10. **[10. Timer Sessions와 Pomodoros 연결 및 구간 매칭 가이드](./10_connect_sessions_table_and_pomodoros.md)**
    - MongoDB `todayrecords` 1:N `pomodoros` 분할 구조와 반열린 구간 `[startTime, endTime)` 매칭 규칙
    - `deleteRecordsBeforeToday`로 인한 레거시 미매칭(`NULL`) 발생 배경과 처리 기준
    - In-Memory 세션 인덱싱 및 1,000건 단위 배치 INSERT 최적화 구현 결과

11. **[11. Drizzle Relational Queries (`db.query.findFirst`) vs SQL-like (`db.select`) 쿼리 API 비교 가이드](./11_drizzle_relational_queries_vs_select.md)**
    - 배열 비구조화 시 빈 배열 런타임 크래시 방어 및 단일 객체(`T | undefined`) 반환
    - 컬럼 프로젝션(`columns`) 및 중첩 관계 결합(`with`)의 가독성과 Mongoose `populate` 매핑
    - Drizzle 쿼리 API별 올바른 사용 기준과 성능 동등성 검증

12. **[12. Unique Constraint vs Unique Index 및 부분 인덱스(Partial Index) 활용 전략](./12_unique_constraint_vs_unique_index.md)**
    - `unique()` (제약조건) vs `uniqueIndex()` (독립 인덱스)의 DDL 문법 및 기능적 차이
    - `isCurrent: true` 중복 방지를 위한 조건부 부분 유니크 인덱스(`uniqueIndex().where(...)`) 설계
    - 시계열 세션/기록 테이블의 정렬 최적화(`startTime.desc()`) 및 마이그레이션 적용 가이드

13. **[13. Service Method PostgreSQL Cutover Guide](./13_service_method_postgresql_cutover_guide.md)**
    - MongoDB 코드 보존과 PostgreSQL authoritative 전환을 병행하는 표준 작업 순서
    - shadow 오류 억제 제거, HTTP 예외 구분, `.returning()` 검증 및 PG 결과 로깅 규칙
    - transaction, JSONB read-modify-write row lock, batch 원자성 판단 기준
    - `{ success: true }` controller 응답, E2E 검증 절차 및 새 채팅용 작업 지시 템플릿
