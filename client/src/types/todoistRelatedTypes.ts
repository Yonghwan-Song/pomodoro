import { Task } from "@doist/todoist-api-typescript";

export interface TaskWithFocusDurationAndChildren extends Task {
  children?: TaskWithFocusDurationAndChildren[];
  taskFocusDuration?: number;
}

export interface TodoistTasksWithFocusDuration extends Task {
  taskFocusDuration: number;
}

export type TaskChangeInfo = {
  id: string;
  taskChangeTimestamp: number;
};

export type TaskTrackingDuration = {
  taskId: string;
  duration: number;
};

// 트리+Map 동시 보관을 위한 타입
export type TodoistTasksTreeAndMap = {
  rootTasks: TaskWithFocusDurationAndChildren[];
  taskMap: Map<string, TaskWithFocusDurationAndChildren>;
};
