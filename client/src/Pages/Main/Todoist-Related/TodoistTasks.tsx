/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from "react";
import { RESOURCE, SUB_SET } from "../../../constants";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import { TaskWithFocusDurationAndChildren } from "../../../types/todoistRelatedTypes";
import { TaskItem } from "./TaskItem";
import styled from "styled-components";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import {
  generateTaskDictionaryAndTree,
  useTaskSelectionHandler,
} from "./todoist-utility";
import { Button } from "../../../ReusableComponents/Buttons/Button";

const Container = styled.div`
  padding: 1rem;
`;

const Heading = styled.h1`
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
  text-align: center;
`;

const Message = styled.div<{ error?: boolean }>`
  padding: 1rem;
  color: ${({ error }) => (error ? "#EF4444" : "inherit")};
  text-align: center;
  text-decoration: underline;
`;

const NoTaskButton = styled.button<{ selected: boolean }>`
  display: block;
  width: 100%;
  font-size: 1em;
  padding: 0.75rem;
  background: ${({ selected }) => (selected ? "#ffe4b5" : "#f3f4f6")};
  color: #3275ad;
  border: 2px dashed #3275ad;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
  text-align: center;
  box-shadow: ${({ selected }) => (selected ? "0 0 0 2px #ff8522" : "none")};
`;

export function TodoistTasks() {
  const taskTreeForUI = useBoundedPomoInfoStore(
    (states) => states.taskTreeForUI
  );
  const setTaskTreeForUI = useBoundedPomoInfoStore(
    (states) => states.setTaskTreeForUI
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const currentTaskId = useBoundedPomoInfoStore(
    (states) => states.currentTaskId
  );
  const handleTaskSelection = useTaskSelectionHandler();

  const fetchTodoistTasks = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await axiosInstance.get(
        RESOURCE.TODOIST + SUB_SET.TASKS
      );

      const { rootTasks, taskMap } = generateTaskDictionaryAndTree(
        response.data.tasks
      );
      setTaskTreeForUI(rootTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to fetch tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    if (taskTreeForUI === null) return "Import Tasks";
    return "Sync Tasks";
  };

  const getMessage = () => {
    if (error) return <Message error>{error}</Message>;

    // Tasks are not imported yet
    if (taskTreeForUI === null) {
      return (
        <Message>
          No tasks imported yet. You can import your Todoist tasks using the
          button above.
        </Message>
      );
    }
    if (taskTreeForUI?.length === 0) {
      return (
        <Message>No incomplete tasks found in your Todoist account.</Message>
      );
    }

    // Tasks imported and there are incomplete tasks
    return null;
  };

  // useEffect(() => {
  //   console.log("Task change info array:", taskChangeInfoArray);
  // }, [taskChangeInfoArray]);

  // useEffect(() => {
  //   console.log("taskTreeForUI inside TodoistTasks", taskTreeForUI);
  // }, [taskTreeForUI]);

  //#region New -> //* currentTaskId를 그냥 아예 지워버려 -> currentTask가 바뀌어도... 현재 expand상태에 영향을 주면 안되는거 아니야?
  //* 왜냐하면, 원래 이 기능의 의도 자체가, 처음 App mount했을 때, 만약에 currentTask가 nested되어 있는 task중 하나이면 어떤거인지 안보여서 다 열어봐야하니까... 그래서 그런거거든.
  useEffect(() => {
    if (!taskTreeForUI) return;

    // Helper to find and collect ancestor IDs
    function findAncestors(
      node: TaskWithFocusDurationAndChildren,
      targetId: string,
      path: string[] = []
    ): string[] | null {
      if (node.id === targetId) return path;
      if (!node.children) return null;
      for (const child of node.children) {
        const result = findAncestors(child, targetId, [...path, node.id]);
        if (result) return result;
      }
      return null;
    }

    for (const rootTask of taskTreeForUI) {
      const ancestors = findAncestors(rootTask, currentTaskId);
      // console.log("ancestors path", ancestors);
      if (ancestors) {
        setExpandedIds(new Set(ancestors));
        break;
      }
    }
  }, [taskTreeForUI]);
  //#endregion

  return (
    <div>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Todoist Items
      </h1>

      <div css={{ display: "flex", columnGap: "9px", padding: "1rem" }}>
        <NoTaskButton
          onClick={(ev) => {
            handleTaskSelection("", Date.now());
          }}
          selected={currentTaskId === ""}
        >
          💤 Run Without Task
        </NoTaskButton>
        <Button onClick={fetchTodoistTasks} disabled={loading}>
          {getButtonText()}
        </Button>
      </div>

      <Container>
        <Heading>My Tasks</Heading>
        {getMessage()}
        {taskTreeForUI &&
          taskTreeForUI.length > 0 &&
          taskTreeForUI.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              expandedIds={expandedIds}
              isExpanded={expandedIds.has(task.id)}
            />
          ))}
      </Container>
    </div>
  );
}
