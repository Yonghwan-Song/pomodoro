# I think I saw some lagging after choosing to use reducer for calculating remaining time

Timer.jsx

```jsx
import { useEffect, useReducer } from "react";
import { reducer, ACTION } from "../reducers";

export function TimerNew({ duration }) {
  const [state, dispatch] = useReducer(reducer, {
    running: false,
    startTime: 0,
    pause: { totalLength: 0, record: [] },
    remainingDuration: duration * 60,
  });
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
    if (state.running && state.remainingDuration !== 0) {
      const id = setInterval(() => {
        dispatch({
          type: ACTION.CALCULATE,
          payload: { now: Date.now(), duration: duration },
        });
      }, 500);

      return () => {
        clearInterval(id);
      };
    } else if (state.remainingDuration === 0) {
      console.log(`Focus session is complete from ${TimerNew.name}`);
    }
  });

  return (
    <div>
      <h2>
        {Math.trunc(state.remainingDuration / 60)}:
        {(seconds = state.remainingDuration % 60) < 10
          ? "0" + seconds
          : seconds}
      </h2>
      <button onClick={toggleTimer}>
        {state.running && state.remainingDuration !== 0 ? "pause" : "start"}
      </button>
    </div>
  );
}
```

reducers.js

```jsx
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...state,
        running: true,
        startTime: action.payload,
      };
    case "pause":
      return {
        ...state,
        running: false,
        pause: {
          ...state.pause,
          record: [...state.pause.record, { start: action.payload }],
        },
      };
    case "resume":
      return {
        ...state,
        running: true,
        pause: {
          record: state.pause.record.map((obj) => {
            if (obj.end === undefined) {
              return {
                ...obj,
                end: action.payload,
              };
            } else {
              return obj;
            }
          }),
          totalLength:
            state.pause.totalLength +
            (action.payload -
              state.pause.record[state.pause.record.length - 1].start),
        },
      };
    case "calculate":
      return {
        ...state,
        remainingDuration: Math.floor(
          (action.payload.duration * 60 * 1000 -
            (action.payload.now - state.startTime - state.pause.totalLength)) /
            1000
        ),
      };
    default:
      throw new Error();
  }
}

export const ACTION = {
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
  CALCULATE: "calculate",
};
```
