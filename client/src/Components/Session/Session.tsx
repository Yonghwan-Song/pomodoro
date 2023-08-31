import { DurationType } from "../../types/clientStatesType";
import Duration from "../Duration/Duration";

type SessionProps = {
  durations: DurationType[];
};
export default function Session({ durations: durationArr }: SessionProps) {
  const now = new Date();

  //#region today and the last day total
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const xCoordinateInMilliSec =
    durationArr[0].startTime - startOfTodayTimestamp;
  const milliSecToMin = 1 / (1000 * 60);
  const xCoordinateInMin = Math.floor(xCoordinateInMilliSec * milliSecToMin);

  return (
    <div
      style={{
        display: "inline-block",
        height: "60px",
        position: "absolute",
        top: "10px",
        left: xCoordinateInMin * 8 + "px", // 8px/min -> 480px/h -> 1980px/4h
      }}
    >
      {durationArr.map((aDuration) => {
        return <Duration data={aDuration} key={aDuration.startTime} />;
      })}
    </div>
  );
}
