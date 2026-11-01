import type { TaskTrackingDuration } from './todoistRelatedTypes';
import type { PomodoroSessionDocument } from '../Pages/Statistics/statRelatedTypes';

//#region Timer-Related
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
    record: {
      start: number;
      end: number | undefined; // why undefined? - end doesnt' exist until resuming a session
      // DESIGN: `| null` instead of `| undefined `
      // 1.reason은 null이 "이유 없음"이고, 문자열이 사용자가 적은 이유입니다.
      // 2. undefined나 없는 키는 JSON.stringify에서 빠져서, 서버에 도착하면 이유가 없었던 것과 구분이 안 됩니다.
      reason: string | null;
    }[];
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
  totalFocusDuration: number; // How much a user has been focused during the set of cycles that are supposed to be run at once togeter.
  cycleDuration: number; // The focus duration target of the current cycle.
  cycleStartTimestamp: number; // The start of the current cycle.
  veryFirstCycleStartTimestamp: number; // The beginning of the very first cycle of all the cycles that are supposed to be run as a whole because they are set to be like that in the setting.
  totalDurationOfSetOfCycles: number; // The sum of focus duration targets of the set of cycles.
};

export type CycleRecord = {
  /**
   * 실제 달성한 집중 비율 (Focus Ratio)
   * - 계산 위치:
   *   - `client/src/utils/anything.ts`의 `getCycleRecord()`
   *   - `client/src/Pages/Main/Timer-Related/TimerController/TimerController.tsx`의 `generateAndPushCycleRecord()`
   * - 계산식: `roundTo_X_DecimalPoints(totalFocusDurationInSec / cycleDurationInSec, 2)`
   *   (해당 사이클에서 실제 집중한 총 시간(초) / 사이클 전체 소요 시간(초))
   * - 참고: 목표 집중 비율(ratioTargeted)과의 비율은 `cycleAdherenceRate` (`ratio / ratioTargeted`)로 계산됨.
   */
  ratio: number; // 실제 달성한 ratio
  cycleAdherenceRate: number;
  start: number;
  end: number;
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
export type NewCategory = Omit<Category, '_id'>;

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
export type CategoryChangeInfo = Pick<Category, 'color' | '_uuid'> & {
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
export type RecType = {
  kind: 'pomo' | 'break';
  startTime: number;
  endTime: number;
  timeCountedDown: number;
  // NOTE: Timeline UI upgrade 방안
  // 1. 아래의 데이터들도 모두 시각화에 사용할 수 있음.
  // 2. 그리고 세션이 종료되면, `persistRecOfTodayToServer.ts`에서 계산하는 pomodoro records들이 있을텐데, 이것들이 포함하는 정보에는,
  // category와 task의 조합을 identifier로 이 세션을 pomodoro records로 쪼개는 것. 그런데 이 정보들 또한 앞으로 Timeline에 반영할 수 있으면 시각적으로 재미있을 것 같다.
  plannedDuration: number | null;
  editedDuration: number | null;
  // TODO: targetDuration이라고 여기에도 그리고 database에도 정의해두는게 그냥 깔끔하다.
  // targetDuration = plannedDuration + editedDuration.
  // 0< timeCountedDown <= targetDuration, 그리고 이 plannedDuration, targetDuration, timeCountedDown을 시간축에 모두 ms로 표현가능. 이게 정보임. In other words, information
  // 만약에 owner가 [X, A] -> [Y, B]로 되고 plannedDuration < targetDuration 그리고 timeCountedDown > plannedDuration 이면, 과연 두 owner중에 어떤 것이 이 세션이 planned보다 길어진 것에
  // 영향을 줬다고 판단할 수 있지? 없지.. 그냥 사실만 언급해줄 수 있을 뿐. 그리고, pause는 알아서 위의 duration들과 timeCountedDown 계산에서 적절히 제거되어서 착오 및 오류가 없나?
  isEarlyEnded: boolean;
  earlyEndReason: string | null;
  pause: TimerStateType['pause'];
};

export type KindOfDuration = 'pomo' | 'break' | 'pause';

export type BaseDuration = {
  startTime: number;
  endTime: number;
  duration: number;
};

export type WorkOrBreakDuration = BaseDuration & {
  subject: 'pomo' | 'break';
};

export type PauseDuration = BaseDuration & {
  subject: 'pause';
  pauseReason: string | null;
};

export type DurationType = WorkOrBreakDuration | PauseDuration;
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
  kind: 'category' | 'task' | 'pause' | 'endOfSession';
  subKind?: string | 'start' | 'end';
  timestamp: number;
  reason?: string | null;
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

export type SessionSegment = {
  owner: [string, string]; // [categoryName, taskId]
  duration: number;
  type: 'pause' | 'focus';
  startTime: number;
  reason?: string | null;
};

/**
 * POST /today-records 요청 시 서버(CreateTodayRecordDto)로 전송하는 최종 페이로드 규격
 * - 세션 기본 정보(RecType)를 100% 그대로 상속받고,
 * - 타임라인 세그먼트(segments)와 pomo 전용 통계 필드(pomodoroRecordArr, taskTrackingArr)를 결합합니다.
 */
export type CreateTodayRecordPayload = RecType & {
  segments: SessionSegment[];
  pomodoroRecordArr?: PomodoroSessionDocument[];
  taskTrackingArr?: TaskTrackingDuration[];
};

export type SegmentDurationsAndHelperFields = {
  segmentDurationArr: SessionSegment[];
  // following three are used to help calculate duration for each segment.
  currentOwner: [string, string]; // [categoryName, taskId];
  currentStartTime: number;
  currentType: 'pause' | 'focus';
  currentReason: string | null;
};

//#endregion
