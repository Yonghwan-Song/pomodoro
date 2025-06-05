import {
  RESOURCE,
  SUB_SET,
  CURRENT_SESSION_TYPE,
  CURRENT_TASK_ID,
} from "../../../constants";
import {
  TaskChangeInfo,
  TodoistTasksWithFocusDuration,
} from "../../../types/todoistRelatedTypes";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import {
  TaskWithFocusDurationAndChildren,
  TodoistTasksTreeAndMap,
} from "../../../types/todoistRelatedTypes";

/**
 * Returns true if any descendant of `task` has id === currentTaskId
 */
export function hasDescendantWithId(
  task: TaskWithFocusDurationAndChildren,
  currentTaskId: string
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
    (s) => s.setTaskChangeInfoArray
  );
  const checkIfSessionIsNotStartedYet = useBoundedPomoInfoStore(
    (s) => s.checkIfSessionIsNotStartedYet
  );
  const taskChangeInfoArray = useBoundedPomoInfoStore(
    (s) => s.taskChangeInfoArray
  );
  const currentTaskId = useBoundedPomoInfoStore((s) => s.currentTaskId);

  //
  return async function handleTaskSelection(taskId: string, moment: number) {
    if (currentTaskId === taskId) return;

    const currentSessionType = sessionStorage.getItem(CURRENT_SESSION_TYPE);
    if (!currentSessionType) {
      alert("Please click the task again");
      return;
    }

    const sessionType = currentSessionType.toUpperCase();
    const isPomo = sessionType === "POMO";
    const isBreak = sessionType === "BREAK";

    // console.log("sessionType inside the useTaskSelectionHandler", sessionType);

    setCurrentTaskId(taskId);
    sessionStorage.setItem(CURRENT_TASK_ID, taskId);

    let newTaskChange: TaskChangeInfo;
    let shouldAddTaskChange = false;
    let shouldSetTaskChangeArray = false;
    let patchUrl = "";
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
      newTaskChange = {
        id: taskId,
        taskChangeTimestamp: taskChangeInfoArray[0].taskChangeTimestamp,
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
      console.error("Error handling task selection:", error);
    }
  };
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
  tasks: TodoistTasksWithFocusDuration[]
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
      { ...task, children: [] } // kinda.. creating a reference. (왜냐하면 JS object라)
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
  focusDuration: number
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
