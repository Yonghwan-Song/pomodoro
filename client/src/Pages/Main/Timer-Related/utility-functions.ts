import { TimersStatesType } from "../../../types/clientStatesType";

export function getProgress(statesRelatedToTimer: TimersStatesType) {
  // let retVal = durationInSeconds,// this makes a timer not be able to go to next sessin when re-opening the app after a certain session has already finished.
  let remainingDuration = 0;
  let timePassed = 0;
  let timeCountedDown = 0; // timeCountedDown = timePassed - pause.totalLength
  let progress = 0;

  // console.log("statesRelatedToTimer", statesRelatedToTimer);
  if (Object.keys(statesRelatedToTimer).length !== 0) {
    let { duration, pause, running, startTime } = statesRelatedToTimer;
    // statesRelatedToTimer as TimersStatesType;
    let durationInSeconds = duration * 60;

    if (running) {
      timePassed = Date.now() - startTime;
      timeCountedDown = timePassed - pause.totalLength;
      remainingDuration = Math.floor(
        (durationInSeconds * 1000 - timeCountedDown) / 1000
      );
    } else if (startTime === 0) {
      //running === false && startTime === 0 -> timer has not yet started.
      remainingDuration = durationInSeconds;
    } else {
      //running === false && startTime !== 0 -> timer is paused.
      //timer가 pause된 상태이니까, 당연히 record는 empty array가 아니고,
      //최소한 [{start: aNumber}]의 형태는 갖추어야한다.
      //그런데 지금같은 경우는 running이 true여야 하는데 autoStart하다가
      //어떤 아직 파악하지 못한 원인으로 인해 running이 false로 되었다.
      //그런데 사실 pause 한적은 없기 때문에 undefined.start 형태가 error를 발생시킨다.

      if (pause.record.length === 0) {
        timePassed = Date.now() - startTime;
      } else {
        timePassed = pause.record[pause.record.length - 1].start - startTime;
      }
      timeCountedDown = timePassed - pause.totalLength;
      remainingDuration = Math.floor(
        (durationInSeconds * 1000 - timeCountedDown) / 1000
      );
    }

    progress =
      durationInSeconds === 0
        ? 0
        : remainingDuration < 0
        ? 1
        : 1 - remainingDuration / durationInSeconds;
  }

  // progress = parseFloat(progress.toFixed(2));

  // console.log("progress from getProgress()", progress);

  return progress;
}

export function calculateCycleCount(
  isBeforeStartOfCycle: boolean,
  numOfPomo: number,
  numOfCycle: number,
  repetitionCount: number
) {
  if (isBeforeStartOfCycle) return 0;

  if (numOfCycle === 1) return 1;

  //!     P B P B P L | P B P B P  L  | P  B  P  B  P
  //! y   0 1 2 3 4 5 | 6 7 8 9 10 11 | 12 13 14 15 16
  //! x-1     0              1               2
  //! y = a(x-1) + b; 모두 음이 아닌 정수; 나머지 정리
  let y = repetitionCount;
  let a = 2 * numOfPomo;
  let b = y % a;
  let x = (y + (a - b)) / a; //! x - 몇번재 사이클인지 - 그냥 cycleCount라고 부르기로 함.

  return x;
}

export function calculateRepetitionCountWithinCycle(
  numOfPomo: number,
  numOfCycle: number,
  repetitionCount: number,
  cycleCount: number
) {
  if (cycleCount === 0) return 0;

  if (numOfCycle > 1) return repetitionCount - 2 * numOfPomo * (cycleCount - 1);
  if (numOfCycle === 1) return repetitionCount;
}

export function calculateNumOfRemainingPomoSessions(
  numOfPomo: number,
  repetitionCountWithinCycle: number
) {
  let numOfRemainingPomoSessions =
    numOfPomo -
    (repetitionCountWithinCycle === 0
      ? 0
      : repetitionCountWithinCycle % 2 === 0
      ? repetitionCountWithinCycle / 2
      : (repetitionCountWithinCycle + 1) / 2);
  // console.log("numOfRemainingPomoSessions", numOfRemainingPomoSessions);

  return numOfRemainingPomoSessions;
}

export function msToMin(ms: number) {
  return Math.floor(ms / (1000 * 60));
}

export function msToSec(ms: number) {
  return Math.floor(ms / 1000);
}

export function isThisFocusSession(repetitionCount: number) {
  return repetitionCount % 2 === 0 ? true : false;
}
