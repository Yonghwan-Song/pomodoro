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

  console.log("progress from getProgress()", progress);

  return progress;
}
