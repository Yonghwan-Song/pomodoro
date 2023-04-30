// type elementOfRecordArray = {
//   start: number;
//   end: number;
// };
// interface elementOfRecordArray {
//   start: number;
//   end: number;
// }

type TimerState = {
  running: boolean;
  startTime: number;
  pause?: {
    totalLength: number;
    record: { start: number; end: number | undefined }[];
  };
};

type TimerAction = UpdateAction | ResetAction;
type UpdateAction = {
  type: Update;
  payload: number;
};

type ResetAction = {
  type: Reset;
};
type Update = "start" | "pause" | "resume";
type Reset = "reset";

export function reducerTimer(
  state: TimerState,
  action: TimerAction
): TimerState {
  switch (action.type) {
    case "start":
      localStorage.setItem("isTimerRunning", "yes");
      return {
        ...state,
        running: true,
        // startTime: action.payload,
        startTime: action.payload!,
      };

    case "pause":
      return {
        ...state,
        running: false,
        pause: {
          ...state.pause!,
          record: [
            ...state.pause!.record,
            { start: action.payload, end: undefined },
          ],
        },
      };

    case "resume":
      localStorage.setItem("isTimerRunning", "yes");
      return {
        ...state,
        running: true,
        pause: {
          record: state.pause!.record.map((obj) => {
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
            state.pause!.totalLength +
            (action.payload! -
              state.pause!.record[state.pause!.record.length - 1].start),
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

export const ACTION: {
  START: Update;
  PAUSE: Update;
  RESUME: Update;
  RESET: Reset;
} = {
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
  RESET: "reset",
};
