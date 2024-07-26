export type TimerStateType = {
  running: boolean;
  startTime: number;
  pause: {
    totalLength: number;
    record: { start: number; end: number | undefined }[];
  };
};

export type PatternTimerStatesType = {
  duration: number;
  repetitionCount: number;
};

export type TimersStatesType = TimerStateType & PatternTimerStatesType;

export type PomoSettingType = {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
};

export type AutoStartSettingType = {
  doesPomoStartAutomatically: boolean;
  doesBreakStartAutomatically: boolean;
};

export interface Category {
  name: string;
  color: string;
  _id?: string;
  isCurrent: boolean;
  isOnStat: boolean;
  _uuid?: string;
}
export interface Category_new_candidate_for_stat_showing_purpose {
  _id?: string;
  isCurrent: boolean;

  // these three are the main (properties)
  name: string;
  color: string;
  isOnStat?: boolean;
}

export type CategoryInfoTweakeFroStatPurpose = {
  name: string;
  color: string;
  isOnStat: boolean; //<-----
};

export type NewCategory = Omit<Category, "_id">; // _id is not generated yet by the mongodb since it is a new one to be added later by server.

export type RequiredStatesToRunTimerType = {
  pomoSetting: PomoSettingType;
  timersStates: TimersStatesType;
  autoStartSetting: AutoStartSettingType;
  categories: Category[];
  isUnCategorizedOnStat: boolean;
};

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
