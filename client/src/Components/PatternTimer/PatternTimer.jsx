import { useState } from "react";
import { Timer } from "../Timer/Timer";
import { reducerPatternTimer as reducer } from "../reducers";

// Purpose:
// the PatternTimer controls the Timer component,
// using the four props passed in like below.
export function PatternTimer({
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
}) {
  const [duration, setDuration] = useState(pomoDuration);
  const [cycleCount, setCycleCount] = useState(0);
  const [repetitionCount, setRepetitionCount] = useState(0);

  // TODO: Learn how to write comment about function signature and edit the comment below
  // howManyCountdown: it is used to determine whether the next duration is pomo or any of the breakDurations.
  function next(howManyCountdown) {
    console.log(howManyCountdown);
    if (howManyCountdown < numOfPomo * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        setDuration(shortBreakDuration);
      } else {
        setDuration(pomoDuration);
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      setDuration(longBreakDuration);
    } else if (howManyCountdown === numOfPomo * 2) {
      console.log("one cycle is done");
      setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration);
      setRepetitionCount(0);
    }
  }

  return (
    <>
      <Timer
        duration={duration * 60}
        next={next}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
      />
    </>
  );
}
