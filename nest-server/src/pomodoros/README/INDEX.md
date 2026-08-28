# Pomodoros 모듈 마이그레이션 지식베이스 (Knowledge Base)

이 폴더는 `PomodoroModule`을 MongoDB(Mongoose)에서 PostgreSQL(Drizzle ORM)로 점진적 이관(Migration)하는 과정에서 확립한 세션 분할 알고리즘, 집계 전략, 트랜잭션 설계를 정리한 문서 저장소입니다.

---

## 📚 문서 목록

1. **[01. 세션 분할 알고리즘(Segmentation)과 `taskTrackingArr` 아키텍처](./01_session_segmentation_and_task_tracking.md)**
   - 일시정지(`pause`) 구간 제외 및 `(Category + Task)` 고유 조합별 순수 집중 시간 세그먼트 생성 원리
   - `pomodoroRecordArr` (통계 차트 히스토리) vs `taskTrackingArr` (Todoist 할 일 트리 누적 시간)의 역할 분리
   - PostgreSQL `todoist_tasks.totalFocusDuration` 원자적 증분(`+`) 처리 전략

2. **[02. 뽀모도로 기록(Pomodoros) 마이그레이션 및 ShadowDiff 실시간 검증 가이드](./02_pomodoros_migration_and_shadow_diff.md)**
   - `categoryId` / `todoistTaskId` 외래키(FK) 조회 및 매핑 전략
   - `taskTrackingArr` Null 방어 및 `totalFocusDuration` 원자적 증분 업데이트
   - `SUM()` 집계 쿼리 및 대량 더미 데이터 청크 분할 삽입 기법
