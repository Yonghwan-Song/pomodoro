export function reducerTimer(state, action) {
  switch (action.type) {
    case "start":
      localStorage.setItem("isTimerRunning", "yes");
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
      localStorage.setItem("isTimerRunning", "yes");
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
    case "reset":
      localStorage.setItem("isTimerRunning", "no");
      return {
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] },
      };
    default:
      throw new Error();
  }
}

export const ACTION = {
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
  RESET: "reset",
};
