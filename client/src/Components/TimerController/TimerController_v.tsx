import { useEffect, useState, useMemo } from "react";
import { TimerVVV } from "../Timer/Timer_v";
import { AxiosError } from "axios";
import { CacheName, RESOURCE, BASE_URL } from "../../constants/index";
import { useAuthContext } from "../../Context/AuthContext";
import { User } from "firebase/auth";
import {
  DynamicCache,
  openCache,
  persistSingleTodaySessionToIDB,
  postMsgToSW,
  makeSound,
} from "../..";
import {
  RecType,
  TimerStateType,
  TimersStatesType,
} from "../../types/clientStatesType";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import { useUserContext } from "../../Context/UserContext";
import { Category } from "../../types/clientStatesType";
import { PomodoroSessionDocument } from "../../Pages/Statistics/statRelatedTypes";

type PatternTimerProps = {
  statesRelatedToTimer: TimersStatesType | {};
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
};

export function TimerControllerVVV({
  statesRelatedToTimer,
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
  setRecords,
}: PatternTimerProps) {
  const [durationInMinutes, setDurationInMinutes] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return (statesRelatedToTimer as TimersStatesType).duration;
    } else {
      return pomoDuration;
    }
  }); // How long the timer is going to run next time.
  const [repetitionCount, setRepetitionCount] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return (statesRelatedToTimer as TimersStatesType).repetitionCount;
    } else {
      return 0;
    }
  }); // How many times the timer used by this Pattern timer. Timer 몇번 돌아갔는지 여태까지.
  //Thus, e.g. if repetitionCount is 0 and duration is 20, the timer is going to run for 20 minutes when start buttion is clicked.
  //And also the timer actually has not run yet since repetitionCount is 0.

  const { user } = useAuthContext()!;
  const [isOnCycle, setIsOnCycle] = useState<boolean>(false); // If the isOnCycle is true, a cycle of pomos has started and not finished yet.

  const userInfoContext = useUserContext()!;
  const currentCategory: Category | null = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      return (
        userInfoContext.pomoInfo.categories.find((c) => c.isCurrent) ?? null
      );
    } else {
      return null;
    }
  }, [userInfoContext.pomoInfo?.categories]);

  // function checkRendering() {
  //   // console.log("user", user === null ? null : "non-null");
  //   // console.log("isOnCycle", isOnCycle);
  //   // console.log("PatternTimer");
  //   // console.log("duration", durationInMinutes);
  //   // console.log("repetitionCount", repetitionCount);
  //   // console.log(
  //   //   "------------------------------------------------------------------"
  //   // );
  //   // console.log(`currentCategory -> ${JSON.stringify(currentCategory)}`);
  // }
  // useEffect(checkRendering);

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
    endForced,
  }: {
    howManyCountdown: number;
    state: TimerStateType;
    timeCountedDownInMilliSeconds?: number;
    endForced?: number;
  }) {
    const { running, ...withoutRunning } = state;
    const endTime =
      endForced ||
      state.startTime + state.pause.totalLength + timeCountedDownInMilliSeconds;

    const sessionData = {
      ...withoutRunning,
      endTime,
      timeCountedDown: timeCountedDownInMilliSeconds,
    };

    wrapUpSession({
      session: identifySession({
        howManyCountdown,
        numOfPomo,
      }),
      data: {
        state,
        timeCountedDownInMilliSeconds,
        sessionData,
      },
    });
  }

  //#region Utils
  enum SESSION {
    POMO = 1,
    SHORT_BREAK,
    LAST_POMO,
    LONG_BREAK,
  }

  function identifySession({
    howManyCountdown,
    numOfPomo,
  }: {
    howManyCountdown: number;
    numOfPomo: number;
  }): SESSION {
    if (howManyCountdown < numOfPomo! * 2 - 1 && howManyCountdown % 2 === 1) {
      return SESSION.POMO;
    } else if (
      howManyCountdown < numOfPomo! * 2 - 1 &&
      howManyCountdown % 2 === 0
    ) {
      return SESSION.SHORT_BREAK;
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      return SESSION.LAST_POMO;
    } else {
      return SESSION.LONG_BREAK;
    }
  }

  async function wrapUpSession({
    session,
    data,
  }: {
    session: SESSION;
    data: {
      state: TimerStateType;
      timeCountedDownInMilliSeconds: number;
      sessionData: Omit<RecType, "kind">;
    };
  }) {
    let { state, timeCountedDownInMilliSeconds, sessionData } = data;
    switch (session) {
      case SESSION.POMO:
        if (user) {
          recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory
          ); // Non null assertion is correct because a user is already signed in at this point.
        } else {
          // console.log("user is not ready", user);
        }
        notify("shortBreak");
        setDurationInMinutes(shortBreakDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: shortBreakDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        await persistSingleTodaySessionToIDB({
          kind: "pomo",
          data: sessionData,
        });
        user &&
          persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });

        break;

      case SESSION.SHORT_BREAK:
        notify("pomo");
        setDurationInMinutes(pomoDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: pomoDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        await persistSingleTodaySessionToIDB({
          kind: "break",
          data: sessionData,
        });
        user &&
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
        break;

      case SESSION.LAST_POMO:
        if (user) {
          recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory
          );
        } else {
          // console.log("user is not ready", user);
        }
        notify("longBreak");
        setDurationInMinutes(longBreakDuration!);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: longBreakDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        await persistSingleTodaySessionToIDB({
          kind: "pomo",
          data: sessionData,
        });
        user &&
          persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });
        break;

      case SESSION.LONG_BREAK:
        notify("nextCycle");
        //setCycleCount((prev) => prev + 1);
        setDurationInMinutes(pomoDuration!); //TODO: non-null assertion....
        setIsOnCycle(false);
        postMsgToSW("saveStates", {
          stateArr: [{ name: "duration", value: pomoDuration }],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        await persistSingleTodaySessionToIDB({
          kind: "break",
          data: sessionData,
        });
        user &&
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
        break;

      default:
        break;
    }
  }

  //#endregion

  // useEffect(() => {
  //   console.log("Pattern Timer_v was mounted");
  //   return () => {
  //     console.log("Pattern Timer_v was unmounted");
  //   };
  // }, []);

  return (
    <TimerVVV
      //min to seconds
      statesRelatedToTimer={statesRelatedToTimer}
      durationInSeconds={durationInMinutes * 60}
      setDurationInMinutes={setDurationInMinutes}
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
  );
}

