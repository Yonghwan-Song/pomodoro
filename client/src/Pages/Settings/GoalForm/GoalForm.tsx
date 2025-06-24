import { useEffect, useRef, useState } from "react";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import { RESOURCE, SUB_SET } from "../../../constants";
import { DailyGoals } from "../../../types/clientStatesType";

import BlockNumberInput from "../../../ReusableComponents/Inputs/BlockNumberInput";

export default function GoalForm() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Global states
  const weeklyGoal = useBoundedPomoInfoStore((state) => state.goals.weeklyGoal);
  const dailyGoals = useBoundedPomoInfoStore((state) => state.goals.dailyGoals);
  const setWeeklyMinimum = useBoundedPomoInfoStore(
    (state) => state.setWeeklyMinimum
  );
  const setWeeklyIdeal = useBoundedPomoInfoStore(
    (state) => state.setWeeklyIdeal
  );
  const setDailyGoals = useBoundedPomoInfoStore((state) => state.setDailyGoals);

  // Local states
  const [weeklyMinimumInput, setWeeklyMinimumInput] = useState<number>(
    weeklyGoal.minimum
  );
  const [weeklyIdealInput, setWeeklyIdealInput] = useState<number>(
    weeklyGoal.ideal
  );
  const [dailyGoalsInputs, setDailyGoalsInputs] =
    useState<DailyGoals>(dailyGoals);
  const index = useRef<number>(0);
  const typeToUpdate = useRef<"minimum" | "ideal">("minimum");

  // debounced values
  const [debouncedWeeklyMinimumInput, setDebouncedWeeklyMinimumInput] =
    useState<number | null>(null);
  const [debouncedWeeklyIdealInput, setDebouncedWeeklyIdealInput] = useState<
    number | null
  >(null);
  const [debouncedDailyGoalsInputs, setDebouncedDailyGoalsInputs] =
    useState<DailyGoals | null>(null);

  //
  const hasMounted = useRef(false); // to track the initial mount

  //#region Input Change Handlers
  function handleWeeklyMinimumInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newMinimum = +event.target.value;
    setWeeklyMinimumInput(newMinimum);
  }

  function handleWeeklyIdealInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newIdeal = +event.target.value;
    setWeeklyIdealInput(newIdeal);
  }

  function handleDailyMinimumInputsChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newMinimum = +event.target.value;
    const idxOfCurrentTarget = event.currentTarget.dataset.index as string;
    index.current = Number(idxOfCurrentTarget);
    typeToUpdate.current = "minimum";
    //#region Original
    // const correspondingIdeal =
    //   dailyGoalsInputs[Number(idxOfCurrentTarget)].ideal;
    // if (
    //   validateGoalInputs(newMinimum, correspondingIdeal, "minimum", "daily")
    // ) {
    //   const inputsCloned = structuredClone(dailyGoalsInputs);
    //   const inputsUpdated = inputsCloned.map((goal, idx) => {
    //     if (idx === Number(idxOfCurrentTarget)) {
    //       goal["minimum"] = newMinimum;
    //     }
    //     return goal;
    //   }) as DailyGoals;
    //   setDailyGoalsInputs(inputsUpdated);
    // }
    //#endregion

    //#region New
    const inputsCloned = structuredClone(dailyGoalsInputs);
    const inputsUpdated = inputsCloned.map((goal, idx) => {
      if (idx === Number(idxOfCurrentTarget)) {
        goal["minimum"] = newMinimum;
      }
      return goal;
    }) as DailyGoals;
    setDailyGoalsInputs(inputsUpdated);
    //#endregion
  }

  function handleDailyIdealInputsChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newIdeal = +event.target.value;
    const idxOfCurrentTarget = event.currentTarget.dataset.index as string;
    index.current = Number(idxOfCurrentTarget);
    typeToUpdate.current = "ideal";

    const inputsCloned = structuredClone(dailyGoalsInputs);
    const inputsUpdated = inputsCloned.map((goal, idx) => {
      if (idx === Number(idxOfCurrentTarget)) {
        goal["ideal"] = newIdeal;
      }
      return goal;
    }) as DailyGoals;
    setDailyGoalsInputs(inputsUpdated);
  }
  //#endregion

  useEffect(() => {
    setWeeklyMinimumInput(weeklyGoal.minimum);
    setWeeklyIdealInput(weeklyGoal.ideal);
  }, [weeklyGoal]);
  useEffect(() => {
    setDailyGoalsInputs(dailyGoals);
  }, [dailyGoals]);

  //#region Debounce input states

  // Get the debounced Input to use it to update the global state
  useEffect(() => {
    if (!hasMounted.current) {
      // Skip the effect on the initial mount
      hasMounted.current = true;
      return;
    }
    const id = setTimeout(() => {
      if (
        validateGoalInputs(
          dailyGoalsInputs[index.current].minimum,
          dailyGoalsInputs[index.current].ideal,
          typeToUpdate.current,
          "daily"
        )
      )
        setDebouncedDailyGoalsInputs(dailyGoalsInputs);
      else setDailyGoalsInputs(dailyGoals); // to reset the wrong input
    }, 500);

    return () => clearTimeout(id);
  }, [dailyGoalsInputs]);
  useEffect(() => {
    // Prevent debouncing on mount
    if (weeklyMinimumInput !== weeklyGoal.minimum) {
      const id = setTimeout(() => {
        if (
          validateGoalInputs(
            weeklyMinimumInput,
            weeklyIdealInput,
            "minimum",
            "weekly"
          )
        )
          setDebouncedWeeklyMinimumInput(weeklyMinimumInput);
        else setWeeklyMinimumInput(weeklyGoal.minimum);
      }, 500);

      return () => clearTimeout(id);
    }
  }, [weeklyMinimumInput]);
  useEffect(() => {
    if (weeklyIdealInput !== weeklyGoal.ideal) {
      const id = setTimeout(() => {
        if (
          validateGoalInputs(
            weeklyMinimumInput,
            weeklyIdealInput,
            "ideal",
            "weekly"
          )
        )
          setDebouncedWeeklyIdealInput(weeklyIdealInput);
        else setWeeklyIdealInput(weeklyGoal.ideal);
      }, 500);

      return () => clearTimeout(id);
    }
  }, [weeklyIdealInput]);
  //#endregion

  //#region set the gloabl state using debounced input states
  useEffect(() => {
    if (debouncedDailyGoalsInputs !== null) {
      setDailyGoals(debouncedDailyGoalsInputs);
      //* 1. clone data to persist
      let clonedGoal = structuredClone({ weeklyGoal, dailyGoals });
      clonedGoal.dailyGoals = debouncedDailyGoalsInputs;
      //* 2. invoke patch call using axiosInstance
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.GOALS, clonedGoal);

      setDebouncedDailyGoalsInputs(null);
    }
  }, [debouncedDailyGoalsInputs]);
  useEffect(() => {
    //To prevent setMinimum() from running on mount
    if (debouncedWeeklyMinimumInput !== null) {
      console.log(
        "debouncedMinimumInput to set goal.minimum",
        debouncedWeeklyMinimumInput
      );
      setWeeklyMinimum(debouncedWeeklyMinimumInput);
      //* 1. clone data to persist
      let clonedGoal = structuredClone({ weeklyGoal, dailyGoals });
      clonedGoal.weeklyGoal.minimum = debouncedWeeklyMinimumInput;
      //* 2. invoke patch call using axiosInstance
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.GOALS, clonedGoal);

      setDebouncedWeeklyMinimumInput(null); // <-- not necessary
    }
  }, [debouncedWeeklyMinimumInput]);
  useEffect(() => {
    if (debouncedWeeklyIdealInput !== null) {
      console.log(
        "debouncedIdealInput to set goal.ideal",
        debouncedWeeklyIdealInput
      );
      setWeeklyIdeal(debouncedWeeklyIdealInput);
      //API
      //* 1. clone data to persist
      let clonedGoal = structuredClone({ weeklyGoal, dailyGoals });
      clonedGoal.weeklyGoal.ideal = debouncedWeeklyIdealInput;
      //* 2. invoke patch call using axiosInstance
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.GOALS, clonedGoal);
      setDebouncedWeeklyIdealInput(null);
    }
  }, [debouncedWeeklyIdealInput]);
  //#endregion

  return (
    <form>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: "6px",
        }}
      >
        <div>
          <div
            style={{
              position: "relative",
              top: "39px",
              width: "50px",
              fontStyle: "italic",
              fontWeight: "bold",
              textAlign: "center",
              paddingRight: "6px",
            }}
          >
            Min
          </div>
          <div
            style={{
              position: "relative",
              top: "66px",
              width: "50px",
              fontStyle: "italic",
              fontWeight: "bold",
              textAlign: "center",
              paddingRight: "6px",
            }}
          >
            Ideal
          </div>
        </div>

        {dailyGoalsInputs.map((goal, idx) => (
          <div style={{ fontWeight: "bold", fontStyle: "italic" }} key={idx}>
            <div style={{ textAlign: "center" }}>{days[idx]}</div>
            <BlockNumberInput
              value={goal.minimum}
              index={idx}
              onChange={handleDailyMinimumInputsChange}
            />
            <BlockNumberInput
              value={goal.ideal}
              index={idx}
              onChange={handleDailyIdealInputsChange}
            />
          </div>
        ))}
        <div
          style={{
            width: "4px",
            backgroundColor: "#8c8c8c",
            border: "1px solid #8c8c8c",
            borderRadius: "2px",
            marginLeft: "10px",
            marginRight: "10px",
          }}
        ></div>
        <div>
          <div style={{ fontWeight: "bold", fontStyle: "italic" }}>Weekly</div>
          <BlockNumberInput
            value={weeklyMinimumInput}
            onChange={handleWeeklyMinimumInputChange}
          />
          <BlockNumberInput
            value={weeklyIdealInput}
            onChange={handleWeeklyIdealInputChange}
          />
        </div>
      </div>
    </form>
  );
}

function validateGoalInputs(
  minimum: number,
  ideal: number,
  kind: "minimum" | "ideal",
  type: "weekly" | "daily"
) {
  let flag = true;
  let message = "";

  if (minimum > ideal) {
    if (kind === "minimum") {
      message = "Minimum should not be greater than ideal";
      flag = false;
    }
    if (kind === "ideal") {
      message = "Ideal should be greater than or equal to minimum";
      flag = false;
    }
  }

  if (minimum < 0 || ideal < 0) {
    message = "Goal should not be negative";
    flag = false;
  }
  if (type === "daily" && (minimum > 24 || ideal > 24)) {
    message = "You can't focus more than 24h per day";
    flag = false;
  }
  if (type === "weekly" && (minimum > 100 || ideal > 100)) {
    message = "Focusing more than 100h per week is unhealthy. Please don't";
    flag = false;
  }

  !flag && alert(message);
  return flag;
}
