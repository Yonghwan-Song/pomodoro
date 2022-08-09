import { useState, useEffect, useReducer, useRef } from "react";
import { reducerTimer as reducer, ACTION } from "../reducers";

export function Timer({ duration, next, repetitionCount, setRepetitionCount }) {
  const [state, dispatch] = useReducer(reducer, {
    running: false,
    startTime: 0,
    pause: { totalLength: 0, record: [] },
  });
  const [remainingDuration, setRemainingDuration] = useState(duration);
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

  //UPGRADE: if I want my data about my pomo session I was doing to be persistent between reloading page,
  //         I think I need to store the pomo session data to the indexed db I guess.
  useEffect(() => {
    console.log(repetitionCount);
    // Booleans
    const isAfterReset = remainingDuration === 0 && state.startTime === 0;
    const isEnd = remainingDuration === 0 && state.startTime !== 0;
    // because the reset was dispatched, the truth of the conditional statement indicates the rendering right after a countdown ends.
    if (isAfterReset) {
      setRemainingDuration(duration); // setting remaining duration to the one newly passed in from parent component.
    }
    console.log(remainingDuration);
    if (state.running && remainingDuration !== 0) {
      // running
      const id = setInterval(() => {
        setRemainingDuration(
          Math.floor(
            (duration * 1000 -
              (Date.now() - state.startTime - state.pause.totalLength)) /
              1000
          )
        );
      }, 500);

      return () => {
        clearInterval(id);
      };
      // state.startTime is not zero yet.
    } else if (isEnd) {
      console.log(`Focus session is complete from ${Timer.name}`);
      //? The changes of the states in the parent component
      setRepetitionCount(repetitionCount + 1);
      next(repetitionCount + 1, state.startTime);
      //? The changes of the states in this component
      dispatch({ type: ACTION.RESET });
    }
  }, [remainingDuration, duration, state.running]);

  let h = (
    <h2>
      {Math.trunc(remainingDuration / 60)}:
      {(seconds = remainingDuration % 60) < 10 ? "0" + seconds : seconds}
    </h2>
  );
  let g = <h2>{duration / 60 + ":00"}</h2>;
  return (
    <div>
      <h1>
        {repetitionCount % 2 === 0 ? "POMO" : "BREAK"} DURATION: {duration} SEC
      </h1>

      {state.startTime === 0 ? g : h}

      <button onClick={toggleTimer}>
        {state.running && remainingDuration !== 0 ? "pause" : "start"}
      </button>
    </div>
  );
}
