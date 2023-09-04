import { useEffect, useState } from "react";
import { PauseType } from "../reducers";
import Time from "../Time/Time";

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
    console.log("running", isPaused);
    console.log("count", count);
    if (isPaused) {
      let id = setInterval(() => {
        let timePassedInMilliSeconds =
          Date.now() - pauseData.record[pauseData.record.length - 1].start;
        setCount(Math.floor(timePassedInMilliSeconds / 1000));
      }, 1000);

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
    <>
      <h2>
        <Time seconds={Math.floor(pauseData.totalLength / 1000)} />
      </h2>
      <h3 style={{ textAlign: "center" }}>
        <Time seconds={count} />
      </h3>
    </>
  );
}
