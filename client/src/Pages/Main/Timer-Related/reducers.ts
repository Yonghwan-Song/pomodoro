import { postMsgToSW } from "../../..";
import { TimerStateType } from "../../../types/clientStatesType";

export type PauseType = {
  totalLength: number;
  record: {
    start: number;
    end: number | undefined;
  }[];
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
  payload: TimerStateType;
};
type Update = "start" | "pause" | "resume";
type Reset = "reset";
type Continue = "continue";

export function reducerTimer(
  state: TimerStateType,
  action: TimerAction
): TimerStateType {
  switch (action.type) {
    case "start":
      postMsgToSW("saveStates", {
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
      postMsgToSW("saveStates", {
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
      postMsgToSW("saveStates", {
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
      postMsgToSW("saveStates", {
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
