# `currentTaskId` 스냅샷과 `taskChangeInfoArray` 이벤트 기록 설계

이 문서는 `users.currentTaskId`와 `users.taskChangeInfoArray`가 일부 중복된 값을 가지면서도 별도로 존재하는 이유, 현재 구조의 장단점, 정합성 규칙, 그리고 처음부터 다시 설계할 경우의 권장 모델을 정리합니다.

---

## 1. 결론

현재 프로젝트에서는 `currentTaskId`를 유지합니다.

다만 주된 이유를 "배열의 마지막 원소를 계산하는 비용이 매우 크기 때문"이라고 설명하는 것은 정확하지 않습니다. 이 필드의 더 중요한 역할은 다음 두 종류의 데이터를 분리하는 것입니다.

```text
currentTaskId
= 사용자가 현재 선택한 Todoist task의 상태 스냅샷

taskChangeInfoArray
= 현재 세션에서 task가 언제 변경됐는지 기록하는 이벤트 목록
```

`currentTaskId`는 계산 결과를 미리 저장한 반정규화 필드이면서, 동시에 현재 상태를 명시적으로 표현하는 도메인 필드입니다.

---

## 2. 두 필드의 역할

| 구분 | `currentTaskId` | `taskChangeInfoArray` |
| :--- | :--- | :--- |
| 데이터 성격 | 현재 상태 스냅샷 | 세션 내 변경 이벤트 기록 |
| 주요 질문 | "지금 어떤 task가 선택됐는가?" | "세션 중 언제 어떤 task로 바뀌었는가?" |
| 주요 사용처 | 앱 초기 상태 복원, 선택 UI, 다음 세션 초기값 | Pomodoro 구간별 task 집중 시간 계산 |
| 변경 방식 | task 선택 시 scalar 교체 | 이벤트 append, 마지막 이벤트 교체, 배열 reset |
| 세션 전환 | 선택 상태를 계속 유지 | 다음 세션 기준의 한 원소 배열로 reset |

예를 들어 세션 도중 task A에서 task B로 변경하면 다음과 같이 저장됩니다.

```typescript
currentTaskId = 'task-b';

taskChangeInfoArray = [
  { id: 'task-a', taskChangeTimestamp: 0 },
  { id: 'task-b', taskChangeTimestamp: 600 },
];
```

세션이 종료되면 이전 이벤트 목록은 다음 세션을 위한 기준값으로 reset되지만 현재 선택은 유지됩니다.

```typescript
currentTaskId = 'task-b';
taskChangeInfoArray = [{ id: 'task-b', taskChangeTimestamp: 0 }];
```

---

## 3. 현재 코드에서의 실제 역할

### 앱 재접속 시 상태 복원

`UsersService.getUserInfo()`가 PostgreSQL의 `currentTaskId`를 반환합니다. 프론트엔드의 `populateExistingUserStates()`는 이 값을 Zustand와 `sessionStorage`에 저장합니다.

따라서 새로고침, 새 브라우저 세션 또는 다른 기기에서 사용자 정보를 다시 읽을 때 현재 선택 task를 복원할 수 있습니다.

### UI 바인딩

프론트엔드는 `currentTaskId`를 다음 목적으로 직접 사용합니다.

- 현재 task 선택 표시
- 같은 task를 다시 선택하는 불필요한 요청 방지
- 선택된 nested task의 상위 항목 펼치기
- 세션 종료 후 다음 세션의 첫 `taskChangeInfoArray` 항목 생성

### 집중 시간 계산

서버는 현재 `currentTaskId`를 이용해 Pomodoro 집중 시간을 계산하지 않습니다. 세션 중 task별 집중 시간 계산은 timestamp를 가진 `taskChangeInfoArray`를 사용합니다.

---

## 4. 별도 스냅샷 필드의 장점

### 현재 상태의 의미가 명확하다

호출자가 이벤트 배열의 구조와 reset 정책을 알지 않아도 `currentTaskId`만 읽으면 현재 선택 상태를 알 수 있습니다. 상태 조회 코드와 이벤트 처리 코드의 책임이 분리됩니다.

### 선택적인 조회가 가능하다

현재 task만 필요한 endpoint나 background job이 생기면 큰 JSONB 값을 전송하고 해석하지 않고 scalar 컬럼 하나만 조회할 수 있습니다.

```sql
SELECT current_task_id
FROM users
WHERE id = $1;
```

### 일반 컬럼 인덱스를 사용할 수 있다

향후 "특정 task를 현재 선택한 사용자"를 검색하는 요구가 생기면 `current_task_id`에 일반 B-tree 인덱스를 추가할 수 있습니다.

다만 현재 schema에는 `currentTaskId` 인덱스가 없고, 현재 애플리케이션에도 이러한 검색 query가 없습니다. 따라서 이것은 현재 얻고 있는 성능 효과가 아니라 향후 가능한 최적화입니다.

### 이벤트 저장 방식의 변경에 덜 의존한다

향후 `taskChangeInfoArray`를 JSONB에서 별도 이벤트 테이블로 옮기거나 오래된 이벤트를 정리하더라도 현재 선택 상태는 독립적으로 유지할 수 있습니다.

---

## 5. 성능 효과를 과장하면 안 되는 이유

JavaScript에서 다음 연산은 배열 전체를 순회하지 않습니다.

```typescript
const derivedCurrentTaskId = taskChangeInfoArray.at(-1)?.id ?? '';
```

