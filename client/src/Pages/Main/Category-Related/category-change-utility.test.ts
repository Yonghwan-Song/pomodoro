import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  makeSegmentsFromTimestamps,
  makeTimestampsFromRawData,
} from './category-change-utility.ts';

const start = 1_000_000;

describe('makeTimestampsFromRawData session bounds', () => {
  it('drops events after endTime so segment durations stay non-negative', () => {
    const end = start + 600_123;
    const segments = makeSegmentsFromTimestamps(
      makeTimestampsFromRawData(
        [
          { categoryName: 'focus', categoryChangeTimestamp: start },
          { categoryName: 'later', categoryChangeTimestamp: end + 15_000 },
        ],
        [{ id: 'task', taskChangeTimestamp: start }],
        [],
        end,
      ),
    );

    const sum = segments.reduce((acc, segment) => acc + segment.duration, 0);
    assert.equal(sum, end - start);
    assert.ok(segments.every((segment) => segment.duration >= 0));
    assert.ok(segments.every((segment) => segment.type === 'focus'));
    assert.equal(segments.at(-1)?.startTime, start);
    assert.equal(
      (segments.at(-1)?.startTime ?? 0) + (segments.at(-1)?.duration ?? 0),
      end,
    );
  });

  it('keeps one pause segment through the session end', () => {
    const pauseStart = start + 600_123;
    const confirm = pauseStart + 180_000;
    const segments = makeSegmentsFromTimestamps(
      makeTimestampsFromRawData(
        [{ categoryName: 'focus', categoryChangeTimestamp: start }],
        [{ id: 'task', taskChangeTimestamp: start }],
        [{ start: pauseStart, end: confirm, reason: 'rest' }],
        confirm,
      ),
    );

    const pauses = segments.filter((segment) => segment.type === 'pause');
    const sum = segments.reduce((acc, segment) => acc + segment.duration, 0);
    assert.equal(pauses.length, 1);
    assert.equal(pauses[0]?.duration, confirm - pauseStart);
    assert.equal(pauses[0]?.reason, 'rest');
    assert.equal(sum, confirm - start);
    assert.ok(segments.every((segment) => segment.duration >= 0));
  });
});
