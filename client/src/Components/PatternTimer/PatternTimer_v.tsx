import { useEffect, useState } from "react";
import { Timer } from "../Timer/Timer";
import { TimerVVV } from "../Timer/Timer_v";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import { UserAuth } from "../../Context/AuthContext";
import { User } from "firebase/auth";
import {
  DynamicCache,
  StatesType,
  openCache,
  persistTodaySession,
  postMsgToSW,
} from "../..";
import { RecType, TimerStateType } from "../../types/clientStatesType";

type PatternTimerProps = {
  statesRelatedToTimer: StatesType | {};
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
};

export function PatternTimerVVV({
  statesRelatedToTimer,
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
  setRecords,
}: PatternTimerProps) {
  const [duration, setDuration] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return (statesRelatedToTimer as StatesType).duration;
    } else {
      return pomoDuration;
    }
  }); // How long the timer is going to run next time.
  const [repetitionCount, setRepetitionCount] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return (statesRelatedToTimer as StatesType).repetitionCount;
    } else {
      return 0;
    }
  }); // How many times the timer used by this Pattern timer. Timer 몇번 돌아갔는지 여태까지.
  //Thus, e.g. if repetitionCount is 0 and duration is 20, the timer is going to run for 20 minutes when start buttion is clicked.
  //And also the timer actually has not run yet since repetitionCount is 0.

  const { user } = UserAuth()!;
  const [isOnCycle, setIsOnCycle] = useState<boolean>(false); // If the isOnCycle is true, a cycle of pomos has started and not finished yet.

  function checkRendering() {
    console.log("user", user === null ? null : "non-null");
    console.log("isOnCycle", isOnCycle);
    console.log("PatternTimer");
    console.log("duration", duration);
    console.log("repetitionCount", repetitionCount);
    console.log(
      "------------------------------------------------------------------"
    );
  }
  useEffect(checkRendering);

  /**
   * Decide this time rendering is whether a pomo duration or a break
   * and decide how many pomo durations or breaks are left.
   * Based on that decision, update states of this PatternTimer component.
   *
   * @param {number} howManyCountdown The total number of times the timer is used whether it is for pomo duration or break.
   * @param {*} startTime
   * @param {*} concentrationTimeInMinutes
   */
  async function next(
    howManyCountdown: number,
    state: TimerStateType,
    endTime: number,
    concentrationTime: number = duration
  ) {
    const { running, ...withoutRunning } = state;

    // When a user ends a timer while it's paused, the end of pause is equal to the end of the session.
    /*endTime =
      pauseEnd ||
      state.startTime + state.pause.totalLength + concentrationTime * 60 * 1000; // concentrationTime must be in minutes. */
    // if pause.totalLength ===0 && concentrationTime === duration,
    // endTime should be state.startTIme + concentrationTime * 60 * 1000
    // this will prevent the possible error.
    //? since endTime might be bigger than the endTime calculated below.
    if (state.pause.totalLength === 0 && concentrationTime === duration) {
      endTime = state.startTime + concentrationTime * 60 * 1000;
    }

    const sessionData = {
      ...withoutRunning,
      endTime,
      timeCountedDown: concentrationTime,
    };

    if (howManyCountdown < numOfPomo! * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        //! This is when a pomo, which is not the last one of a cycle, is completed.
        // console.log("ONE POMO DURATION IS FINISHED");
        user && recordPomo(user, concentrationTime, state.startTime); // Non null assertion is correct because a user is already signed in at this point.
        notify("shortBreak");
        setDuration(shortBreakDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: shortBreakDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        await persistTodaySession("pomo", sessionData);
      } else {
        //! This is when a short break is done.
        notify("pomo");
        setDuration(pomoDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: pomoDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        await persistTodaySession("break", sessionData);
      }
    } else if (howManyCountdown === numOfPomo! * 2 - 1) {
      //! This is when the last pomo of a cycle is completed.
      // console.log("ONE POMO DURATION IS FINISHED");
      user && recordPomo(user, concentrationTime, state.startTime);
      notify("longBreak");
      setDuration(longBreakDuration!);
      postMsgToSW("saveStates", {
        stateArr: [{ name: "duration", value: longBreakDuration }],
      });

      // for timeline
      setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
      await persistTodaySession("pomo", sessionData);
    } else if (howManyCountdown === numOfPomo! * 2) {
      //! This is when the long break is done meaning a cycle that consists of pomos, short break, and long break is done.
      // console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      //setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration!); //TODO: non-null assertion....
      setRepetitionCount(0);
      setIsOnCycle(false);
      postMsgToSW("saveStates", {
        stateArr: [
          { name: "duration", value: pomoDuration },
          { name: "repetitionCount", value: 0 },
        ],
      });

      // for timeline
      setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
      await persistTodaySession("break", sessionData);
    }
  }

  useEffect(() => {
    console.log("Pattern Timer was mounted");
    return () => {
      console.log("Pattern Timer was unmounted");
    };
  }, []);

  return (
    <>
      {/* <Timer
        //min to seconds
        statesRelatedToTimer={statesRelatedToTimer}
        durationInSeconds={duration * 60}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
        next={next}
        isOnCycle={isOnCycle}
        setIsOnCycle={setIsOnCycle}
        pomoDuration={pomoDuration}
        shortBreakDuration={shortBreakDuration}
        longBreakDuration={longBreakDuration}
        numOfPomo={numOfPomo}
      /> */}
      <TimerVVV
        //min to seconds
        statesRelatedToTimer={statesRelatedToTimer}
        durationInSeconds={duration * 60}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
        next={next}
        isOnCycle={isOnCycle}
        setIsOnCycle={setIsOnCycle}
        pomoDuration={pomoDuration}
        shortBreakDuration={shortBreakDuration}
        longBreakDuration={longBreakDuration}
        numOfPomo={numOfPomo}
      />
      <h3 style={{ textAlign: "center" }}>
        Remaining Pomo Sessions -{" "}
        {numOfPomo -
          (repetitionCount === 0
            ? 0
            : repetitionCount % 2 === 0
            ? repetitionCount / 2
            : (repetitionCount + 1) / 2)}
      </h3>
    </>
  );
}