async function persistRecOfTodayToServer(user: User, record: RecType) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CacheName));
    let resOfRecordOfToday = await cache.match(
      BASE_URL + RESOURCE.TODAY_RECORDS
    );
    if (resOfRecordOfToday !== undefined) {
      let recordsOfToday = await resOfRecordOfToday.json();
      recordsOfToday.push({
        record,
      });
      await cache.put(
        BASE_URL + RESOURCE.TODAY_RECORDS,
        new Response(JSON.stringify(recordsOfToday))
      );
    }

    // http requeset
    const response = await axiosInstance.post(RESOURCE.TODAY_RECORDS, {
      ...record,
    });
    console.log("res of persistRecOfTodayToSever", response);
  } catch (error) {
    console.warn(error);
  }
}

async function recordPomo(
  user: User,
  durationInMinutes: number,
  startTime: number,
  currentCategory: Category | null
) {
  try {
    const today = new Date(startTime);
    let LocaleDateString = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;

    // update
    let cache = DynamicCache || (await openCache(CacheName));
    let statResponse = await cache.match(BASE_URL + RESOURCE.POMODOROS);
    if (statResponse !== undefined) {
      let statData = await statResponse.json();

      const dataToPush: PomodoroSessionDocument = {
        userEmail: user.email!, //TODO  <---- 걍 non null assertion 갈겼음
        duration: durationInMinutes,
        startTime,
        date: LocaleDateString,
        isDummy: false,
      };
      if (currentCategory !== null) {
        dataToPush.category = { name: currentCategory.name };
      }

      statData.push(dataToPush);
      await cache.put(
        BASE_URL + RESOURCE.POMODOROS,
        new Response(JSON.stringify(statData))
      );
    }

    const data =
      currentCategory !== null
        ? {
            duration: durationInMinutes,
            startTime,
            date: LocaleDateString,
            currentCategoryName: currentCategory.name,
          }
        : {
            duration: durationInMinutes,
            startTime,
            date: LocaleDateString,
          };

    axiosInstance.post(RESOURCE.POMODOROS, data);
  } catch (err: any) {
    // ignore the code below for now
    if (
      // !window.navigator.onLine && // I think it could be wrong if a network is reconnected very soon.
      // !(err as AxiosError).response && // https://stackoverflow.com/questions/62061642/how-to-check-if-axios-call-fails-due-to-no-internet-connection/72198060#72198060
      //TODO: find the best way to check whether this error occurred due to a Internet disconnection.
      (err as AxiosError).code === "ERR_NETWORK"
    ) {
      //TODO: re apply !
      console.log("network is not connected");
      console.warn(err);
    } else {
      console.warn(err);
    }
  }
}

async function notify(which: string) {
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
    silent: true,
  };

  await makeSound();

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
