export type WeekArray = {
  date: string;
  dayOfWeek: string;
}[];

// Pomo means a focus duration(=== pomo duration, I used it interchangeably)
export type PomodoroSession = {
  userEmail: string;
  duration: number;
  startTime: number;
  date: string;
  isDummy: boolean;
};

// The total is optional since there might be some weekdays not coming yet.
// e.g. If today is Thu, the remaining three days should not have total properties
//      so that the area chart can only show data until today.
// WeekdayStat[] is used for AreaChart component.
export type DayStatForGraph = TimeRelated & Partial<DurationRelated>;

// Total means a sum of all focus durations done during a day.
export type DayStat = TimeRelated & DurationRelated;

type TimeRelated = {
  date: string;
  timestamp: number;
  dayOfWeek: string;
};

type DurationRelated = {
  total: number;
  withCategories: CategoryStat;
  withoutCategory: number;
};

export type PomodoroSessionDocument = {
  _id?: string;
  userEmail: string;
  duration: number;
  startTime: number;
  date: string;
  isDummy: boolean;
  category?: CategoryForStat;
  // category?: _Category;
  __v?: number;
};

//#region New
export interface _Category {
  _id: string;
  userEmail: string;
  name: string;
  color: string;
  isCurrent: boolean;
  isOnStat: boolean;
  __v?: number;
}

//* only name is required in the `calculateDailyPomodoroDuration()` at utilFunctions.ts
export type CategoryForStat = {
  name: string; //<------------------
  _id?: string;
  userEmail?: string;
  color?: string;
  isCurrent?: boolean;
  isOnStat?: boolean;
  __v?: number;
};
//#endregion

//#region Original
// export interface _Category {
//   _id: string;
//   userEmail: string;
//   name: string;
//   color: string;
//   isCurrent: boolean;

//   __v?: number;
// }

// export type CategoryForStat = {
//   _id: string;
//   userEmail: string;
//   name: string;
//   color: string;
//   isCurrent: boolean;
//   isOnStat: boolean;
//   __v?: number;
// };
//#endregion

//// interface CategoryStats {
// interface CategoryStat {
//   [name: string]: number;
// }

interface CategoryStat {
  [name: string]: {
    _uuid: string;
    duration: number;
    isOnStat: boolean;
  };
}

// type StatDataFromServer_PomoDocs = {
//   pomodoroDocs: PomodoroSessionDocument[];
//   cateInfoForStat: CategoryInfoForStat[];
// };
type StatDataFromServer_PomoDocs = PomodoroSessionDocument[];

// type StatDataForGraph_DailyPomoStat = {
//   pomodoroDailyStat: DayStat[];
//   cateInfoForStat: CategoryInfoForStat[];
// };
type StatDataForGraph_DailyPomoStat = DayStat[];

type CategoryInfoForStat = {
  name: string;
  color: string;
  isOnStat: boolean;
  // _uuid?: string;
  _uuid: string;
  isCurrent?: boolean;
};
