import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { closeEarlyEnd } from './earlyEndClose.ts';
import type { TimerStateType } from '../../../types/clientStatesType';

const start = 1_000_000;

function runningState(
  pause: TimerStateType['pause'] = { totalLength: 0, record: [] },
): TimerStateType {
  return { running: true, startTime: start, pause };
}

describe('closeEarlyEnd', () => {
  it('ends a running session at the click, keeping sub-second focus', () => {
    const initiatedAt = start + 600_123;
    const confirmedAt = initiatedAt + 15_000;
    const result = closeEarlyEnd({
      state: runningState(),
      wasRunning: true,
      initiatedAt,
      confirmedAt,
    });

    assert.equal(result.timeCountedDown, 600_123);
    assert.equal(result.endTime, initiatedAt);
    assert.equal(result.state.pause.totalLength, 0);
    assert.equal(result.state.pause.record.length, 0);
    assert.equal(
      result.endTime -
        start -
        result.timeCountedDown -
        result.state.pause.totalLength,
      0,
    );
  });

  it('keeps earlier closed pauses when ending from running', () => {
    const prior = {
      start: start + 100_000,
      end: start + 140_000,
      reason: 'water',
    };
    const initiatedAt = start + 600_123;
    const result = closeEarlyEnd({
      state: runningState({ totalLength: 40_000, record: [prior] }),
      wasRunning: true,
      initiatedAt,
      confirmedAt: initiatedAt + 10_000,
    });

    assert.equal(result.timeCountedDown, initiatedAt - start - 40_000);
    assert.equal(result.endTime, initiatedAt);
    assert.equal(result.state.pause.totalLength, 40_000);
    assert.deepEqual(result.state.pause.record, [prior]);
    assert.equal(
      result.endTime -
        start -
        result.timeCountedDown -
        result.state.pause.totalLength,
      0,
    );
  });

  it('extends an open pause through confirm, including earlier pauses once', () => {
    const prior = {
      start: start + 50_000,
      end: start + 90_000,
      reason: null,
    };
    const openStart = start + 600_123;
    const confirmedAt = openStart + 180_000;
    const original: TimerStateType = {
      running: false,
      startTime: start,
      pause: {
        totalLength: 40_000,
        record: [prior, { start: openStart, end: undefined, reason: null }],
      },
    };

    const result = closeEarlyEnd({
      state: original,
      wasRunning: false,
      initiatedAt: openStart + 60_000,
      confirmedAt,
      pauseReason: '  done for today  ',
    });

    assert.equal(result.timeCountedDown, openStart - start - 40_000);
    assert.equal(result.state.pause.totalLength, 40_000 + 180_000);
    assert.equal(result.endTime, confirmedAt);
    assert.equal(result.state.pause.record[0]?.reason, null);
    assert.equal(result.state.pause.record[1]?.end, confirmedAt);
    assert.equal(result.state.pause.record[1]?.reason, 'done for today');
    assert.equal(original.pause.record[1]?.end, undefined);
    assert.equal(
      result.endTime -
        start -
        result.timeCountedDown -
        result.state.pause.totalLength,
      0,
    );
  });

  it('clears pause reason to null when empty string or whitespace is provided', () => {
    const openStart = start + 600_123;
    const confirmedAt = openStart + 180_000;
    const original: TimerStateType = {
      running: false,
      startTime: start,
      pause: {
        totalLength: 0,
        record: [{ start: openStart, end: undefined, reason: 'old reason' }],
      },
    };

    const result = closeEarlyEnd({
      state: original,
      wasRunning: false,
      initiatedAt: openStart + 60_000,
      confirmedAt,
      pauseReason: '   ',
    });

    assert.equal(result.state.pause.record[0]?.reason, null);
  });

  it('throws when a paused early end has no open pause', () => {
    assert.throws(() =>
      closeEarlyEnd({
        state: runningState(),
        wasRunning: false,
        initiatedAt: start + 1_000,
        confirmedAt: start + 2_000,
      }),
    );
  });
});
