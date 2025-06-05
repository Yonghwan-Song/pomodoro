import { create, StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import {
  AutoStartSettingType,
  Category,
  CategoryChangeInfo,
  CycleSetting,
  DailyGoals,
  Goals,
  PomoSettingType,
  TaskTrackingDocument,
  TimersStatesType,
} from "../types/clientStatesType";
import {
  TaskChangeInfo,
  TodoistTasksWithFocusDuration,
  TaskWithFocusDurationAndChildren,
} from "../types/todoistRelatedTypes";
import {
  generateTaskDictionaryAndTree,
  updateMatchingTaskInTree,
} from "../Pages/Main/Todoist-Related/todoist-utility";

/**
 * These states are required to run a timer; in other words, to run a session either it is a focus or a break.
 *! Thus, both signed-in and non-signed-in users need these states. (cycleSettings are not required for non-signed-in users)
 */
interface TimerSliceStates {
  timersStates: TimersStatesType;
  pomoSetting: PomoSettingType | null;
  autoStartSetting: AutoStartSettingType | null;
  cycleSettings: Array<CycleSetting>;
}

interface CycleInfoSliceStates {
  currentCycleInfo: {
    totalFocusDuration: number;
    cycleDuration: number;
    cycleStartTimestamp: number;
    veryFirstCycleStartTimestamp: number;
    totalDurationOfSetOfCycles: number;
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
  setCycleSettings: (cycleSettings: Array<CycleSetting>) => void;
  setTimersStates: (timersStates: TimersStatesType) => void;
  setTimersStatesPartial: (partial: Partial<TimersStatesType>) => void;
  checkIfSessionIsNotStartedYet: () => boolean;
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

//#region Todoist Integration Slice
interface TodoistIntegrationSliceStates {
  isTodoistIntegrationEnabled: boolean;
  //! New ones
  taskTreeForUI: Array<TaskWithFocusDurationAndChildren>;

  /**
   *! What an empty string means for the currentTaskId:
   *
   * "" means either nothing or the fact that a user didn't choose a task for the current session yet.
   * The former is ture only when the user doesn't choose to integrate the todoist.
   * setTaskChangeInfoArray([{ id: "", taskChangeTimestamp: 0 }]);
   * setCurrentTaskId("");
   *
   */
  // Session 도중에 어떤 task를 진행했는지 추적하기 위해 필요한 것들
  taskChangeInfoArray: TaskChangeInfo[];
  currentTaskId: string;
}

interface TodoistIntegrationSlice extends TodoistIntegrationSliceStates {
  setIsTodoistIntegrationEnabled: (enabled: boolean) => void;
  setTaskChangeInfoArray: (arr: TaskChangeInfo[]) => void;
  addTaskChangeInfo: (info: TaskChangeInfo) => void;
  setCurrentTaskId: (id: string) => void;
  updateTaskTreeForUI: (pairs: TaskTrackingDocument[]) => void; //!<------------
  setTaskTreeForUI: (tree: Array<TaskWithFocusDurationAndChildren>) => void;
}

const createTodoistIntegrationSlice: StateCreator<
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  TodoistIntegrationSlice
> = (set) => ({
  isTodoistIntegrationEnabled: false,
  taskTreeForUI: [],
  taskChangeInfoArray: [],
  currentTaskId: "",
  setIsTodoistIntegrationEnabled: (enabled) =>
    set(
      { isTodoistIntegrationEnabled: enabled },
      undefined,
      "todoist/setIsTodoistIntegrationEnabled"
    ),
  setTaskChangeInfoArray: (arr) => {
    set(
      { taskChangeInfoArray: arr },
      undefined,
      "todoist/setTaskChangeInfoArray"
    );
  },
  addTaskChangeInfo: (info) =>
    set(
      (state) => {
        return {
          taskChangeInfoArray: [...state.taskChangeInfoArray, info],
        };
      },
      undefined,
      "todoist/addTaskChangeInfo"
    ),
  setCurrentTaskId: (id: string) =>
    set({ currentTaskId: id }, undefined, "todoist/setCurrentTaskId"),
  updateTaskTreeForUI: (pairs) => {
    set(
      (states) => {
        for (const { taskId, duration } of pairs) {
          updateMatchingTaskInTree(states.taskTreeForUI, taskId, duration);
        }
      },
      undefined,
      "todoist/updateTaskTreeForUI"
    );
  },
  setTaskTreeForUI: (tree) =>
    set({ taskTreeForUI: tree }, undefined, "todoist/setTaskTreeUI"),
});
//#endregion

export type DataFromServer = {
  timersStates: TimersStatesType;
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
  cycleSettings: Array<CycleSetting>;
} & CycleInfoSliceStates &
  Omit<CategorySliceStates, "doesItJustChangeCategory"> &
  GoalSliceStates &
  TodoistIntegrationSliceStates & {
    todoistTasks: TodoistTasksWithFocusDuration[];
  };

interface SharedSlice {
  populateExistingUserStates: (data: DataFromServer) => void;
  populateNonSignInUserStates: (
    // data: TimerSliceStates & CycleInfoSliceStates
    data: Omit<TimerSliceStates, "cycleSettings"> & CycleInfoSliceStates
  ) => void;
}

const createTimerSlice: StateCreator<
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  TimerSlice
> = (set, get) => ({
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
  cycleSettings: [],
  setPomoSetting: (pomoSetting) =>
    set((state) => ({ pomoSetting }), undefined, "timer/setPomoSetting"),
  setAutoStartSetting: (autoStartSetting) =>
    set(
      (state) => ({ autoStartSetting }),
      undefined,
      "timer/setAutoStartSetting"
    ),
  setCycleSettings: (cycleSettings) =>
    set((state) => ({ cycleSettings }), undefined, "timer/setCycleSettings"),
  setTimersStates: (timersStates) =>
    set((state) => ({ timersStates }), undefined, "timer/setTimersStates"),
  setTimersStatesPartial: (partial) =>
    set(
      (state) => ({
        timersStates: { ...state.timersStates, ...partial },
      }),
      undefined,
      "timer/updateTimersStatesPartial"
    ),
  checkIfSessionIsNotStartedYet: () => {
    const timersStates = get().timersStates;
    return !timersStates.running && timersStates.startTime === 0; //? I think running is always false when startTime is 0.
    //? startTime is not 0 -> 1) running === true: session is running 2) running === false: session is paused.
  },
});

const createCycleInfoSlice: StateCreator<
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  CycleInfoSlice
> = (set) => ({
  currentCycleInfo: {
    totalFocusDuration: 100 * 60,
    cycleDuration: 130 * 60,
    cycleStartTimestamp: 0,
    veryFirstCycleStartTimestamp: 0,
    totalDurationOfSetOfCycles: 130 * 60,
  },
});

const createCategorySlice: StateCreator<
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice,
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
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice,
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
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  SharedSlice
> = (set) => ({
  populateExistingUserStates: (data: DataFromServer) => {
    set(
      (state) => {
        //* For now, we do not care about whether a user's todoistIntegration is enabled or not.
        //* If it is disabled, data.currentTaskId will just be "".
        sessionStorage.setItem("currentTaskId", data.currentTaskId);

        // [{ id: null, taskChangeTimestamp: 0 }] - default value
        let taskChangeInfoArray: TaskChangeInfo[] = [];
        if (data.isTodoistIntegrationEnabled) {
          if (data.taskChangeInfoArray.length === 0)
            taskChangeInfoArray = [{ id: "", taskChangeTimestamp: 0 }];
          else taskChangeInfoArray = data.taskChangeInfoArray;
        }

        const todoistTasksTreeAndMap = generateTaskDictionaryAndTree(
          data.todoistTasks
        );
        const { rootTasks, taskMap } = todoistTasksTreeAndMap;

        return {
          cycleSettings: data.cycleSettings,
          pomoSetting: data.pomoSetting,
          autoStartSetting: data.autoStartSetting,
          goals: data.goals,
          timersStates: data.timersStates,
          currentCycleInfo: data.currentCycleInfo,
          categories: data.categories,
          isUnCategorizedOnStat: data.isUnCategorizedOnStat,
          colorForUnCategorized: data.colorForUnCategorized,
          categoryChangeInfoArray: data.categoryChangeInfoArray,
          isTodoistIntegrationEnabled: data.isTodoistIntegrationEnabled,
          taskTreeForUI: rootTasks,
          taskChangeInfoArray,
          currentTaskId: data.currentTaskId,
        };
      },
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
  TimerSlice &
    CycleInfoSlice &
    CategorySlice &
    GoalSlice &
    TodoistIntegrationSlice &
    SharedSlice
>()(
  devtools(
    immer((...a) => ({
      ...createTimerSlice(...a),
      ...createCycleInfoSlice(...a),
      ...createCategorySlice(...a),
      ...createGoalSlice(...a),
      ...createTodoistIntegrationSlice(...a),
      ...createSharedSlice(...a),
    }))
  )
);

// Export store API separately
export const boundedPomoInfoStore = useBoundedPomoInfoStore;
