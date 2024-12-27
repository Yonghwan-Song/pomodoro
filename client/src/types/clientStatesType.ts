//#region Timer-Related
export type RequiredStatesToRunTimerType = {
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
  timersStates: TimersStatesType;
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
};

export type TimersStatesType = TimerStateType & PatternTimerStatesType;

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
};
//#endregion

//#region Category-Related
export interface Category {
  name: string;
  color: string;
  _id?: string;
  isCurrent: boolean;
  isOnStat: boolean;
  _uuid?: string;
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
 *           In other words, how much progress has been made by a previous category.
 *
 * @prop _uuid? - uncategorized -> no _uuid
 *
 */
export type CategoryChangeInfo = Pick<Category, "color" | "_uuid"> & {
  categoryName: string;
  categoryChangeTimestamp: number;
  progress: number;
};

/**
 * segmentProgress -
 * This represents the progress made by a category. It is calculated when switching from one category to another—for example, from category A to category B. Category B becomes the current category, and we need to display how much progress was made by category A during the current session. I named this 'segment progress' because it represents the progress made by category A, which is only a segment of the entire session.
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
 * For example, a pomodoro session can consist of one pomo, one pause, and one pomo in order
 * if a user pauses the timer once.
 */
export type SessionType = DurationType[];
//#endregion

export type BroadCastMessage = { evName: string; payload: any };
