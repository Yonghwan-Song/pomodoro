import {
  CategoryDurationsAndHelperFields,
  DurationOfCategoryTaskCombination,
  DurationsOfCategoryTaskCombinationAndHelperFields,
  InfoOfSessionStateChange,
  SegmentDuration,
  SegmentDurationsAndHelperFields,
  SegmentDurationsAndHelperFields2,
  SessionSegment,
  TaskDuration,
} from "../../../types/clientStatesType";
import { TaskChangeInfo } from "../../../types/todoistRelatedTypes";
import { PomodoroSessionDocument } from "../../Statistics/statRelatedTypes";

//-------------------------------Original-------------------------------------------------------
//#region transform 1 - to combine two arrays into one and sort it by timestamp.
export function createDataSortedByTimestamp(
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[],
  pauseRecord: {
    start: number;
    end: number;
  }[],
  endTime: number
) {
  const categoryChanges: InfoOfSessionStateChange[] = transformCategoryChanges(
    categoryChangeInfoArray
  );
  const pauseRecords: InfoOfSessionStateChange[] =
    transformPauseRecords(pauseRecord);
  const data: InfoOfSessionStateChange[] = [
    ...categoryChanges,
    ...pauseRecords,
  ];

  data.sort((a, b) => a.timestamp - b.timestamp);
  data.push({ kind: "endOfSession", timestamp: endTime });

  return data;

  function transformCategoryChanges(
    categoryChangeInfoArray: {
      categoryName: string;
      categoryChangeTimestamp: number;
    }[]
  ): InfoOfSessionStateChange[] {
    return categoryChangeInfoArray.map((val) => ({
      kind: "category",
      subKind: val.categoryName,
      timestamp: val.categoryChangeTimestamp,
    }));
  }

  function transformPauseRecords(
    pauseRecords: { start: number; end: number }[]
  ): InfoOfSessionStateChange[] {
    return pauseRecords.flatMap((val) => [
      { kind: "pause", subKind: "start", timestamp: val.start },
      { kind: "pause", subKind: "end", timestamp: val.end },
    ]);
  }
}
//#endregion

//#region transform 2: duration for each segment
//! reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
// Segement는 category가 바뀌거나 pause가 시작되거나 끝나는 시점이다.
export function calculateDurationForEverySegment(
  acc: SegmentDurationsAndHelperFields,
  val: InfoOfSessionStateChange,
  idx: number,
  _array: InfoOfSessionStateChange[]
): SegmentDurationsAndHelperFields {
  // 로직:
  // 1. currentValue가 이제 Info니까... 우선 그냥 timestamp이용해서 시간 간격을 계산한다.
  // 2. 그리고 이제 currentValue.kind가 무엇이냐에 따라서...
  if (idx === 0) {
    // segments의 첫번째가 pause일리 없기 때문에 index가 0인 경우는 그냥 kind는 category일 것이므로, 바로 name을 owner로 설정한다.
    // kind와 name의 조합이 어떤 의미인지 맨 위의 comment를 보면 이해할 수 있다.
    acc.currentOwner = val.subKind!;
    acc.currentStartTime = val.timestamp;
    return acc;
  }

  const duration_in_ms = val.timestamp - _array[idx - 1].timestamp;
  // const duration_in_min = Math.floor(duration_in_ms / (60 * 1000));

  // Session의 상태에 변화가 있을 때마다 timestamp가 찍혔었고 (pasue, category change), 그 사이의 duration을 계산한다.
  // duration_in_ms는 방금의 변화에 의해 일단락된 segment의 duration을 의미한다.
  switch (val.kind) {
    case "pause":
      if (val.subKind === "start") {
        acc.segmentDurationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "pause";
        acc.currentStartTime = val.timestamp;
      }
      if (val.subKind === "end") {
        acc.segmentDurationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "focus";
        acc.currentStartTime = val.timestamp;
      }
      break;
    case "category":
      acc.segmentDurationArr.push({
        owner: acc.currentOwner,
        duration: duration_in_ms,
        type: acc.currentType,
        startTime: acc.currentStartTime,
      });
      acc.currentOwner = val.subKind!; // category가 바뀌었으므로, owner도 바꿔준다.
      acc.currentStartTime = val.timestamp;
      break;
    case "endOfSession":
      if (duration_in_ms !== 0)
        // A session is forcibly ended by a user during a pause.
        acc.segmentDurationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
      break;

    default:
      break;
  }

  return acc;
}
//#endregion

