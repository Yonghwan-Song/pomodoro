import { useEffect, useState } from "react";
import { Timer } from "../../Timer/Timer";
import { UserInfo } from "../../../Context/UserContext";

export function PatternTimer() {
  const [duration, setDuration] = useState(0);
  const [repetitionCount, setRepetitionCount] = useState(0); // How many times the timer used by this Pattern timer.
  const [isOnCycle, setIsOnCycle] = useState<boolean>(false);
  const { pomoSetting } = UserInfo()!;

  let { pomoDuration, shortBreakDuration, longBreakDuration, numOfPomo } =
    pomoSetting;

  /**
   * Decide this time rendering is whether a pomo duration or a break
   * and decide how many pomo durations or breaks are left.
   * Based on that decision, update states of this PatternTimer component.
   *
   * @param {number} howManyCountdown The total number of times the timer is used whether it is for pomo duration or break.
   * @param {*} startTime
   * @param {*} concentrationTime
   */
  function next(
    howManyCountdown: number,
    startTime: number,
    concentrationTime: number = duration
  ) {
    if (howManyCountdown < numOfPomo! * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        //! This is when a pomo, which is not the last one of a cycle, is completed.
        console.log("ONE POMO DURATION IS FINISHED");
        setDuration(shortBreakDuration!);
      } else {
        //! This is when a short break is done.
        setDuration(pomoDuration!);
      }
    } else if (howManyCountdown === numOfPomo! * 2 - 1) {
      //! This is when the last pomo of a cycle is completed.
      console.log("ONE POMO DURATION IS FINISHED");
      setDuration(longBreakDuration!);
    } else if (howManyCountdown === numOfPomo! * 2) {
      //! This is when the long break is done meaning that a cycle of pomos, short break, and long break is done.
      console.log("one cycle is done");
      //cycle completion notification
      //setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration!);
      setRepetitionCount(0);
    }
  }

  useEffect(() => {
    if (Object.entries(pomoSetting).length === 0) {
      setDuration(0);
    } else {
      setDuration(pomoSetting.pomoDuration);
    }
  }, []);

  return (
    <>
      <Timer
        //min to seconds
        duration={duration * 60}
        next={next}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
        isOnCycle={isOnCycle}
        setIsOnCycle={setIsOnCycle}
      />
    </>
  );
}