마지막 원소 접근 자체는 사실상 O(1)입니다. 또한 현재 `getUserInfo()`는 `currentTaskId`와 `taskChangeInfoArray`를 모두 읽으므로, 이 read path에서는 JSONB 전송을 생략하는 효과도 없습니다.

PostgreSQL에서 JSONB 마지막 원소를 매번 추출하는 것보다 scalar 컬럼을 읽는 편이 단순하고 저렴하지만, 현재 데이터 규모와 query 형태에서는 그 차이가 핵심 설계 이유라고 보기 어렵습니다.

JSONB 표현식도 expression index로 최적화할 수 있으므로 "JSONB를 사용하면 반드시 full table scan이 발생한다"고 단정해서도 안 됩니다.

현재 구조의 주된 이점은 큰 계산량 절약이 아니라 다음 두 가지입니다.

1. 현재 상태와 이벤트 이력의 의미 분리
2. 현재 상태를 사용하는 코드와 query의 단순화

---

## 6. 반정규화의 비용과 위험

같은 의미의 값이 두 위치에 존재하면 write path가 두 값을 항상 함께 갱신해야 합니다.

다음과 같은 불일치가 생길 수 있습니다.

```typescript
currentTaskId = 'task-b';
taskChangeInfoArray = [
  { id: 'task-a', taskChangeTimestamp: 0 },
];
```

이 상태에서는 UI가 표시하는 현재 task와 세션 통계의 마지막 task가 달라집니다. 원인은 일부 write path의 갱신 누락, 동시 요청의 lost update, 수동 DB 수정 또는 MongoDB/PostgreSQL dual-write의 부분 실패일 수 있습니다.

반정규화로 인해 추가되는 비용은 다음과 같습니다.

- 모든 관련 writer에서 두 값을 함께 갱신해야 함
- JSONB read-modify-write에 동시성 제어가 필요함
- 데이터 정합성 검증 및 복구 정책이 필요함
- MongoDB와 PostgreSQL 사이의 일시적 불일치 가능성

---

## 7. 현재 구현의 정합성 규칙

현재 데이터 모델에서는 `taskChangeInfoArray`가 비어 있지 않을 때 다음 조건을 유지해야 합니다.

```typescript
currentTaskId === taskChangeInfoArray.at(-1)?.id;
```

Todoist 연동이 해제되어 배열이 비어 있는 경우에는 `currentTaskId`도 빈 문자열을 사용합니다.

```typescript
currentTaskId === '';
taskChangeInfoArray.length === 0;
```

주요 PG write path는 다음 방식으로 정합성을 유지합니다.

- `updateCurrentTaskId()`: 사용자 row를 잠근 transaction 안에서 최신 배열을 수정하고 두 컬럼을 함께 UPDATE
- `updateTaskChangeInfoArray()`: 전달받은 완성 배열의 마지막 ID를 계산하고 두 컬럼을 한 번의 UPDATE로 교체
- Todoist 연결/해제: token 및 연동 상태와 함께 두 필드를 초기화

PG의 한 UPDATE 또는 transaction 안에서 수행되는 변경은 원자적입니다. 그러나 MongoDB write와 PostgreSQL write 전체를 하나의 transaction으로 묶을 수는 없으므로 cross-database atomicity는 보장되지 않습니다.

---

## 8. 처음부터 다시 설계한다면

처음부터 PostgreSQL 중심으로 작성하더라도 "현재 선택 task"라는 스냅샷 개념은 유지합니다. 다만 현재 schema와는 다르게 설계하는 편이 좋습니다.

### 빈 문자열 대신 nullable FK 사용

현재의 외부 Todoist task ID 문자열 대신 로컬 `todoist_tasks` row를 참조합니다.

```text
users.current_todoist_task_id
  -> todoist_tasks.id (nullable FK)
```

- `NULL`: 선택된 task가 없음
- FK 값 존재: 현재 선택된 Todoist task가 있음
- `isTodoistIntegrationEnabled`: Todoist 연동 여부

빈 문자열 하나에 "연동하지 않음"과 "task를 선택하지 않음"이라는 여러 의미를 넣지 않아도 됩니다.

### 이벤트는 세션별 테이블로 정규화

JSONB 배열 대신 task 변경 이벤트를 세션과 연결된 row로 저장할 수 있습니다.

```text
timer_session_task_changes
  id
  timer_session_id
  todoist_task_id
  changed_at
```

이 구조에서는 현재 상태 조회와 과거 이벤트 분석이 명확하게 분리되고, 배열 전체 교체나 JSONB lost update 문제도 줄어듭니다.

### 하나의 transaction에서 갱신

세션 도중 task를 변경할 때는 다음 작업을 하나의 PostgreSQL transaction으로 처리합니다.

1. 현재 선택 task FK 갱신
2. 현재 timer session의 task-change event 추가 또는 교체

---

## 9. 현재 프로젝트의 결정

현재 프로젝트에서는 다음 이유로 `currentTaskId`를 유지합니다.

- FE의 초기 상태 복원과 UI가 이미 이 필드를 직접 사용함
- 현재 상태와 세션 이벤트를 분리하는 의미가 유효함
- scalar 필드 하나의 저장 비용이 작음
- 제거로 얻는 이익보다 schema, API, FE migration 비용이 큼

따라서 현재 결정은 다음과 같습니다.

> `currentTaskId`를 단순한 성능 캐시가 아니라 "현재 선택 상태 스냅샷"으로 유지한다. `taskChangeInfoArray`는 세션 내 이벤트 기록으로 취급하며, 모든 write path에서 두 값의 정합성을 보장한다.
