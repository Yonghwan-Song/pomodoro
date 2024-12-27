//#region //TODO - name this region

import { Goal } from "../../types/clientStatesType";

/**
 * 필요한 이유:
 *
 * 하루동안 있던 모든 pomodoro session들의 duration을 모두 더해 하루단위로 통계를 내서 그래프에 그리기 위해.
 *
 * { date: string; timestamp: number; dayOfWeek: string; } &
 *
 * { total: number; subtotalByCategory: CategorySubtotal; withoutCategory: number; }
 *
 */
export type DayStat = TimeRelated & DurationRelated;

/**
 * `timestampOfFirstDate` - represents the start of a day when the first pomodoro session was done in the week.
 */
export type WeekStat = {
  timestampOfFirstDate: number; // the timestamp of the first day a pomodoro session was done.
  weekNumber: number;
  year: number;
} & DurationRelated;

export type WeekStatWithGoal = WeekStat & {
  goal: Goal;
};

export type StatDataForGraph_DailyPomoStat = DayStat[]; //TODO 이거 이름이 좀 잘못된거 아니냐?... ForGraph는 아래에 있는 타입에서 다루는거잖아..
//TODO 이거는 그냥.. From Server아닌가....
//? 그런데 저 아래에 From Server가 또 있는데?.............저거는

// The total is optional since there might be some weekdays not coming yet.
// e.g. If today is Thu, the remaining three days should not have total properties
//      so that the area chart can only show data until today.
export type DayStatForGraph = TimeRelated & Partial<DurationRelated>;

export type DayStatWithGoal = DayStatForGraph & {
  goal: Goal & { gap: number };
};

type TimeRelated = {
  date: string;
  timestamp: number;
  dayOfWeek: string;
  weekNumber: number;
};

/**
 * Total means the sum of all focus durations done during a day.
 *
 * 필요한 이유:
 *
 * 예를 들면, 오늘이 화요일이면, 이번주의 나머지 5일에 대한 통계값은 그냥 0이라고 하기에 조금.. 애매하므로,
 * 그냥 아예 없애버리기로 했음. 그러면 그래프도 딱 화요일까지만 그려지고 average값을 계산하기에도 편함.
 */
type DurationRelated = {
  total: number;
  subtotalByCategory: CategorySubtotal;
  withoutCategory: number;
};
//#endregion

/**
 * 진짜 mongoDB에 있는 데에터를 가공 없이 직접 받아오기 위해
 * 타입을 똑같이 정의해서 받아오기만 하는거임. (타입스크립트 쓰고 있으니... 어쩔 수 없음:::...)
 */
export type PomodoroSessionDocument = {
  _id?: string;
  userEmail: string;
  duration: number;
  startTime: number;
  date: string;
  isDummy: boolean;
  category?: CategoryForStat;
  __v?: number;
};

/**
 * 진짜 mongoDB에 있는 데에터를 가공 없이 직접 받아오기 위해
 * 타입을 똑같이 정의해서 받아오기만 하는거임. (타입스크립트 쓰고 있으니... 어쩔 수 없음:::...)
 */
export type StatDataFromServer_PomoDocs = PomodoroSessionDocument[];

//TODO Why some of the properties here are optional unlike the Category schema definition; for example, userEmail is required in the schema but it is optional here.
export type CategoryForStat = {
  userEmail?: string;
  name: string; //<------------------
  _id?: string;
  color?: string;
  isCurrent?: boolean;
  isOnStat?: boolean;
  __v?: number;
};

/**
 * From https://www.typescriptlang.org/docs/handbook/2/objects.html,
 *
 * Why we use the index signature? -
 * Sometimes you don’t know all the names of a type’s properties ahead of time, but you do know the shape of the values.
 * In those cases you can use an index signature to describe the types of possible values,
 *
 */

/**
 * `[name: string]` - to directly access objects' data in the `calculateDailyPomodoroDuration()` (defined in the Statistics.tsx)
 *
 * `_uuid` is for the categories in the client side.
 */
export interface CategorySubtotal {
  [name: string]: {
    _uuid: string;
    duration: number;
    isOnStat: boolean;
  };
}

/**
 * 1. _uuid is not optional in F.E because it is used to distinguish different categories instead of _id in the mongodb.
 *
 * 2. addUUIDToCategory() is called inside the persistRequiredStatesToRunTimer() that is passed as a callback argument of useFetch() in UserContext.tsx
 */
export type CategoryDetail = {
  name: string;
  color: string;
  isOnStat: boolean;
  _uuid: string;
  isCurrent?: boolean;
};