//#region transform 3: sum up focus durations of the same category.
// 예를 들면, pause일때 카테고리를 바꾸고 시간이 조금 흐른 후 pause를 종료 후 focus 시작
// 그리고 다시 pause and resume하여 몇분 후 다른 카테고리로 바꾸던지 아니면 session을 종료했다면
// 이 카테고리는 pause segment + focus segment로 나뉘어져야 한다. 그리고 focus segment만 category duration 계산시 포함되어야 한다.

// Original without tasks
/**
 * {
  owner: string; //! This is not optional since pause can also have its category. I mean we just can pause a session and the session has its category (including "uncategorized")
  duration: number;
  type: "pause" | "focus";
  startTime: number;
}[]에 대해 reduce의 callback으로 이 함수를 호출한다.
 * 
 * @param acc 
 * @param segmentDuration 
 * @param idx 
 * @returns 
 */
export function aggregateFocusDurations(
  acc: CategoryDurationsAndHelperFields,
  segmentDuration: SegmentDuration,
  idx: number
): CategoryDurationsAndHelperFields {
  if (idx === 0) {
    acc.categoryDurationArr.push({
      categoryName: segmentDuration.owner, // 처음부터 pause로 시작할 수는 없으니까 index zero에서는 그냥 categoryName을 owner로 설정한다.
      duration: segmentDuration.duration,
      startTime: segmentDuration.startTime,
    });
    acc.currentCategoryName = segmentDuration.owner;

    return acc;
  }

  // 새로운 owner를 마주쳤을 때,
  // 1. segment의 owner가 같은 종류이면서 focus type이면 합친다.
  if (segmentDuration.owner === acc.currentCategoryName) {
    if (segmentDuration.type === "focus") {
      acc.categoryDurationArr[acc.categoryDurationArr.length - 1].duration +=
        segmentDuration.duration;
    }
  }

  // 2. segment의 owner가 다른 종류이면, 새로운 카테고리로 바뀌었으므로, 새로운 카테고리 duration을 추가한다.
  if (segmentDuration.owner !== acc.currentCategoryName) {
    const newDuration = {
      categoryName: segmentDuration.owner,
      duration: segmentDuration.type === "focus" ? segmentDuration.duration : 0, // pause 도중에 다른 카테고리로 바꿨다면, 처음 duration이 pause.
      startTime: segmentDuration.startTime,
    };
    acc.categoryDurationArr.push(newDuration);
    acc.currentCategoryName = segmentDuration.owner;
  }

  return acc;
}

export function convertMilliSecToMin(
  durationByCategoryArr: CategoryDurationsAndHelperFields["categoryDurationArr"]
) {
  return durationByCategoryArr.map((val) => {
    // console.log(
    //   "<-------------------------------convertMilliSecToMin---------------------------------->"
    // );
    // console.log(val);
    return { ...val, duration: Math.floor(val.duration / (60 * 1000)) };
  });
}
//#endregion

//-------------------------------New After Task Integration Feature-----------------------------
//#region raw data to timestamps
export function makeTimestampsFromRawData(
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[],
  taskChangeInfoArray: TaskChangeInfo[],
  pauseRecord: {
    start: number;
    end: number;
  }[],
  endTime: number
): InfoOfSessionStateChange[] {
  const categoryChanges: InfoOfSessionStateChange[] =
    transformCategoryChangeInfoArray(categoryChangeInfoArray);
  const taskChanges: InfoOfSessionStateChange[] =
    transformTaskChangesArray(taskChangeInfoArray);
  const pauseRecords: InfoOfSessionStateChange[] =
    transformPauseRecords(pauseRecord);
  const data: InfoOfSessionStateChange[] = [
    ...categoryChanges,
    ...taskChanges,
    ...pauseRecords,
  ];

  data.sort((a, b) => a.timestamp - b.timestamp);
  data.push({ kind: "endOfSession", timestamp: endTime });

  return data;

  function transformCategoryChangeInfoArray(
    categoryChangeInfoArray: {
      categoryName: string;
      categoryChangeTimestamp: number;
    }[]
  ): InfoOfSessionStateChange[] {
    return categoryChangeInfoArray.map((val) => ({
      kind: "category",
      subKind: val.categoryName,
      timestamp: val.categoryChangeTimestamp,
    }));
  }

  function transformTaskChangesArray(
    taskChangeInfoArray: TaskChangeInfo[]
  ): InfoOfSessionStateChange[] {
    return taskChangeInfoArray.map((val) => ({
      kind: "task",
      subKind: val.id,
      timestamp: val.taskChangeTimestamp,
    }));
  }

  function transformPauseRecords(
    pauseRecords: { start: number; end: number }[]
  ): InfoOfSessionStateChange[] {
    return pauseRecords.flatMap((val) => [
      { kind: "pause", subKind: "start", timestamp: val.start },
      { kind: "pause", subKind: "end", timestamp: val.end },
    ]);
  }
}
//#endregion

