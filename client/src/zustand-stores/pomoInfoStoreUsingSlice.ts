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

// This is required for both signed-in and non-signed-in users.
interface TimerSliceStates {
  timersStates: TimersStatesType;
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
}

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
  setPomoSetting: (pomoSetting: PomoSettingType) => void;
  setAutoStartSetting: (autoStartSetting: AutoStartSettingType) => void;
  populateNonSignInUserStates: (data: TimerSliceStates) => void;
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

export type DataFromServer = TimerSliceStates &
  Omit<CategorySliceStates, "doesItJustChangeCategory"> &
  GoalSliceStates;

interface SharedSlice {
  populateExisitingUserStates: (data: DataFromServer) => void;
}

const createTimerSlice: StateCreator<
  TimerSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  TimerSlice
> = (set) => ({
  pomoSetting: {
    pomoDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    numOfPomo: 4,
  },
  autoStartSetting: {
    doesPomoStartAutomatically: false,
    doesBreakStartAutomatically: false,
  },
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
  populateNonSignInUserStates: (data) => {
    set(
      (state) => ({
        pomoSetting: data.pomoSetting,
        autoStartSetting: data.autoStartSetting,
        timersStates: data.timersStates,
      }),
      undefined,
      "timer/populateNonSignInUserStates"
    );
  },
});

const createCategorySlice: StateCreator<
  TimerSlice & CategorySlice & GoalSlice & SharedSlice,
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
  TimerSlice & CategorySlice & GoalSlice & SharedSlice,
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
  TimerSlice & CategorySlice & GoalSlice & SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  SharedSlice
> = (set) => ({
  populateExisitingUserStates: (data) => {
    set(
      (state) => ({
        pomoSetting: data.pomoSetting,
        autoStartSetting: data.autoStartSetting,
        goals: data.goals,
        timersStates: data.timersStates,
        categories: data.categories,
        isUnCategorizedOnStat: data.isUnCategorizedOnStat,
        colorForUnCategorized: data.colorForUnCategorized,
        categoryChangeInfoArray: data.categoryChangeInfoArray,
      }),
      undefined,
      "shared/populate"
    );
  },
});

export const useBoundedPomoInfoStore = create<
  TimerSlice & CategorySlice & GoalSlice & SharedSlice
>()(
  devtools(
    immer((...a) => ({
      ...createTimerSlice(...a),
      ...createCategorySlice(...a),
      ...createGoalSlice(...a),
      ...createSharedSlice(...a),
    }))
  )
);
