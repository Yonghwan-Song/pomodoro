import {
  RESOURCE,
  SUB_SET,
  CURRENT_SESSION_TYPE,
  CURRENT_TASK_ID,
} from '../../../constants';
import {
  TaskChangeInfo,
  TodoistTasksWithFocusDuration,
} from '../../../types/todoistRelatedTypes';
import { axiosInstance } from '../../../axios-and-error-handling/axios-instances';
import {
  boundedPomoInfoStore,
  useBoundedPomoInfoStore,
} from '../../../zustand-stores/pomoInfoStoreUsingSlice';
import {
  TaskWithFocusDurationAndChildren,
  TodoistTasksTreeAndMap,
} from '../../../types/todoistRelatedTypes';

/**
 * Returns true if any descendant of `task` has id === currentTaskId
 */
export function hasDescendantWithId(
  task: TaskWithFocusDurationAndChildren,
  currentTaskId: string,
): boolean {
  if (!task.children || task.children.length === 0) return false;
  for (const child of task.children) {
    if (child.id === currentTaskId) return true;
    if (hasDescendantWithId(child, currentTaskId)) return true;
  }
  return false;
}

//TODO 그냥 이것만 바꾼다음에 export해서 공통으로 쓰면 되는건가?
//#region New
export function useTaskSelectionHandler() {
  const setCurrentTaskId = useBoundedPomoInfoStore((s) => s.setCurrentTaskId);
  const addTaskChangeInfo = useBoundedPomoInfoStore((s) => s.addTaskChangeInfo);
  const setTaskChangeInfoArray = useBoundedPomoInfoStore(
    (s) => s.setTaskChangeInfoArray,
  );
  const checkIfSessionIsNotStartedYet = useBoundedPomoInfoStore(
    (s) => s.checkIfSessionIsNotStartedYet,
  );
  const taskChangeInfoArray = useBoundedPomoInfoStore(
    (s) => s.taskChangeInfoArray,
  );
  const currentTaskId = useBoundedPomoInfoStore((s) => s.currentTaskId);

  //
  return async function handleTaskSelection(taskId: string, moment: number) {
    if (currentTaskId === taskId) return;

    const currentSessionType = sessionStorage.getItem(CURRENT_SESSION_TYPE);
    if (!currentSessionType) {
      alert('Please click the task again');
      return;
    }

    const sessionType = currentSessionType.toUpperCase();
    const isPomo = sessionType === 'POMO';
    const isBreak = sessionType === 'BREAK';

    // console.log("sessionType inside the useTaskSelectionHandler", sessionType);

    setCurrentTaskId(taskId);
    sessionStorage.setItem(CURRENT_TASK_ID, taskId);

    let newTaskChange: TaskChangeInfo;
    let shouldAddTaskChange = false;
    let shouldSetTaskChangeArray = false;
    let patchUrl = '';
    let patchData: any = {};

    if (isPomo && !checkIfSessionIsNotStartedYet()) {
      newTaskChange = { id: taskId, taskChangeTimestamp: moment };
      shouldAddTaskChange = true;
      patchUrl = RESOURCE.USERS + SUB_SET.CURRENT_TASK_ID;
      patchData = {
        currentTaskId: taskId,
        doesItJustChangeTask: false,
        changeTimestamp: moment,
      };
    } else if ((isPomo && checkIfSessionIsNotStartedYet()) || isBreak) {
      // console.log(
      //   "taskChangeInfoArray inside the useTaskSelectionHandler",
      //   taskChangeInfoArray
      // );
      const preservedTaskChangeTimestamp =
        taskChangeInfoArray[0]?.taskChangeTimestamp ?? 0;
      newTaskChange = {
        id: taskId,
        taskChangeTimestamp: preservedTaskChangeTimestamp,
      };
      shouldSetTaskChangeArray = true;
      patchUrl = RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY;
      patchData = {
        taskChangeInfoArray: [newTaskChange],
      };
    } else {
      // Unknown session type, do nothing
      return;
    }

    try {
      if (shouldAddTaskChange) {
        addTaskChangeInfo(newTaskChange);
      }
      if (shouldSetTaskChangeArray) {
        setTaskChangeInfoArray([newTaskChange]);
      }
      await axiosInstance.patch(patchUrl, patchData);
    } catch (error) {
      console.error('Error handling task selection:', error);
    }
  };
}

