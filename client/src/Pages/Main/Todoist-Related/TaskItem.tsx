import { Task } from "@doist/todoist-api-typescript";
import styled from "styled-components";
import {
  TaskChangeInfo,
  TaskWithFocusDurationAndChildren,
} from "../../../types/todoistRelatedTypes";
import React, { useEffect, useState } from "react";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import {
  COLOR_FOR_CURRENT_STH,
  CURRENT_SESSION_TYPE,
  CURRENT_TASK_ID,
  RESOURCE,
  SUB_SET,
} from "../../../constants";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import { useTaskSelectionHandler } from "./todoist-utility";

const TaskContainer = styled.div`
  margin-bottom: 0.5rem;
`;

const TaskCard = styled.div<{ priority: Task["priority"] }>`
  padding: 0.75rem;
  border-radius: 0.375rem;
  background-color: ${({ priority }) => {
    switch (priority) {
      case 4:
        return "#FEE2E2";
      case 3:
        return "#FEF3C7";
      case 2:
        return "#DBEAFE";
      default:
        // return "#F3F4F6";
        return "#e5e7eb";
    }
  }};
`;

const TaskHeader = styled.div`
  display: flex;
  align-items: center;
`;

const ButtonOrSpacer = styled.div`
  margin-right: 0.5rem;
  width: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ExpandButton = styled.button`
  all: unset;
  cursor: pointer;
`;

const TaskContent = styled.div`
  flex: 1;
`;

// const TaskTitle = styled.span<{ isCurrent?: boolean }>` //? optional로 안해도 되지 않아?
//#region Original
const TaskTitle = styled.span<{ isCurrent: boolean }>`
  display: inline-block;
  font-weight: 500;
  cursor: pointer;
  border-radius: ${({ isCurrent }) => isCurrent && "4px"};
  /* padding: ${({ isCurrent }) => isCurrent && "4px"}; */
  padding: ${({ isCurrent }) => isCurrent && "9px"};
  border: ${({ isCurrent }) =>
    isCurrent ? `1px solid ${COLOR_FOR_CURRENT_STH}` : "none"};
`;
//#endregion

//#region New with inline-flex -- 그냥 그게 그거 같은데?
// const TaskTitle = styled.span<{ isCurrent: boolean }>`
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   font-weight: 500;
//   cursor: pointer;
//   border-radius: ${({ isCurrent }) => isCurrent && "4px"};
//   padding: ${({ isCurrent }) => isCurrent && "4px"};
//   border: ${({ isCurrent }) =>
//     isCurrent ? `1px solid ${COLOR_FOR_CURRENT_STH}` : "none"};
// `;
//#endregion

// text-decoration: ${({ isCurrent: isSelected }) =>
//   isSelected ? "underline" : "none"};
// color: ${({ isCurrent }) => (isCurrent ? COLOR_FOR_CURRENT_STH : "#111827")};

const TaskDescription = styled.p`
  font-size: 0.875rem;
  color: #4b5563;
  margin-top: 0.25rem;
`;

const TaskDueDate = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
`;

const ChildrenContainer = styled.div`
  margin-left: 2rem;
  margin-top: 0.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid #e5e7eb;
`;

const TaskFocusDuration = styled.span`
  display: inline-block;
  margin-left: 0.75rem;
  background: #f3f4f6;
  color: #6366f1;
  font-size: 0.85em;
  font-weight: 500;
  border-radius: 0.5em;
  padding: 2px 8px;