//#region timestamps to segments - Array<InfoOfSessionStateChange> -> Array<SessionSegment>
export function makeSegmentsFromTimestamps(
  timestampData: Array<InfoOfSessionStateChange>
): Array<SessionSegment> {
  const segArrAndHelper =
    timestampData.reduce<SegmentDurationsAndHelperFields2>(
      timestamps_to_segments,
      {
        segmentDurationArr: [],
        currentType: "focus",
        currentOwner: ["", ""],
        currentStartTime: 0,
      }
    );
  return segArrAndHelper.segmentDurationArr;
}
export function timestamps_to_segments(
  acc: SegmentDurationsAndHelperFields2,
  val: InfoOfSessionStateChange,
  idx: number,
  _array: InfoOfSessionStateChange[]
): SegmentDurationsAndHelperFields2 {
  // 로직:
  // 1. currentValue가 이제 Info니까... 우선 그냥 timestamp이용해서 시간 간격을 계산한다.
  // 2. 그리고 이제 currentValue.kind가 무엇이냐에 따라서...
  if (idx === 0) {
    // segments의 첫번째가 pause일리 없기 때문에 index가 0인 경우는 그냥 kind는 category일 것이므로, 바로 name을 owner로 설정한다.
    // kind와 name의 조합이 어떤 의미인지 맨 위의 comment를 보면 이해할 수 있다.
    if (val.kind === "category") {
      acc.currentOwner[0] = val.subKind!;
    } else if (val.kind === "task") {
      acc.currentOwner[1] = val.subKind!;
    }
    acc.currentStartTime = val.timestamp; // startTime으로 값이 같을테니 idx === 1일때는 할당해주지 않는다.
    return acc;
  }
  if (idx === 1) {
    if (val.kind === "category") {
      acc.currentOwner[0] = val.subKind!;
    } else if (val.kind === "task") {
      acc.currentOwner[1] = val.subKind!;
    }
    return acc;
  }

  const duration_in_ms = val.timestamp - _array[idx - 1].timestamp;
  // const duration_in_min = Math.floor(duration_in_ms / (60 * 1000));

  // Session의 상태에 변화가 있을 때마다 timestamp가 찍혔었고 (pasue, category change), 그 사이의 duration을 계산한다.
  // duration_in_ms는 방금의 변화에 의해 일단락된 segment의 duration을 의미한다.
  switch (val.kind) {
    case "pause":
      if (val.subKind === "start") {
        acc.segmentDurationArr.push({
          owner: [acc.currentOwner[0], acc.currentOwner[1]],
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "pause";
        acc.currentStartTime = val.timestamp;
      }
      if (val.subKind === "end") {
        acc.segmentDurationArr.push({
          owner: [acc.currentOwner[0], acc.currentOwner[1]],
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "focus";
        acc.currentStartTime = val.timestamp;
      }
      break;
    case "category":
      acc.segmentDurationArr.push({
        owner: [acc.currentOwner[0], acc.currentOwner[1]],
        duration: duration_in_ms,
        type: acc.currentType,
        startTime: acc.currentStartTime,
      });
      acc.currentOwner[0] = val.subKind!; // category가 바뀌었으므로, owner도 바꿔준다.
      acc.currentStartTime = val.timestamp;
      break;
    case "task":
      acc.segmentDurationArr.push({
        owner: [acc.currentOwner[0], acc.currentOwner[1]],
        duration: duration_in_ms,
        type: acc.currentType,
        startTime: acc.currentStartTime,
      });
      acc.currentOwner[1] = val.subKind!;
      acc.currentStartTime = val.timestamp;
      break;
    case "endOfSession":
      if (duration_in_ms !== 0)
        // A session is forcibly ended by a user during a pause.
        acc.segmentDurationArr.push({
          owner: [acc.currentOwner[0], acc.currentOwner[1]],
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
      break;

    default:
      break;
  }

  return acc;
}
//#endregion

//#region segments to durations - aggregate the same session by the same kind
//#region by task & category combination
export function makeDurationsFromSegmentsByCategoryAndTaskCombination(
  segmentData: SessionSegment[]
): Array<DurationOfCategoryTaskCombination> {
  const durationAndHelper =
    segmentData.reduce<DurationsOfCategoryTaskCombinationAndHelperFields>(
      segments_to_durations,
      {
        durationArrOfCategoryTaskCombination: [],
        currentCategoryTaskCombination: ["", ""],
      }
    );
  return durationAndHelper.durationArrOfCategoryTaskCombination;
}
export function segments_to_durations(
  acc: DurationsOfCategoryTaskCombinationAndHelperFields,
  segment: SessionSegment,
  idx: number
): DurationsOfCategoryTaskCombinationAndHelperFields {
  if (idx === 0) {
    acc.durationArrOfCategoryTaskCombination.push({
      categoryName: segment.owner[0],
      taskId: segment.owner[1],
      duration: segment.duration,
      startTime: segment.startTime,
    });
    acc.currentCategoryTaskCombination[0] = segment.owner[0];
    acc.currentCategoryTaskCombination[1] = segment.owner[1];
    return acc;
  }

  // Check if this segment has the SAME owner as the current one
  if (
    segment.owner[0] === acc.currentCategoryTaskCombination[0] &&
    segment.owner[1] === acc.currentCategoryTaskCombination[1]
  ) {
    // Same owner - aggregate the duration if it's a focus type
    if (segment.type === "focus") {
      acc.durationArrOfCategoryTaskCombination[
        acc.durationArrOfCategoryTaskCombination.length - 1
      ].duration += segment.duration;
    }
  } else {
    // Different owner - create a new entry
    const newDuration = {
      categoryName: segment.owner[0],
      taskId: segment.owner[1],
      duration: segment.type === "focus" ? segment.duration : 0,
      startTime: segment.startTime,
    };
    acc.durationArrOfCategoryTaskCombination.push(newDuration);
    acc.currentCategoryTaskCombination = [segment.owner[0], segment.owner[1]];
  }

  return acc;
}
//#endregion task & category
//#region by task
/**
 * Aggregates focus durations by taskId only (ignores category).
 * Only "focus" segments are counted.
 */
export function getTaskDurationMapFromSegments(
  segments: SessionSegment[]
): Map<string, number> {
  const TaskDurationMap = segments.reduce(
    (acc: Map<string, number>, segment: SessionSegment) => {
      const taskId = segment.owner[1];
      if (segment.type !== "focus" || !taskId) return acc;

      if (acc.has(taskId)) {
        // If the taskId already exists, add the duration to the existing value
        acc.set(taskId, acc.get(taskId)! + segment.duration);
      } else {
        acc.set(taskId, segment.duration);
      }

      return acc;
    },
    new Map<string, number>()
  );

  return TaskDurationMap;
}
export function segments_to_task_durations(
  acc: Map<string, TaskDuration>,
  segment: SessionSegment
): Map<string, TaskDuration> {
  const taskId = segment.owner[1];
  if (segment.type !== "focus" || !taskId) return acc;

  if (acc.has(taskId)) {
    acc.get(taskId)!.duration += segment.duration;
  } else {
    acc.set(taskId, { duration: segment.duration });
  }

  return acc;
}
//#endregion by task
//#endregion

//#region durations to pomoRecords
export function makePomoRecordsFromDurations(
  durations: Array<DurationOfCategoryTaskCombination>,
  startTime: number
  // userEmail: string  //! <-------------- 지웠음.
): PomodoroSessionDocument[] {
  const today = new Date(startTime);
  let LocaleDateString = `${
    today.getMonth() + 1
  }/${today.getDate()}/${today.getFullYear()}`;

  return convertMilliSecToMin2(durations).map(
    (val: DurationOfCategoryTaskCombination) => {
      // 카테고리가 uncategorized인 경우 category field를 넣지 않고,
      // 마찬가지로 taskId가 ""인 경우 task field를 넣지 않는다.

      let pomoRecord: PomodoroSessionDocument = {
        // userEmail, //! <-------------- 지웠음.
        duration: val.duration,
        startTime: val.startTime,
        date: LocaleDateString,
        isDummy: false,
      };

      if (val.categoryName !== "uncategorized") {
        pomoRecord = {
          ...pomoRecord,
          category: {
            name: val.categoryName,
          },
        };
      }

      //! none task is removed
      if (val.taskId !== "") {
        pomoRecord = {
          ...pomoRecord,
          task: {
            id: val.taskId,
          },
        };
      }

      return pomoRecord;
    }
  );
}
export function convertMilliSecToMin2(
  durationArrOfCategoryTaskCombination: DurationOfCategoryTaskCombination[]
) {
  return durationArrOfCategoryTaskCombination.map((val) => {
    // console.log(
    //   "<-------------------------------convertMilliSecToMin---------------------------------->"
    // );
    // console.log(val);
    return { ...val, duration: Math.floor(val.duration / (60 * 1000)) };
  });
}
//#endregion
