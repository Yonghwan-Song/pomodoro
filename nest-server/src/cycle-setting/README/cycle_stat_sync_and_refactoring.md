# CycleStat 동기화 전략 및 향후 개선 계획 (Refactoring Plan)

## 1. 개요
현재 `CycleSettingService.update` 메서드에서는 클라이언트로부터 `cycleStat` 배열이 전달될 때, PostgreSQL의 `cycle_records` 테이블에서 해당 사이클 설정의 기존 레코드를 전부 삭제(`DELETE`)한 후 넘어온 배열을 통째로 새로 삽입(`INSERT`)하고 있습니다.

관련 코드:
- 백엔드: [`CycleSettingService.update`](file:///home/yhs/repos/pomodoro/nest-server/src/cycle-setting/cycle-setting.service.ts#L233-L253)
- 프론트엔드: [`TimerController.tsx`](file:///home/yhs/repos/pomodoro/client/src/Pages/Main/Timer-Related/TimerController/TimerController.tsx#L370-L405), [`handleEndOfCycle.ts`](file:///home/yhs/repos/pomodoro/client/src/utils/handleEndOfCycle.ts#L18-L55)

---

## 2. 왜 이렇게 구현되어 있는가? (배경)

### (1) MongoDB 시절의 레거시 구조 (Document Embedded Array)
- MongoDB에서는 `CycleSetting` 도큐먼트 내에 `cycleStat: [ { ratio, cycleAdherenceRate, start, end } ]` 형태로 최대 10개의 최근 완료 기록이 임베디드 배열로 저장되었습니다.
- FE는 한 사이클이 끝날 때마다 다음과 같이 동작합니다:
  1. 클라이언트 로컬 상태의 `cycleStat` 배열 길이가 10개 이상이면 `shift()`로 가장 오래된 1개를 제거.
  2. 새로운 1건을 `push()`.
  3. **최대 10개가 담긴 전체 배열(`cycleStatPayload`)을 백엔드로 통째로 전송(`PATCH /cycle-settings`)**.
- MongoDB는 `$set: { cycleStat: [...] }` 한 번으로 도큐먼트 전체를 덮어쓰므로 간편했습니다.

### (2) PostgreSQL Shadow Run 단계에서의 동기화
- PostgreSQL 마이그레이션 과정에서 `cycle_settings`와 `cycle_records`를 **1 : N 관계의 테이블로 정규화**했습니다.
- 하지만 프론트엔드 코드를 수정하지 않고 MongoDB와 PostgreSQL의 응답 정합성을 검증(Shadow Run)해야 했기 때문에:
  - FE에서 넘어오는 최대 10개 배열을 RDBMS 자식 테이블에 일치시키기 위해
  - 기존 자식 레코드 전체 `DELETE` 후 새 배열 `INSERT` (전체 교체) 방식을 채택했습니다.

---

## 3. 현재 동작에 문제가 없는 이유
1. **데이터 양의 극소성**: FIFO 슬라이딩 윈도우로 최대 10건만 유지되므로, `DELETE + INSERT(최대 10건)` 트랜잭션 수행 시간이 1~2ms 안팎으로 DB 부하나 성능에 영향이 거의 없습니다.
2. **Shadow Run 정합성 보장**: MongoDB의 임베디드 배열 상태와 PostgreSQL 자식 테이블의 row 상태가 완벽하게 일치하여 Shadow Diff 검증을 안전하게 통과합니다.

---

## 4. 향후 개선(리팩토링) 계획

MongoDB를 완전히 걷어내고 PostgreSQL 단독 운영으로 전환할 때, API 명세와 FE/BE 로직을 정석적인 RDBMS 패턴으로 개편합니다.

### 개선 방안
1. **단일 레코드 생성 API 도입**:
   - 사이클 완료 시 전체 배열을 보내는 대신, 완료된 **1건의 레코드만 전송**하는 전용 API 도입 (`POST /cycle-records` 또는 `POST /cycle-settings/:id/records`).
2. **백엔드 레코드 관리 단순화**:
   - 백엔드는 전달받은 단일 레코드만 `INSERT`.
   - 최근 10개 기록 조회는 API 호출 시점에 SQL 쿼리로 해결:
     ```sql
     SELECT * FROM cycle_records
     WHERE cycle_setting_id = :settingId
     ORDER BY "end" DESC
     LIMIT 10;
     ```
   - (선택 사항) 테이블 용량 관리가 필요하다면 10건 초과분만 백그라운드나 트리거로 정리.
