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
    default:
      throw new Error();
  }
}

export const ACTION = {
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
};
