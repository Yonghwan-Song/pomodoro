import { useState, useEffect, useReducer } from "react";
import { reducer, ACTION } from "../reducers";

export function TimerNew({ duration }) {
  const [state, dispatch] = useReducer(reducer, {
    running: false,
    startTime: 0,
    pause: { totalLength: 0, record: [] },
  });
  const [remainingDuration, setRemainingDuration] = useState(duration * 60);
  let seconds = 0;

  function toggleTimer() {
    if (isFirstStart()) {
      dispatch({ type: ACTION.START, payload: Date.now() });
    } else if (isPaused()) {
      dispatch({ type: ACTION.RESUME, payload: Date.now() });
    } else {
      dispatch({ type: ACTION.PAUSE, payload: Date.now() });
    }

    function isFirstStart() {
      return !state.running && state.pause.record.length === 0;
    }
    function isPaused() {
      return !state.running && state.pause.record.length !== 0;
    }
  }

  useEffect(() => {
    if (state.running && remainingDuration !== 0) {
      const id = setInterval(() => {
        setRemainingDuration(
          Math.floor(
            (duration * 60 * 1000 -
              (Date.now() - state.startTime - state.pause.totalLength)) /
              1000
          )
        );
      }, 500);

      return () => {
        clearInterval(id);
      };
    } else if (remainingDuration === 0) {
      console.log(`Focus session is complete from ${TimerNew.name}`);
    }
  });

  return (
    <div>
      <h2>
        {Math.trunc(remainingDuration / 60)}:
        {(seconds = remainingDuration % 60) < 10 ? "0" + seconds : seconds}
      </h2>
      <button onClick={toggleTimer}>
        {state.running && remainingDuration !== 0 ? "pause" : "start"}
      </button>
    </div>
  );
}
