import { create, StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import {
  AutoStartSettingType,
  Category,
  CategoryChangeInfo,
  DailyGoals,
  Goals,
  PomoSettingType,
  TimersStatesType,
} from "../types/clientStatesType";

/**
 * These states are required to run a timer; in other words, to run a session either it is a focus or a break.
 * Thus, both signed-in and non-signed-in users need them.
 */
interface TimerSliceStates {
  timersStates: TimersStatesType;
  pomoSetting: PomoSettingType | null;
  autoStartSetting: AutoStartSettingType | null;
}

interface CycleInfoSliceStates {
  currentCycleInfo: {
    totalFocusDuration: number;
    cycleDuration: number;
  };
}

interface CycleInfoSlice extends CycleInfoSliceStates {}

interface CategorySliceStates {
  categories: Category[];
  isUnCategorizedOnStat: boolean;
  colorForUnCategorized: string;
  categoryChangeInfoArray: CategoryChangeInfo[];
  doesItJustChangeCategory: boolean;
}

interface GoalSliceStates {
  goals: Goals;
}

interface GoalSlice extends GoalSliceStates {
  setWeeklyMinimum: (minimum: number) => void;
  setWeeklyIdeal: (ideal: number) => void;
  setDailyGoals: (dailyGoals: DailyGoals) => void;
}

interface TimerSlice extends TimerSliceStates {
  setPomoSetting: (pomoSetting: PomoSettingType | null) => void;
  setAutoStartSetting: (autoStartSetting: AutoStartSettingType | null) => void;
}

interface CategorySlice extends CategorySliceStates {
  setCategories: (categories: Category[]) => void;
  setIsUnCategorizedOnStat: (isUnCategorizedOnStat: boolean) => void;
  setColorForUnCategorized: (colorForUnCategorized: string) => void;
  setCategoryChangeInfoArray: (
    categoryChangeInfoArray: CategoryChangeInfo[]
  ) => void;
  setDoesItJustChangeCategory: (doesItJustChangeCategory: boolean) => void;
}

export type DataFromServer = {
  timersStates: TimersStatesType;
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
} & CycleInfoSliceStates &
  Omit<CategorySliceStates, "doesItJustChangeCategory"> &
  GoalSliceStates;

interface SharedSlice {
  populateExistingUserStates: (data: DataFromServer) => void;
  populateNonSignInUserStates: (
    data: TimerSliceStates & CycleInfoSliceStates
  ) => void;
}

const createTimerSlice: StateCreator<
  TimerSlice & CycleInfoSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  TimerSlice
> = (set) => ({
  pomoSetting: null,
  autoStartSetting: null,
  timersStates: {
    duration: 25,
    pause: {
      totalLength: 0,
      record: [],
    },
    repetitionCount: 0,
    running: false,
    startTime: 0,
  },
  setPomoSetting: (pomoSetting) =>
    set((state) => ({ pomoSetting }), undefined, "timer/setPomoSetting"),
  setAutoStartSetting: (autoStartSetting) =>
    set(
      (state) => ({ autoStartSetting }),
      undefined,
      "timer/setAutoStartSetting"
    ),
});

const createCycleInfoSlice: StateCreator<
  TimerSlice & CycleInfoSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  CycleInfoSlice
> = (set) => ({
  currentCycleInfo: {
    totalFocusDuration: 100 * 60,
    cycleDuration: 130 * 60,
  },
});

const createCategorySlice: StateCreator<
  TimerSlice & CycleInfoSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  CategorySlice
> = (set) => ({
  categories: [],
  isUnCategorizedOnStat: true,
  colorForUnCategorized: "#f04005",
  categoryChangeInfoArray: [],
  doesItJustChangeCategory: false,
  setCategories: (categories) =>
    set((state) => ({ categories }), undefined, "category/setCategories"),
  setIsUnCategorizedOnStat: (isUnCategorizedOnStat: boolean) =>
    set(
      (state) => ({ isUnCategorizedOnStat }),
      undefined,
      "category/setIsUnCategorizedOnStat"
    ),
  setColorForUnCategorized: (colorForUnCategorized: string) =>
    set(
      (state) => ({ colorForUnCategorized }),
      undefined,
      "category/setColorForUnCategorized"
    ),
  setCategoryChangeInfoArray: (categoryChangeInfoArray: CategoryChangeInfo[]) =>
    set(
      (state) => ({ categoryChangeInfoArray }),
      undefined,
      "category/setCategoryChangeInfoArray"
    ),
  setDoesItJustChangeCategory: (doesItJustChangeCategory: boolean) =>
    set(
      (state) => ({ doesItJustChangeCategory }),
      undefined,
      "category/setDoesItJustChangeCategory"
    ),
});

const createGoalSlice: StateCreator<
  TimerSlice & CycleInfoSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  GoalSlice
> = (set) => ({
  goals: {
    weeklyGoal: {
      minimum: 30,
      ideal: 40,
    },
    dailyGoals: [
      { minimum: 4, ideal: 6 },
      { minimum: 4, ideal: 6 },
      { minimum: 4, ideal: 6 },
      { minimum: 4, ideal: 6 },
      { minimum: 4, ideal: 6 },
      { minimum: 4, ideal: 6 },
      { minimum: 4, ideal: 6 },
    ],
  },
  setWeeklyMinimum: (minimum: number) =>
    set(
      (state) => {
        state.goals.weeklyGoal.minimum = minimum;
      },
      undefined,
      "goal/setWeeklyMinimum"
    ),
  setWeeklyIdeal: (ideal: number) =>
    set(
      (state) => {
        state.goals.weeklyGoal.ideal = ideal;
      },
      undefined,
      "goal/setWeeklyIdeal"
    ),
  setDailyGoals: (dailyGoals) =>
    set(
      (state) => {
        state.goals.dailyGoals = dailyGoals;
      },
      undefined,
      "goal/setDailyGoals"
    ),
});
const createSharedSlice: StateCreator<
  TimerSlice & CycleInfoSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  SharedSlice
> = (set) => ({
  populateExistingUserStates: (data) => {
    set(
      (state) => ({
        pomoSetting: data.pomoSetting,
        autoStartSetting: data.autoStartSetting,
        goals: data.goals,
        timersStates: data.timersStates,
        currentCycleInfo: data.currentCycleInfo,
        categories: data.categories,
        isUnCategorizedOnStat: data.isUnCategorizedOnStat,
        colorForUnCategorized: data.colorForUnCategorized,
        categoryChangeInfoArray: data.categoryChangeInfoArray,
      }),
      undefined,
      "shared/populate"
    );
  },
  populateNonSignInUserStates: (data) => {
    set(
      (state) => ({
        pomoSetting: data.pomoSetting,
        autoStartSetting: data.autoStartSetting,
        timersStates: data.timersStates,
        currentCycleInfo: data.currentCycleInfo,
      }),
      undefined,
      "timer/populateNonSignInUserStates"
    );
  },
});

export const useBoundedPomoInfoStore = create<
  TimerSlice & CycleInfoSlice & CategorySlice & GoalSlice & SharedSlice
>()(
  devtools(
    immer((...a) => ({
      ...createTimerSlice(...a),
      ...createCycleInfoSlice(...a),
      ...createCategorySlice(...a),
      ...createGoalSlice(...a),
      ...createSharedSlice(...a),
    }))
  )
);
