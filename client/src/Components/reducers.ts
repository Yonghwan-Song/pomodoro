import { SW } from "..";

export type PauseType = {
  totalLength: number;
  record: {
    start: number;
    end: number | undefined;
  }[];
};

export type TimerState = {
  running: boolean;
  startTime: number;
  // pause?: {
  //   totalLength: number;
  //   record: { start: number; end: number | undefined }[];
  // };
  pause: {
    totalLength: number;
    record: { start: number; end: number | undefined }[];
  };
};

export type TimerAction = UpdateAction | ResetAction | ContinueAction;
type UpdateAction = {
  type: Update;
  payload: number;
};

type ResetAction = {
  type: Reset;
};

type ContinueAction = {
  type: Continue;
  payload: TimerState;
};
type Update = "start" | "pause" | "resume";
type Reset = "reset";
type Continue = "continue";

export function reducerTimer(
  state: TimerState,
  action: TimerAction
): TimerState {
  switch (action.type) {
    case "start":
      SW?.postMessage({
        component: "Timer",
        stateArr: [
          { name: "startTime", value: action.payload },
          { name: "running", value: true },
          { name: "pause", value: { totalLength: 0, record: [] } },
        ],
      });

      return {
        ...state,
        running: true,
        // startTime: action.payload,
        startTime: action.payload!,
      };

    case "pause":
      SW?.postMessage({
        component: "Timer",
        stateArr: [
          { name: "running", value: false },
          {
            name: "pause",
            value: {
              ...state.pause,
              record: [
                ...state.pause!.record,
                { start: action.payload, end: undefined },
              ],
            },
          },
        ],
      });
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
      SW?.postMessage({
        component: "Timer",
        stateArr: [
          { name: "running", value: true },
          {
            name: "pause",
            value: {
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
          },
        ],
      });
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
      SW?.postMessage({
        component: "Timer",
        stateArr: [
          { name: "startTime", value: 0 },
          { name: "running", value: false },
          { name: "pause", value: { totalLength: 0, record: [] } },
        ],
      });
      return {
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] },
      };

    case "continue":
      return {
        ...action.payload,
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
  CONTINUE: Continue;
} = {
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
  RESET: "reset",
  CONTINUE: "continue",
};
