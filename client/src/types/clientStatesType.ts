//#region Timer-Related
export type RequiredStatesToRunTimerType = {
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
  timersStates: TimersStatesType;
  currentCycleInfo: CycleInfoType;
  categories: Category[];
  isUnCategorizedOnStat: boolean;
  colorForUnCategorized: string;
  categoryChangeInfoArray: CategoryChangeInfo[];
  doesItJustChangeCategory?: boolean;
};

export type PomoSettingType = {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  numOfCycle: number;
};

export type TimersStatesType = TimerStateType & PatternTimerStatesType;
export type TimersStatesTypeWithCurrentCycleInfo = TimersStatesType & {
  currentCycleInfo: CycleInfoType;
};

export type TimerStateType = {
  running: boolean;
  startTime: number;
  pause: {
    totalLength: number;
    record: { start: number; end: number | undefined }[]; // 8개월 전 "Fix #35" commit하면서 중간에 end timer 버튼 누르면 end에 now값 들어가게 바꿨는데
    // 여기서  undefined를 없애도 되는지는 잘 모르겠어. documenation을 제대로 안해놔서 모르는건가.
  };
};

export type PatternTimerStatesType = {
  duration: number;
  repetitionCount: number;
};

export type AutoStartSettingType = {
  doesPomoStartAutomatically: boolean;
  doesBreakStartAutomatically: boolean;
  doesCycleStartAutomatically: boolean;
};

export type CycleInfoType = {
  totalFocusDuration: number;
  cycleDuration: number;
  cycleStartTimestamp: number;
  veryFirstCycleStartTimestamp: number;
  totalDurationOfSetOfCycles: number;
};

export type CycleRecord = {
  ratio: number; // 실제 달성한 ratio
  cycleAdherenceRate: number;
  start: number;
  end: number;
  date: Date;
};

export interface CycleSetting {
  name: string;
  isCurrent: boolean;
  pomoSetting: PomoSettingType;
  cycleStat: CycleRecord[];
  averageAdherenceRate: number;
}
//#endregion

//#region Category-Related
export interface Category {
  name: string;
  color: string;
  _id?: string;
  isCurrent: boolean;
  isOnStat: boolean;
  _uuid?: string; //! 이게 정말 없으면 안되었던 경우는 errController에서 patch request body를 merge할 때, name을 여러번 바꾸는 경우에 필요했음.
  //! 그 외에도 뭔가 name을 바꾸는 경우에 한계가 있어서 이게 필요했는데... 뭔가 더 생각해봐야할듯.
}

/**
 * At the moment we create a new category in this front end, we don't know what the _id is going to be
 * because it is assigned by MongoDB in the database when the category is saved.
 * !Thus, a _uuid is used to uniquely identify categories on the front end before saving them to the database.
 * !It serves as a temporary identifier to distinguish different categories.
 */
export type NewCategory = Omit<Category, "_id">;

/**
 * @prop progress - a number that represents how much progress has been made in the current session until this category starts.
 *           In other words, how much progress has been made by previous categories.
 *
 * @prop _uuid? - uncategorized -> no _uuid
 *
 * 예를 들면, 카테고리를 C로 바꾼다고 할 때,
 * categoryName === C
 * categoryChangeTimestamp - 바뀐 순간의 timestamp
 * progress - total progress that has been made until this category change.
 * ;이전 카테고리가 A, B라고 하면 A와 B에 의해 세션이 진행된 값.
 *     예를 들면, 1시간에서 처음 15분과 다음 15분을 각각 A와 B로 진행했다고 하면,
 *    progress 는 0.5
 */
export type CategoryChangeInfo = Pick<Category, "color" | "_uuid"> & {
  categoryName: string;
  categoryChangeTimestamp: number;
  progress: number;
};

/**
 * segmentProgress -
 * This represents the progress made by a category.
 * It is calculated when switching from one category to another.
 * For example, when the current category changes from category A to category B,
 * we need to display how much progress was made by the category A.
 * I named the progress 'segment progress'
 * because the progress made by category A is only a part of the entire progress which includes A and B.
 */
