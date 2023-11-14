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

export type RequiredStatesToRunTimerType = {
  pomoSetting: PomoSettingType;
  timersStates: TimersStatesType;
  autoStartSetting: AutoStartSettingType;
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