/**
 * 선택된 태스크가 Todoist에서 완료/삭제되어 최신 태스크 목록에 없다면,
 * "Run Without Task"를 누른 것과 같은 방식으로 선택을 해제한다.
 * 이걸 안 하면 사라진 태스크 id가 taskChangeInfoArray와 sessionStorage에 남아
 * 이번 세션과 다음 세션의 기록에 계속 붙는다.
 *
 * - 이미 시작한 POMO: 지금 시점부터 no-task 구간을 추가 (그 전 시간은 기존 태스크에 기록됨)
 * - 그 외(시작 전 POMO, BREAK, 세션 타입을 아직 모르는 새 탭): 배열을 no-task로 교체
 *
 * hook이 아닌 일반 함수라서 sync 직후나 앱 초기 로드처럼 React 밖에서도 호출할 수 있다.
 */
export async function deselectCurrentTaskIfRemoved(activeTaskIds: {
  has(id: string): boolean;
}) {
  const state = boundedPomoInfoStore.getState();
  const { currentTaskId, taskChangeInfoArray } = state;
  if (currentTaskId === '' || activeTaskIds.has(currentTaskId)) return;

  state.setCurrentTaskId('');
  sessionStorage.setItem(CURRENT_TASK_ID, '');

  const sessionType = sessionStorage
    .getItem(CURRENT_SESSION_TYPE)
    ?.toUpperCase();
  const moment = Date.now();

  try {
    if (sessionType === 'POMO' && !state.checkIfSessionIsNotStartedYet()) {
      state.addTaskChangeInfo({ id: '', taskChangeTimestamp: moment });
      await axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_TASK_ID, {
        currentTaskId: '',
        doesItJustChangeTask: false,
        changeTimestamp: moment,
      });
    } else {
      const noTaskChange: TaskChangeInfo = {
        id: '',
        taskChangeTimestamp: taskChangeInfoArray[0]?.taskChangeTimestamp ?? 0,
      };
      state.setTaskChangeInfoArray([noTaskChange]);
      await axiosInstance.patch(
        RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY,
        { taskChangeInfoArray: [noTaskChange] },
      );
    }
  } catch (error) {
    console.error('Error deselecting a removed task:', error);
  }
}
//#endregion
//#region Original
// export function useTaskSelectionHandler() {
//   const setCurrentTaskId = useBoundedPomoInfoStore((s) => s.setCurrentTaskId);
//   const addTaskChangeInfo = useBoundedPomoInfoStore((s) => s.addTaskChangeInfo);
//   const setTaskChangeInfoArray = useBoundedPomoInfoStore(
//     (s) => s.setTaskChangeInfoArray
//   );
//   const isSessionRunning = useBoundedPomoInfoStore(
//     (s) => s.timersStates.running
//   );

//   return async function handleTaskSelection(taskId: string, moment: number) {
//     const currentSessionType = sessionStorage.getItem(CURRENT_SESSION_TYPE);
//     if (!currentSessionType) {
//       alert("Please click the task again");
//       return;
//     }

//     const sessionType = currentSessionType.toUpperCase();
//     const isPomo = sessionType === "POMO";
//     const isBreak = sessionType === "BREAK";

//     setCurrentTaskId(taskId);
//     sessionStorage.setItem(CURRENT_TASK_ID, taskId);

//     let newTaskChange: TaskChangeInfo;
//     let shouldAddTaskChange = false;
//     let shouldSetTaskChangeArray = false;
//     let patchUrl = "";
//     let patchData: any = {};

//     if (isPomo && isSessionRunning) {
//       newTaskChange = { id: taskId, taskChangeTimestamp: moment };
//       shouldAddTaskChange = true;
//       patchUrl = RESOURCE.USERS + SUB_SET.CURRENT_TASK_ID;
//       patchData = {
//         currentTaskId: taskId,
//         doesItJustChangeTask: false,
//         changeTimestamp: moment,
//       };
//     } else if ((isPomo && !isSessionRunning) || isBreak) {
//       newTaskChange = { id: taskId, taskChangeTimestamp: 0 };
//       shouldSetTaskChangeArray = true;
//       patchUrl = RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO;
//       patchData = {
//         taskChangeInfoArray: [newTaskChange],
//       };
//     } else {
//       return;
//     }

