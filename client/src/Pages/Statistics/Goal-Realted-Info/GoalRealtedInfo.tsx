import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import { getISODay } from "date-fns";
import { dayOfWeekArr } from "../../../constants";
import styles from "./GoalRelatedInfo.module.css";

function GoalRealtedInfo({ todayTotal }: { todayTotal: number }) {
  const goals = useBoundedPomoInfoStore((state) => state.goals);

  const dayOfWeekIndex = getISODay(new Date()) - 1;

  const remainingUntilMinimum =
    goals.dailyGoals[dayOfWeekIndex].minimum * 60 - todayTotal;
  const remainingUntilIdeal =
    goals.dailyGoals[dayOfWeekIndex].ideal * 60 - todayTotal;

  let message = "";

  if (remainingUntilMinimum > 0)
    message = `${remainingUntilMinimum}min is remaining until minimum goal`;
  else if (remainingUntilMinimum <= 0 && remainingUntilIdeal > 0)
    message = `${remainingUntilIdeal}min is remaining until ideal goal`;
  else if (remainingUntilIdeal <= 0)
    message = `${Math.abs(remainingUntilIdeal)}min beyond ideal goal`;

  return (
    <div>
      <h2>Today is {dayOfWeekArr[dayOfWeekIndex]}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <p className={styles.textBox}>todayTotal - {todayTotal}</p>
        <p className={styles.textBox}>
          until minimum : {remainingUntilMinimum}
        </p>
        <p className={styles.textBox}>until ideal : {remainingUntilIdeal}</p>
        <p className={styles.textBox} style={{ color: "red" }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export default GoalRealtedInfo;