export type CategoryChangeInfoForCircularProgressBar = CategoryChangeInfo & {
  segmentProgress: number;
};
//#endregion

//#region Goal-Related
export interface Goals {
  weeklyGoal: Goal;
  dailyGoals: DailyGoals;
}

export interface Goal {
  minimum: number;
  ideal: number;
}

// I will not create dayOfWeek property for each element here
// because we can change easily whether weekdays should start from "Mon" or "Sun" by creating different days array.
export type DailyGoals = [Goal, Goal, Goal, Goal, Goal, Goal, Goal];
//#endregion

//#region Timeline-Related
export type RecType = Omit<TimerStateType, "running"> & {
  kind: "pomo" | "break";
  endTime: number;
  timeCountedDown: number;
};

export type KindOfDuration = "pomo" | "break" | "pause";
export type DurationType = {
  startTime: number;
  endTime: number;
  subject: KindOfDuration;
  duration: number;
};
/**
 * For example, if a user pauses the timer once, a pomodoro session can consist of
 * some durations such as, one pomo, one pause, and one pomo in order.
 */
export type SessionType = DurationType[];
//#endregion

//#region Pomodoro Session을 persist하기 전에 형태를 변환하는 것에 관한 타입들
// SessionState Change - pause, category change, and the end of session.

//* kind와 name의 조합이 어떤 의미인지
// 1. kind가 category일 때는 name이 categoryName.
// 2. kind가 pause일 때는 name은 start과 end값 둘중 하나인데, pause의 시작과 끝을 의미한다.

// Original
// export type InfoOfSessionStateChange = {
//   kind: "category" | "pause" | "endOfSession";
//   name?: string | "start" | "end";
//   timestamp: number;
// };

// New one that also combines the taskChangeInfoArray's elements
export type InfoOfSessionStateChange = {
  kind: "category" | "task" | "pause" | "endOfSession";
  subKind?: string | "start" | "end";
  timestamp: number;
};
export type CategoryDurationsAndHelperFields = {
  categoryDurationArr: CategoryDuration[];
  currentCategoryName: string;
};
export type CategoryDuration = {
  categoryName: string;
  duration: number;
  startTime: number; // pause일때 시작되었을 수도 있다는 것을 잊으면 안됨.
};

export type DurationsOfCategoryTaskCombinationAndHelperFields = {
  durationArrOfCategoryTaskCombination: DurationOfCategoryTaskCombination[];
  currentCategoryTaskCombination: [string, string]; // [categoryName, taskId]
};
export type DurationOfCategoryTaskCombination = {
  categoryName: string;
  taskId: string;
  duration: number;
  startTime: number; // pause일때 시작되었을 수도 있다는 것을 잊으면 안됨.
};

export type SegmentDuration = {
  owner: string; //! This is not optional since pause can also have its category. I mean we just can pause a session and the session has its category (including "uncategorized")
  duration: number;
  type: "pause" | "focus";
  startTime: number;
};

export type SessionSegment = {
  owner: [string, string]; // [taskId, categoryName]
  duration: number;
  type: "pause" | "focus";
  startTime: number;
};

//! 이게 Session의 핵심 정보이고 활용가치가 가장 좋은 데이터 형태임.
export type SegmentDurationsAndHelperFields = {
  segmentDurationArr: SegmentDuration[];
  // following three are used to help calculate duration for each segment.
  currentOwner: string;
  currentStartTime: number;
  currentType: "pause" | "focus";
};

export type SegmentDurationsAndHelperFields2 = {
  segmentDurationArr: SessionSegment[];
  // following three are used to help calculate duration for each segment.
  currentOwner: [string, string]; // [taskId, categoryName];
  currentStartTime: number;
  currentType: "pause" | "focus";
};

export type TaskDuration = {
  // taskId: string; // Map의 key로 하기로 했음.
  duration: number;
};

export type TaskTrackingDocument = {
  taskId: string;
  duration: number;
};

//#endregion
export type BroadCastMessage = { evName: string; payload: any };
