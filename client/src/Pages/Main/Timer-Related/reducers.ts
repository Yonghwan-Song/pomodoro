import { persistStatesToIDB } from '../../..';
import { TimerStateType } from '../../../types/clientStatesType';

export type PauseType = TimerStateType['pause'];

export const ACTION = {
  START: 'start',
  PAUSE: 'pause',
  RESUME: 'resume',
  RESET: 'reset',
  CONTINUE: 'continue',
  UPDATE_PAUSE_REASON: 'update_pause_reason',
} as const;

type Update = typeof ACTION.START | typeof ACTION.PAUSE | typeof ACTION.RESUME;
type Reset = typeof ACTION.RESET;
type Continue = typeof ACTION.CONTINUE;
type UpdatePauseReason = typeof ACTION.UPDATE_PAUSE_REASON;

export type TimerAction =
  UpdateAction | ResetAction | ContinueAction | UpdatePauseReasonAction;

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

type UpdatePauseReasonAction = {
  type: UpdatePauseReason;
  payload: string | null;
};

export function reducer(
  state: TimerStateType,
  action: TimerAction,
): TimerStateType {
  switch (action.type) {
    case ACTION.START:
      persistStatesToIDB({
        startTime: action.payload,
        running: true,
        pause: { totalLength: 0, record: [] },
      });

      return {
        ...state,
        running: true,
        startTime: action.payload!,
      };

    case ACTION.PAUSE:
      persistStatesToIDB({
        running: false,
        pause: {
          ...state.pause,
          record: [
            ...state.pause!.record,
            { start: action.payload, end: undefined, reason: null },
          ],
        },
      });
      return {
        ...state,
        running: false,
        pause: {
          ...state.pause!,
          record: [
            ...state.pause!.record,
            { start: action.payload, end: undefined, reason: null },
          ],
        },
      };

    case ACTION.RESUME:
      persistStatesToIDB({
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

    case ACTION.RESET:
      persistStatesToIDB({
        startTime: 0,
        running: false,
        pause: { totalLength: 0, record: [] },
      });
      return {
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] },
      };

    case ACTION.CONTINUE:
      return {
        ...action.payload,
      };

    case ACTION.UPDATE_PAUSE_REASON: {
      if (!state.pause || state.pause.record.length === 0) return state;
      const lastIndex = state.pause.record.length - 1;
      const updatedRecord = state.pause.record.map((item, idx) => {
        if (idx === lastIndex) {
          return { ...item, reason: action.payload };
        }
        return item;
      });
      const newPause = {
        ...state.pause,
        record: updatedRecord,
      };
      persistStatesToIDB({
        pause: newPause,
      });
      return {
        ...state,
        pause: newPause,
      };
    }

    default:
      throw new Error();
  }
}
