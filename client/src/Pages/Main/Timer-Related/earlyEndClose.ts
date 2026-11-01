import type { TimerStateType } from '../../../types/clientStatesType';

export type EarlyEndCloseInput = {
  state: TimerStateType;
  wasRunning: boolean;
  initiatedAt: number;
  confirmedAt: number;
  pauseReason?: string | null;
};

export type EarlyEndCloseResult = {
  state: TimerStateType;
  timeCountedDown: number;
  endTime: number;
};

// Focus stops at F. Case 1: F is the End click. Case 2: F is the open pause start.
// timeCountedDown = F - startTime - closedPauseLength, so the invariant holds in integer ms.
export function closeEarlyEnd(input: EarlyEndCloseInput): EarlyEndCloseResult {
  const state = structuredClone(input.state);
  const startTime = state.startTime;
  const closedPauseLength = state.pause?.totalLength ?? 0;
  if (!state.pause) {
    throw new Error('early end requires pause state');
  }

  if (input.wasRunning) {
    if (state.pause.record.some((row) => row.end === undefined)) {
      throw new Error('running snapshot still has an open pause');
    }
    const timeCountedDown = input.initiatedAt - startTime - closedPauseLength;
    return checked({
      state,
      timeCountedDown,
      endTime: input.initiatedAt,
    });
  }

  const lastPause = state.pause.record.at(-1);
  if (!lastPause || lastPause.end !== undefined) {
    throw new Error('early end from pause requires an open pause');
  }
  if (input.confirmedAt < lastPause.start) {
    throw new Error('confirm time is earlier than the open pause');
  }

  const timeCountedDown = lastPause.start - startTime - closedPauseLength;
  state.pause.totalLength =
    closedPauseLength + (input.confirmedAt - lastPause.start);
  lastPause.end = input.confirmedAt;
  const trimmedReason = input.pauseReason?.trim() ?? '';
  lastPause.reason = trimmedReason === '' ? null : trimmedReason;

  return checked({
    state,
    timeCountedDown,
    endTime: input.confirmedAt,
  });
}

function checked(result: EarlyEndCloseResult): EarlyEndCloseResult {
  const { state, timeCountedDown, endTime } = result;
  const totalPauseLength = state.pause.totalLength;
  if (!Number.isFinite(timeCountedDown) || timeCountedDown < 0) {
    throw new Error('timeCountedDown is negative');
  }
  if (endTime !== state.startTime + timeCountedDown + totalPauseLength) {
    throw new Error(
      'endTime does not match startTime + timeCountedDown + totalPauseLength',
    );
  }
  return result;
}
