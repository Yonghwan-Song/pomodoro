import { useEffect, useState } from "react";
import { PauseType } from "../reducers";
import Time from "../Time/Time";
import { FlexBox } from "../Layouts/FlexBox";

type PauseTimerProps = {
  isPaused: boolean;
  startTime: number;
  pauseData: PauseType;
  isOnSession: boolean;
};
export default function PauseTimer({
  isPaused,
  pauseData,
  isOnSession,
}: PauseTimerProps) {
  const [count, setCount] = useState<number>(() => {
    let timePassedInMilliSeconds = 0;
    if (isPaused) {
      timePassedInMilliSeconds =
        Date.now() - pauseData.record[pauseData.record.length - 1].start;
    }

    return Math.floor(timePassedInMilliSeconds / 1000);
  });

  useEffect(() => {
    if (isPaused) {
      let id = setInterval(() => {
        let timePassedInMilliSeconds =
          Date.now() - pauseData.record[pauseData.record.length - 1].start;
        setCount(Math.floor(timePassedInMilliSeconds / 1000));
      }, 500);

      return () => {
        clearInterval(id);
      };
    }
    if (!isPaused) {
      setCount(0);
    }
  }, [isPaused, count]);

  useEffect(() => {
    if (isOnSession === false) {
      setCount(0);
    }
  }, [isOnSession]);

  return (
    <FlexBox alignItems="center" justifyContent="space-evenly">
      <h2>
        <Time seconds={Math.floor(pauseData.totalLength / 1000)} />
      </h2>
      <h3 style={{ textAlign: "center" }}>
        <Time seconds={count} />
      </h3>
    </FlexBox>
  );
}