//     try {
//       if (shouldAddTaskChange) {
//         addTaskChangeInfo(newTaskChange);
//       }
//       if (shouldSetTaskChangeArray) {
//         setTaskChangeInfoArray([newTaskChange]);
//       }
//       await axiosInstance.patch(patchUrl, patchData);
//     } catch (error) {
//       console.error("Error handling task selection:", error);
//     }
//   };
// }
//#endregion

//#region New - on my own
export function generateTaskDictionaryAndTree(
  tasks: TodoistTasksWithFocusDuration[],
): TodoistTasksTreeAndMap {
  if (tasks.length === 0) {
    return { rootTasks: [], taskMap: new Map() };
  }

  const taskDictionary = new Map<string, TaskWithFocusDurationAndChildren>();
  const taskTree: TaskWithFocusDurationAndChildren[] = [];

  // 1. Map for a task list where we can quickly look up a certain task
  tasks.forEach((task) => {
    taskDictionary.set(
      task.id,
      { ...task, children: [] }, // kinda.. creating a reference. (왜냐하면 JS object라)
    );
  });

  // 2. Tree structure for UI (뭔가.. 전통적인 node를 이용한 tree?... c++에서 배운 그런 느낌은 아님 그런데 tree는 맞는 것 같아)
  tasks.forEach((task) => {
    const node = taskDictionary.get(task.id)!;
    if (task.parentId && taskDictionary.has(task.parentId)) {
      taskDictionary.get(task.parentId)!.children!.push(node);
    } else {
      taskTree.push(node);
    }
  });

  // console.log("Organized Todoist tasks:");
  // console.log("Root tasks:", taskTree);
  // console.log("Task map", taskDictionary);

  return { rootTasks: taskTree, taskMap: taskDictionary };
}
//#endregion

//#region Origianl
// export function updateMatchingTaskInTree(
//   tasksInTheSameLevel: TaskWithFocusDurationAndChildren[],
//   taskId: string,
//   focusDuration: number
// ) {
//   tasksInTheSameLevel.forEach((task) => {
//     if (task.id === taskId) {
//       task.taskFocusDuration = (task.taskFocusDuration || 0) + focusDuration;
//     } else if (task.children?.length !== 0) {
//       updateMatchingTaskInTree(task.children!, taskId, focusDuration);
//     }
//   });
// }
//#endregion

//#region New with return statements
export function updateMatchingTaskInTree(
  tasksInTheSameLevel: TaskWithFocusDurationAndChildren[],
  taskId: string,
  focusDuration: number,
) {
  tasksInTheSameLevel.forEach((task) => {
    if (task.id === taskId) {
      // Base condition?..
      task.taskFocusDuration = (task.taskFocusDuration || 0) + focusDuration;
      return;
    } else if (task.children !== undefined) {
      if (task.children.length !== 0)
        updateMatchingTaskInTree(task.children!, taskId, focusDuration);
      else return;
    }
    return; // 일치하지도 않고 children도 없는 경우. :::... //? 맞겠지?
  });
}
//#endregion

//#region Original - Weird Name
// export function organizeTodoistTasksWithMap(
//   tasks: TodoistTasksWithFocusDuration[]
// ): TodoistTasksTreeAndMap {
//   const taskMap = new Map<string, TaskWithFocusDurationAndChildren>();
//   const rootTasks: TaskWithFocusDurationAndChildren[] = [];

//   // 1. Map for a task list where we can quickly look up a certain task
//   tasks.forEach((task) => {
//     taskMap.set(
//       task.id,
//       { ...task, children: [] } // kinda.. creating a reference. (왜냐하면 JS object라)
//     );
//   });

//   // 2. Tree structure for UI (뭔가.. 전통적인 node를 이용한 tree?... c++에서 배운 그런 느낌은 아님 그런데 tree는 맞는 것 같아)
//   tasks.forEach((task) => {
//     const node = taskMap.get(task.id)!;
//     if (task.parentId && taskMap.has(task.parentId)) {
//       taskMap.get(task.parentId)!.children!.push(node);
//     } else {
//       rootTasks.push(node);
//     }
//   });

//   console.log("Organized Todoist tasks:");
//   console.log("Root tasks:", rootTasks);
//   console.log("Task map", taskMap);

//   return { rootTasks, taskMap };
// }
//#endregion
