import { useEffect, useState } from "react";
import { TimerVVV } from "../Timer/Timer_v";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import { useAuthContext } from "../../Context/AuthContext";
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
  const [durationInMinutes, setDurationInMinutes] = useState(() => {
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

  const { user } = useAuthContext()!;
  const [isOnCycle, setIsOnCycle] = useState<boolean>(false); // If the isOnCycle is true, a cycle of pomos has started and not finished yet.

  function checkRendering() {
    console.log("user", user === null ? null : "non-null");
    console.log("isOnCycle", isOnCycle);
    console.log("PatternTimer");
    console.log("duration", durationInMinutes);
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
   */
  /**
   * endTime을 계산하려면 세션이 종료되는 몇가지 시나리오를 생각해봐야 한다.
   * 1. pause없이 진행한 경우
   *    1) 끝까지 완료       timeCountedDown=== duration    PASSED
   *    2) 끝까지 완료(x)    timeCountedDown < duration    PASSED
   *      (end button을 클릭한 것)
   * 2. puase가 있는 경우
   *    1) 끝까지 완료    PASSED
   *    2) 끝까지 완료(x)
   *      a. resume 버튼을 누르고 세션을 마저 이어 진행하다가 세션이 끝나기 전에 end button을 클릭    PASSED
   *      b. pause 도중에 end button을 클릭    PASSED
   * endTime을 계산하는 공식
   * startTime + pause.totalLength + timeCountedDown* 60 * 1000
   */

  async function next({
    howManyCountdown,
    state,
    timeCountedDownInMilliSeconds = durationInMinutes * 60 * 1000,
  }: {
    howManyCountdown: number;
    state: TimerStateType;
    timeCountedDownInMilliSeconds?: number;
  }) {
    const { running, ...withoutRunning } = state;
    const endTime =
      state.startTime + state.pause.totalLength + timeCountedDownInMilliSeconds;

    const sessionData = {
      ...withoutRunning,
      endTime,
      timeCountedDown: timeCountedDownInMilliSeconds,
    };

    if (howManyCountdown < numOfPomo! * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        //! This is when a pomo, which is not the last one of a cycle, is completed.
        // console.log("ONE POMO DURATION IS FINISHED");
        user &&
          recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime
          ); // Non null assertion is correct because a user is already signed in at this point.
        notify("shortBreak");
        setDurationInMinutes(shortBreakDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: shortBreakDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        await persistTodaySession("pomo", sessionData);
        user &&
          persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });
      } else {
        //! This is when a short break is done.
        notify("pomo");
        setDurationInMinutes(pomoDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: pomoDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        await persistTodaySession("break", sessionData);
        user &&
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
      }
    } else if (howManyCountdown === numOfPomo! * 2 - 1) {
      //! This is when the last pomo of a cycle is completed.
      // console.log("ONE POMO DURATION IS FINISHED");
      user &&
        recordPomo(
          user,
          Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
          state.startTime
        );
      notify("longBreak");
      setDurationInMinutes(longBreakDuration!);
      postMsgToSW("saveStates", {
        stateArr: [{ name: "duration", value: longBreakDuration }],
      });

      // for timeline
      setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
      await persistTodaySession("pomo", sessionData);
      user && persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });
    } else if (howManyCountdown === numOfPomo! * 2) {
      //! This is when the long break is done meaning a cycle that consists of pomos, short break, and long break is done.
      // console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      //setCycleCount((prev) => prev + 1);
      setDurationInMinutes(pomoDuration!); //TODO: non-null assertion....
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
      user &&
        persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
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
      <TimerVVV
        //min to seconds
        statesRelatedToTimer={statesRelatedToTimer}
        durationInSeconds={durationInMinutes * 60}
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

async function persistRecOfTodayToServer(user: User, record: RecType) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let resOfRecordOfToday = await cache.match(
      CONSTANTS.URLs.RECORD_OF_TODAY + "/" + user.email
    );
    if (resOfRecordOfToday !== undefined) {
      let recordsOfToday = await resOfRecordOfToday.json();
      recordsOfToday.push({
        record,
      });
      await cache.put(
        CONSTANTS.URLs.RECORD_OF_TODAY + "/" + user.email,
        new Response(JSON.stringify(recordsOfToday))
      );
    }

    // http requeset
    const idToken = await user.getIdToken();
    const response = await axios.post(
      CONSTANTS.URLs.RECORD_OF_TODAY,
      {
        userEmail: user.email,
        ...record,
      },

      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res of persistRecOfTodayToSever", response);
  } catch (error) {
    console.warn(error);
  }
}

async function recordPomo(
  user: User,
  durationInMinutes: number,
  startTime: number
) {
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
        duration: durationInMinutes,
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
        duration: durationInMinutes,
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
  }, 5000);
}
