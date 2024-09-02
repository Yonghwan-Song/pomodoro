//#region Type definitions
export type InfoType = {
  kind: "category" | "pause" | "endOfSession";
  name?: string | "start" | "end";
  timestamp: number;
};
export type M = {
  c_duration_array: {
    categoryName: string;
    duration: number;
    startTime: number;
  }[];
  currentCategoryName: string;
};
export type NN = {
  durationArr: {
    owner: string; //! This is not optional since pause can also have its category. I mean we just can pause a session and the session has its category (including "uncategorized")
    duration: number;
    type: "pause" | "focus";
    startTime: number;
  }[];
  currentStartTime: number;
  currentType: "pause" | "focus";
  currentOwner: string;
};
export type _Duration = {
  owner: string;
  duration: number;
  type: "pause" | "focus";
  startTime: number;
};
//#endregion

//#region transform 1 - to get data sorted by timestamp.
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
  const categoryChanges = transformCategoryChanges(categoryChangeInfoArray);
  const pauseRecords = transformPauseRecords(pauseRecord);
  const data = [...categoryChanges, ...pauseRecords];
  data.sort((a, b) => a.timestamp - b.timestamp);
  data.push({ kind: "endOfSession", timestamp: endTime });
  return data;

  function transformCategoryChanges(
    categoryChangeInfoArray: {
      categoryName: string;
      categoryChangeTimestamp: number;
    }[]
  ): InfoType[] {
    return categoryChangeInfoArray.map((val) => ({
      kind: "category",
      name: val.categoryName,
      timestamp: val.categoryChangeTimestamp,
    }));
  }

  function transformPauseRecords(
    pauseRecords: { start: number; end: number }[]
  ): InfoType[] {
    return pauseRecords.flatMap((val) => [
      { kind: "pause", name: "start", timestamp: val.start },
      { kind: "pause", name: "end", timestamp: val.end },
    ]);
  }
}
//#endregion

//#region transform 2: duration for each category
//! reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
export function calculateDurationForEveryCategory(
  acc: NN,
  val: InfoType,
  idx: number,
  _array: InfoType[]
): NN {
  // 로직:
  // 1. currentValue가 이제 Info니까... 우선 그냥 timestamp이용해서 시간 간격을 계산한다.
  // 2. 그리고 이제 currentValue.kind가 무엇이냐에 따라서...
  if (idx === 0) {
    acc.currentOwner = val.name!;
    acc.currentStartTime = val.timestamp;
    return acc;
  }

  const duration_in_ms = val.timestamp - _array[idx - 1].timestamp;
  // const duration_in_min = Math.floor(duration_in_ms / (60 * 1000));

  switch (val.kind) {
    case "pause":
      if (val.name === "start") {
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "pause";
        acc.currentStartTime = val.timestamp;
      }
      if (val.name === "end") {
        acc.durationArr.push({
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
      acc.durationArr.push({
        owner: acc.currentOwner,
        duration: duration_in_ms,
        type: acc.currentType,
        startTime: acc.currentStartTime,
      });
      acc.currentOwner = val.name!;
      acc.currentStartTime = val.timestamp;
      break;
    case "endOfSession":
      if (duration_in_ms !== 0)
        // A session is forcibly ended by a user during a pause.
        acc.durationArr.push({
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
export function aggregateFocusDurationOfTheSameCategory(
  prev: M,
  val: _Duration,
  idx: number
  // array: _Duration[],
) {
  if (idx === 0) {
    prev.c_duration_array.push({
      categoryName: val.owner,
      duration: val.duration,
      startTime: val.startTime,
    });
    prev.currentCategoryName = val.owner;

    return prev;
  }

  if (val.owner === prev.currentCategoryName) {
    if (val.type === "focus") {
      prev.c_duration_array[prev.c_duration_array.length - 1].duration +=
        val.duration;
    }
  }

  if (val.owner !== prev.currentCategoryName) {
    const newDuration = {
      categoryName: val.owner,
      duration: val.type === "focus" ? val.duration : 0, // pause 도중에 다른 카테고리로 바꿨다면, 처음 duration이 pause.
      startTime: val.startTime,
    };
    prev.c_duration_array.push(newDuration);
    prev.currentCategoryName = val.owner;
  }

  return prev;
}

export function convertMilliSecToMin(
  durationByCategoryArr: M["c_duration_array"]
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