`;

// Helper function to format duration
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) {
    return `${h}h ${m}min`;
  } else if (h > 0) {
    return `${h}h`;
  } else {
    return `${m}min`;
  }
}

export const TaskItem = ({
  task,
  expandedIds,
  isExpanded,
}: {
  task: TaskWithFocusDurationAndChildren;
  expandedIds: Set<string>;
  isExpanded: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const currentTaskId = useBoundedPomoInfoStore(
    (states) => states.currentTaskId
  );
  const taskChangeInfoArray = useBoundedPomoInfoStore(
    (states) => states.taskChangeInfoArray
  );
  const setCurrentTaskId = useBoundedPomoInfoStore(
    (states) => states.setCurrentTaskId
  );
  const addTaskChangeInfo = useBoundedPomoInfoStore(
    (states) => states.addTaskChangeInfo
  );
  const setTaskChangeInfoArray = useBoundedPomoInfoStore(
    (states) => states.setTaskChangeInfoArray
  );
  const checkIfSessionIsNotStartedYet = useBoundedPomoInfoStore(
    (states) => states.checkIfSessionIsNotStartedYet
  );

  // New Way
  const handleTaskSelection = useTaskSelectionHandler();

  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  const handleTaskClick = (
    ev: React.MouseEvent<HTMLSpanElement>,
    moment: number
  ) => {
    if (currentTaskId === task.id) return;

    const currentSessionType = sessionStorage.getItem(CURRENT_SESSION_TYPE);
    if (currentSessionType === null) {
      alert("Please click the task again");
      return;
    }

    const sessionType = currentSessionType.toUpperCase();
    const isPomo = sessionType === "POMO";
    const isBreak = sessionType === "BREAK";

    console.log("sessionType", sessionType);

    // Always update currentTaskId and sessionStorage
    setCurrentTaskId(task.id);
    sessionStorage.setItem(CURRENT_TASK_ID, task.id);

    // Decide on the TaskChangeInfo and which actions to take
    let newTaskChange: TaskChangeInfo;
    let shouldAddTaskChange = false;
    let shouldSetTaskChangeArray = false;
    let patchUrl = "";
    let patchData: any = {};

    //* IMPT -  focus session이고 세션이 이미 시작했다면, recordPrev방식. (아직 task change의 경우에는 justChange방식을 구현하지 않았음.)
    if (isPomo && !checkIfSessionIsNotStartedYet()) {
      newTaskChange = { id: task.id, taskChangeTimestamp: moment };
      shouldAddTaskChange = true;
      patchUrl = RESOURCE.USERS + SUB_SET.CURRENT_TASK_ID;
      patchData = {
        currentTaskId: task.id,
        doesItJustChangeTask: false,
        changeTimestamp: moment,
      };
    }
    //* 첫번째 조건 즉, focus session이지만 아직 시작하지 않은 경우에는, taskChangeTimestamp가 0인것이 문제가 없다.
    //* But if the current session is a break, there is one case where the newTaskChange object definetly causes a problem.
    //* a break session that was already started should keep its taskChangeTimestamp though we change the current task to sth else.
    //* because the timestamp is not just 0, but is when the break was started. It should not be changed to 0 by the newTaskChange object.
    else if ((isPomo && checkIfSessionIsNotStartedYet()) || isBreak) {
      console.log(
        "taskChangeInfoArray in the handleTaskClick",
        taskChangeInfoArray
      );
      newTaskChange = {
        id: task.id,
        taskChangeTimestamp: taskChangeInfoArray[0].taskChangeTimestamp,
      };
      shouldSetTaskChangeArray = true;
      patchUrl = RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY;
      patchData = {
        taskChangeInfoArray: [newTaskChange], // id will be updated in the backend using the newly created taskChangeInfo
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
      axiosInstance.patch(patchUrl, patchData);
    } catch (error) {
      console.error("Error handling task click:", error);
    }
  };

  const hasChildren = task.children && task.children.length > 0;
  const isCurrent = task.id === currentTaskId;

  return (
    <TaskContainer>
      <TaskCard priority={task.priority}>
        <TaskHeader>
          <ButtonOrSpacer>
            {hasChildren ? (
              <ExpandButton
                onClick={() => setExpanded((prev) => !prev)}
                aria-label={expanded ? "Collapse task" : "Expand task"}
              >
                {expanded ? "−" : "+"}
              </ExpandButton>
            ) : null}
          </ButtonOrSpacer>
          <TaskContent>
            <TaskTitle
              onClick={(ev) => {
                handleTaskSelection(task.id, Date.now());
              }}
              // Original
              // onClick={(ev) => {
              //   handleTaskClick(ev, Date.now());
              // }}
              isCurrent={isCurrent}
            >
              {task.content}
              {/* Show focus duration if available */}
              {typeof task.taskFocusDuration === "number" &&
                task.taskFocusDuration > 0 && (
                  <TaskFocusDuration>
                    ⏱ {formatDuration(task.taskFocusDuration)}
                  </TaskFocusDuration>
                )}
            </TaskTitle>
            {task.description && (
              <TaskDescription>{task.description}</TaskDescription>
            )}
            {task.due && <TaskDueDate>Due: {task.due.string}</TaskDueDate>}
          </TaskContent>
        </TaskHeader>
      </TaskCard>

      {hasChildren && expanded && (
        <ChildrenContainer>
          {task.children!.map((child: Task) => (
            <TaskItem
              key={child.id}
              task={child}
              expandedIds={expandedIds}
              isExpanded={expandedIds.has(child.id)}
            />
          ))}
        </ChildrenContainer>
      )}
    </TaskContainer>
  );
};
