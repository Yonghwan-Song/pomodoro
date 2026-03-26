import { persistStatesToIDB } from "../../..";
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

export function reducer(
  state: TimerStateType,
  action: TimerAction
): TimerStateType {
  switch (action.type) {
    case ACTION.START:
      persistStatesToIDB({
        startTime: action.payload,
        running: true,
        pause: { totalLength: 0, record: [] }
      });

      return {
        ...state,
        running: true,
        // startTime: action.payload,
        startTime: action.payload!
      };

    case ACTION.PAUSE:
      persistStatesToIDB({
        running: false,
        pause: {
          ...state.pause,
          record: [
            ...state.pause!.record,
            { start: action.payload, end: undefined }
          ]
        }
      });
      return {
        ...state,
        running: false,
        pause: {
          ...state.pause!,
          record: [
            ...state.pause!.record,
            { start: action.payload, end: undefined }
          ]
        }
      };

    case ACTION.RESUME:
      persistStatesToIDB({
        running: true,
        pause: {
          record: state.pause!.record.map((obj) => {
            if (obj.end === undefined) {
              return {
                ...obj,
                end: action.payload
              };
            } else {
              return obj;
            }
          }),
          totalLength:
            state.pause!.totalLength +
            (action.payload! -
              state.pause!.record[state.pause!.record.length - 1].start)
        }
      });
      return {
        ...state,
        running: true,
        pause: {
          record: state.pause!.record.map((obj) => {
            if (obj.end === undefined) {
              return {
                ...obj,
                end: action.payload
              };
            } else {
              return obj;
            }
          }),
          totalLength:
            state.pause!.totalLength +
            (action.payload! -
              state.pause!.record[state.pause!.record.length - 1].start)
        }
      };

    case ACTION.RESET:
      persistStatesToIDB({
        startTime: 0,
        running: false,
        pause: { totalLength: 0, record: [] }
      });
      return {
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] }
      };

    case ACTION.CONTINUE:
      return {
        ...action.payload
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
  CONTINUE: "continue"
};
