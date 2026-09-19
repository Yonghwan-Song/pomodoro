# `PATCH /users/current-task-id` vs `PATCH /users/task-change-info-array` 역할 구분 가이드

이 문서는 태스크(할 일) 전환 및 이력 관리와 관련된 두 API 엔드포인트의 분리 배경, 호출 타이밍, 그리고 프론트엔드와의 연동 흐름을 정리한 문서입니다.

---

## 1. 개요 (Overview)

우리 앱은 뽀모도로 세션 진행 중 어떤 태스크에 얼마나 집중했는지를 추적하기 위해 `taskChangeInfoArray` 배열을 관리합니다.

- **`PATCH /users/current-task-id`**: 진행 중인 세션 내에서 **"태스크 전환 이벤트(타임스탬프)를 배열에 추가(Append)"**하는 동적 이벤트 기록용 API
- **`PATCH /users/task-change-info-array`**: 세션이 전환되거나 대기 상태일 때 **"배열 전체를 새로운 시작 상태로 통째로 덮어쓰기(Overwrite/Reset)"**하는 초기화용 API

---

## 2. 비교 요약표

| 구분 | `PATCH /users/current-task-id` | `PATCH /users/task-change-info-array` |
| :--- | :--- | :--- |
| **핵심 목적** | 세션 도중 태스크 전환 이벤트 기록 (추가/교체) | 세션 시작/전환 시 배열 통째로 초기화 (리셋) |
| **DTO** | `UpdateCurrentTaskIdAndTaskChangeInfoArrayDto` | `UpdateTaskChangeInfoArrayDto` |
| **전송 페이로드** | `{ currentTaskId, changeTimestamp, doesItJustChangeTask }` | `{ taskChangeInfoArray: [ ... ] }` |
| **DB 동작 방식** | 기존 배열의 끝에 새 원소를 **`push`** 하거나 마지막 원소 수정 | 기존 배열을 전달받은 새 배열로 **통째로 교체** |
| **주요 호출 시점** | **뽀모도로 집중 세션이 이미 실행 중일 때** 태스크를 클릭 | **세션이 아직 시작 안 했거나, 휴식 중이거나, 세션이 끝나고 리셋될 때** |

---

## 3. `PATCH /users/current-task-id` (세션 도중 태스크 전환)

### 📌 왜 필요한가?
25분짜리 뽀모도로 세션에서 처음 10분은 `[태스크 A]`를 하다가 10분 시점에 `[태스크 B]`로 전환했다면, 세션 통계 분석을 위해 **"10분 시점에 태스크 B로 전환되었다"**는 타임스탬프 이력을 누적해야 합니다.

### 📌 프론트엔드 호출 코드 (`TaskItem.tsx`)
```typescript
// 집중(Pomo) 세션이 이미 시작된 상태에서 다른 태스크를 클릭했을 때
if (isPomo && !checkIfSessionIsNotStartedYet()) {
  patchUrl = RESOURCE.USERS + SUB_SET.CURRENT_TASK_ID;
  patchData = {
    currentTaskId: task.id,
    doesItJustChangeTask: false, // 단순 교체가 아닌 전환 기록 추가
    changeTimestamp: moment,      // 전환 시점 타임스탬프
  };
}
```

### 📌 백엔드 처리 (`UsersService.updateCurrentTaskIdAndTaskChangeInfoArray`)
```typescript
user.currentTaskId = dto.currentTaskId;

if (dto.doesItJustChangeTask) {
  // 사용자가 방금 잘못 클릭해서 직전 선택을 교체한 경우
  user.taskChangeInfoArray[user.taskChangeInfoArray.length - 1].id = dto.currentTaskId;
} else {
  // 새로운 전환 시점 추가
  user.taskChangeInfoArray.push({
    id: dto.currentTaskId,
    taskChangeTimestamp: dto.changeTimestamp,
  });
}
```

---

## 4. `PATCH /users/task-change-info-array` (세션 전환 및 초기화)

### 📌 왜 필요한가?
이전 세션이 종료되고 새로운 뽀모도로 세션이나 휴식(Break) 세션이 시작될 때는, 이전 세션의 태스크 전환 이력들을 비우고 **이번 세션을 위한 1개짜리 초기 상태(`[{ id: currentTaskId, taskChangeTimestamp: 0 }]`)로 완전히 리셋**해야 합니다.

### 📌 프론트엔드 호출 시나리오
1. **세션 종료 및 다음 세션 전환 시 (`TimerController.tsx`)**:
   ```typescript
   // 뽀모도로가 끝나고 휴식으로 넘어가거나 세션이 리셋될 때
   axiosInstance.patch(RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY, {
     taskChangeInfoArray: [
       {
         id: currentTaskId,
         taskChangeTimestamp: 0,
       },
     ],
   });
   ```
2. **세션이 아직 시작되지 않은 대기 상태에서 태스크 선택 시 (`TaskItem.tsx`)**:
   - 아직 세션이 돌지 않았으므로 전환 타임스탬프를 누적할 필요 없이 초기 배열 자체를 갱신합니다.

---

## 5. 결론 및 요약

- **진행 중인 세션에 태스크 변경 이벤트를 덧붙일 때** ➡️ **`current-task-id`**
- **새 세션을 맞이하여 배열을 깨끗하게 새로 세팅할 때** ➡️ **`task-change-info-array`**