async function recordPomo(user: User, duration: number, startTime: number) {
  try {
    const today = new Date(startTime);
    let LocaleDateString = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;

    // update
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let statResponse = await cache.match(
      CONSTANTS.URLs.POMO + "/stat/" + user.email
    );
    if (statResponse !== undefined) {
      let statData = await statResponse.json();
      statData.push({
        userEmail: user.email,
        duration,
        startTime,
        date: LocaleDateString,
        isDummy: false,
      });
      await cache.put(
        CONSTANTS.URLs.POMO + "/stat/" + user.email,
        new Response(JSON.stringify(statData))
      );
    }

    const idToken = await user.getIdToken();
    const response = await axios.post(
      CONSTANTS.URLs.POMO,
      {
        userEmail: user.email,
        duration,
        startTime,
        LocaleDateString,
      },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    // console.log("res obj", response);
  } catch (err) {
    // console.log(err);
  }
}

function notify(which: string) {
  let title = "Pomodoro";
  let body = "";

  // eslint-disable-next-line default-case
  switch (which) {
    case "pomo":
      body = "time to focus";
      break;
    case "shortBreak":
      body = "time to take a short break";
      break;
    case "longBreak":
      body = "time to take a long break";
      break;
    case "nextCycle":
      body = "time to do the next cycle of pomos";
      break;
  }

  let options = {
    body,
  };

  let noti = new Notification(title, options);

  noti.addEventListener("click", (ev) => {
    // console.log("notification is clicked");
    noti.close();
    window.focus();
  });

  setTimeout(() => {
    noti.close();
  }, 4000);
}
