# Users 모듈 마이그레이션 지식베이스 (Knowledge Base)

이 폴더는 `UsersModule`을 MongoDB(Mongoose)에서 PostgreSQL(Drizzle ORM)로 점진적 이관(Migration)하는 과정에서 확립한 설계 원칙, DTO 전략, 그리고 쿼리 최적화 기법을 정리한 문서 저장소입니다.

---

## 📚 문서 목록

1. **[01. 컬럼 평탄화(Flattening), @IsOptional() 데코레이터와 Drizzle의 부분 업데이트 원리](./01_partial_updates_and_flattened_columns.md)**
   - MongoDB `autoStartSetting` 중첩 문서 ➡️ PostgreSQL 3개 boolean 컬럼 평탄화 매핑
   - `@IsOptional()`이 보장하는 FE 하위 호환성 (현재 `SAVE` 폼 제출 vs 향후 즉시 저장 UI)
   - Drizzle ORM `.set(dto)`의 `undefined` 필드 자동 필터링 및 동적 SQL 생성 메커니즘

2. **[02. PostgreSQL JSONB 부분 병합(Merge), Drizzle `sql` 템플릿, 그리고 TypeScript 이중 타입 단언](./02_jsonb_partial_update_and_typescript_assertions.md)**
   - `` sql`...` `` 태그드 템플릿 리터럴(Tagged Template Literal)과 SQL Injection 방어
   - PostgreSQL `||` 연산자를 이용한 단 1회의 원자적(Atomic) JSONB 객체 부분 병합
   - `::jsonb` 타입 캐스팅(Type Casting)의 필수적인 역할
   - 가변 배열(`GoalDto[]`) ➡️ 7개 고정 튜플(`DailyGoals`) 간의 TypeScript 이중 타입 단언(`as unknown as Target`)
   - `user_email` UNIQUE B-Tree 인덱스 기반 자연키 조회와 불변 UUID 외래키 아키텍처

3. **[03. `PATCH /users/current-task-id` vs `PATCH /users/task-change-info-array` 역할 구분 가이드](./03_current_task_id_vs_task_change_info_array.md)**
   - 세션 진행 중 태스크 전환 이벤트 기록(Append) vs 세션 시작/전환 시 배열 리셋(Overwrite)
   - 프론트엔드(`TaskItem.tsx`, `TimerController.tsx`) 호출 시나리오 및 DTO 비교 분석

4. **[04. 스칼라 스냅샷 컬럼(`currentTaskId`)과 시계열 배열(`taskChangeInfoArray`)의 분리 설계 원칙](./04_current_task_id_and_task_change_info_array_design.md)**
   - 현재 상태 스냅샷과 세션 내 이벤트 기록의 역할 및 라이프사이클 분리
   - 반정규화의 조회 편의성, 선택적 인덱싱 가능성, 중복 저장 및 정합성 비용
   - 현재 구현에서 실제 성능 효과를 과장하면 안 되는 이유
   - PG write의 정합성 규칙과 MongoDB/PostgreSQL dual-write의 원자성 한계
   - 처음부터 설계할 경우 nullable FK와 세션별 task-change event 테이블 권장안

5. **[05. JSONB Read-Modify-Write와 PostgreSQL Row Lock](./05_row_locks_for_jsonb_read_modify_write.md)**
   - 한 요청 내부의 `await` 순서와 여러 요청 사이의 동시성 차이
   - lost update가 발생하는 과정과 `SELECT ... FOR UPDATE`의 역할
   - 조회한 사용자 UUID로 동일한 row를 업데이트하는 이유
   - `UsersService.updateColorForUnCategorized()`와 `CategoriesService.update()`의 공통 잠금 규칙
   - `UsersService.updateCategoryChangeInfoArray()`처럼 배열 전체를 직접 교체하는 경로와의 차이
   - 모든 JSONB writer에 동일한 잠금 규칙을 적용해야 하는 이유와 장기 개선안
