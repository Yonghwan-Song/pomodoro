import { DurationType } from "../../types/clientStatesType";
import Duration from "../Duration/Duration";

type SessionProps = {
  durations: DurationType[];
};
export default function Session({ durations: durationArr }: SessionProps) {
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  // 8px/min -> 480px/h -> 1980px/4h
  // If this const value is 0, it means that this session started at the start of today.
  const xCoordinateInSeconds = Math.floor(
    (durationArr[0].startTime - startOfTodayTimestamp) / 1000
  );

  return (
    <div
      style={{
        display: "inline-block",
        height: "60px",
        position: "absolute",
        top: "10px",
        left: (xCoordinateInSeconds / 60) * 8 + "px",
      }}
    >
      {durationArr.map((aDuration) => {
        return <Duration data={aDuration} key={aDuration.startTime} />;
      })}
    </div>
  );
}
