# Categories 모듈 마이그레이션 지식베이스 (Knowledge Base)

이 폴더는 `CategoriesModule`을 MongoDB(Mongoose)에서 PostgreSQL(Drizzle ORM)로 점진적 이관(Migration)하는 과정에서 확립한 설계 원칙, 제약조건, 관계형 매핑 전략을 정리한 문서 저장소입니다.

---

## 📚 문서 목록

1. **[01. Categories 유니크 제약조건(Unique Constraint)과 에러 처리 아키텍처](./01_unique_constraint_and_error_handling.md)**
   - `unique('categories_user_id_name_unique')`의 비즈니스 무결성 및 자동 Unique B-Tree 인덱스 생성 메커니즘
   - PostgreSQL 에러 코드 `23505` (`unique_violation`) 및 NestJS `ConflictException` (409) 매핑
   - `await ... .catch()` 체이닝의 배열 비구조화 크래시 위험과 표준 `try-catch` 패턴

2. **[02. 오프라인 배치 동기화(`batchUpdate`) 및 세션 이력 동기화 가이드](./02_offline_batch_update_and_session_sync.md)**
   - `errorController.ts`의 오프라인 요청 병합(Coalescing) 및 복구 재전송(Replay) 아키텍처
   - `name`/`color` 변경 시 `users.categoryChangeInfoArray` 세션 이력 동기화
   - 카테고리 삭제 시 뽀모도로 외래키 `ON DELETE SET NULL` 동작 원리
