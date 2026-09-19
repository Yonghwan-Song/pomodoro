# 세션 분할 알고리즘(Segmentation)과 `taskTrackingArr` 아키텍처

이 문서는 뽀모도로 세션이 완료되었을 때 프론트엔드가 타임라인을 잘게 쪼개는 세그먼트(Segment) 분할 알고리즘, `pomodoroRecordArr`와 `taskTrackingArr`를 분리 전송하는 이유, 그리고 백엔드에서의 누적 집중 시간(`totalFocusDuration`) 처리 방식을 정리한 문서입니다.

---

## 1. 세션 타임라인 분할 알고리즘 (Segmentation)

### 📌 왜 세션을 쪼개야 하는가?
25분짜리 뽀모도로 세션 1개를 진행하는 도중에도 사용자는:
1. 카테고리를 변경할 수 있고 (`Math` ➡️ `Science`),
2. 할 일(Task)을 바꿀 수 있으며 (`과제 A` ➡️ `보고서 B`),
3. 도중에 일시정지(Pause)를 할 수 있습니다.

### 📌 프론트엔드 분할 3단계 파이프라인 (`category-change-utility.ts`)
1. **`makeTimestampsFromRawData`**:
   - 카테고리 변경 시점, 태스크 변경 시점, 일시정지 시작/종료 시점을 하나의 시간축(`timestamps`)으로 통합 정렬합니다.
2. **`makeSegmentsFromTimestamps`**:
   - 상태 변화가 발생한 모든 지점마다 타임라인을 잘게 쪼개어 세그먼트(`SessionSegment`)들을 생성합니다.
3. **`makeDurationsFromSegmentsByCategoryAndTaskCombination`**:
   - 일시정지(`pause`) 세그먼트는 순수 집중 시간에서 제외하고, **`(Category + Task)` 조합이 동일한 순수 집중 구간끼리 시간을 합산**합니다.

---

## 2. 왜 2개의 배열(`pomodoroRecordArr`, `taskTrackingArr`)로 나누어 전송하는가?

```text
[25분 뽀모도로 세션 종료]
      │
      ├── 1. pomodoroRecordArr ➡️ pomodoros 테이블 (통계 히스토리 저장)
      │
      └── 2. taskTrackingArr   ➡️ todoist_tasks 테이블 (할 일 누적 집중시간 += duration)
```

### 🅰️ `pomodoroRecordArr` (통계 & 잔디 심기 히스토리)
- **용도**: 통계 페이지의 일간/주간/월간 차트 및 히스토리 조회용.
- **저장소**: `pomodoros` 테이블에 Row 단위로 INSERT.
- **특징**: `category`, `task`, `startTime`, `date`, `duration`을 모두 포함하는 개별 세션 기록.

### 🅱️ `taskTrackingArr` (Todoist 할 일 누적 집중 시간 ⭐)
- **용도**: Todoist 할 일 목록 트리 UI에서 각 태스크 옆에 표시되는 **"🎯 누적 집중 시간 (예: 2시간 15분)"**을 갱신하기 위함.
- **저장소**:
  - MongoDB: `todoistTaskTrackings` 컬렉션 (`$inc: { duration }`)
  - PostgreSQL: `todoist_tasks` 테이블의 **`totalFocusDuration += duration`**
- **특징**: 카테고리 구분 없이 오직 `taskId`별 순수 집중 시간(분)만 그룹화한 데이터.

---

## 3. 관련 과거 주석 및 아키텍처 메모

1. **`category-change-utility.ts:L69, L145-147`**:
   > *"Segement는 category가 바뀌거나 pause가 시작되거나 끝나는 시점이다. pause일 때 카테고리를 바꾸고 ... pause를 종료 후 focus 시작했다면 focus segment만 category duration 계산에 포함되어야 한다."*
2. **`create-pomodoro.dto.ts:L64`**:
   > *"task?: Task; 어차피 Pomodoro schema에서 taskId가 field이고, F.E에서 알고 있는 정보도 그냥 taskId가 유일한데 뭐하러 이렇게 object를 하나 더 define해서 복잡하게 할 필요가 있는거야?"*
3. **`todoist/README/local-table.md:L126-128`**:
   > *"클라이언트가 `pomodoroRecordArr`와 `taskTrackingArr`를 각각 계산해서 보내게 하면 두 값이 서로 다를 수 있습니다. 새 구조에서는 서버가 실제로 INSERT한 Pomodoro를 기준으로 Task별 증가량을 계산하는 편이 더 안전합니다."*

---

## 4. PostgreSQL Drizzle 마이그레이션 적용 전략

PostgreSQL에서는 단일 트랜잭션(`tx`) 안에서:
1. `pomodoros` 테이블에 세그먼트별 뽀모도로 기록들을 `INSERT`하고,
2. 전송받은 `taskTrackingArr` (또는 INSERT된 뽀모도로의 taskId별 합산 시간)를 기반으로 `todoist_tasks` 테이블의 `totalFocusDuration`을 `$inc` (`sql`total_focus_duration + ${duration}``) 업데이트합니다.
