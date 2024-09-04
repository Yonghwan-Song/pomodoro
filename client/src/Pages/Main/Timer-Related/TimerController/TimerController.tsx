import { useState, useMemo, useEffect, useRef } from "react";
import { Timer } from "../../Timer-Related/Timer/Timer";
import { AxiosError } from "axios";
import {
  CacheName,
  RESOURCE,
  BASE_URL,
  SUB_SET,
  CURRENT_SESSION_TYPE,
} from "../../../../constants/index";
import { useAuthContext } from "../../../../Context/AuthContext";
import { User } from "firebase/auth";
import {
  DynamicCache,
  openCache,
  persistSingleTodaySessionToIDB,
  postMsgToSW,
  makeSound,
  obtainStatesFromIDB,
  persistCategoryChangeInfoArrayToIDB,
} from "../../../..";
import {
  Category,
  CategoryChangeInfo,
  RecType,
  TimerStateType,
  TimersStatesType,
} from "../../../../types/clientStatesType";
import { axiosInstance } from "../../../../axios-and-error-handling/axios-instances";
import { useUserContext } from "../../../../Context/UserContext";
import { PomodoroSessionDocument } from "../../../Statistics/statRelatedTypes";
import {
  createDataSortedByTimestamp,
  calculateDurationForEveryCategory,
  aggregateFocusDurationOfTheSameCategory,
  NN,
  M,
  convertMilliSecToMin,
} from "./category-change-utility";
import { getProgress } from "../utility-functions";

type PatternTimerProps = {
  statesRelatedToTimer: TimersStatesType | {};
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
};

enum SESSION {
  POMO = 1,
  SHORT_BREAK,
  LAST_POMO,
  LONG_BREAK,
}

export function TimerController({
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
  const setPomoInfo = userInfoContext.setPomoInfo;
  const colorForUnCategorized = useMemo(() => {
    if (userInfoContext.pomoInfo !== null) {
      return userInfoContext.pomoInfo.colorForUnCategorized;
    } else {
      return "#f04005";
    }
  }, [userInfoContext.pomoInfo?.colorForUnCategorized]);
  //#region New with doesItJustChangeCategory: boolean.
  const [currentCategory, doesItJustChangeCategory]: [
    Category | null,
    boolean | undefined
  ] = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      return [
        userInfoContext.pomoInfo.categories.find((c) => c.isCurrent) ?? null,
        userInfoContext.pomoInfo.doesItJustChangeCategory,
      ];
    } else {
      return [null, undefined];
    }
  }, [userInfoContext.pomoInfo?.categories]);
  //#endregion

  const categoryChangeInfoArray: CategoryChangeInfo[] = useMemo(() => {
    if (userInfoContext.pomoInfo !== null) {
      return userInfoContext.pomoInfo.categoryChangeInfoArray;
    } else {
      return [];
    }
  }, [userInfoContext.pomoInfo?.categoryChangeInfoArray]);

  const isFirstRender = useRef(true);
  const prevSessionType = useRef<number>(0);

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
  //   // console.log("----------------ref");
  //   // console.log("isFirstRender", isFirstRender.current);
  //   // console.log("prevSession was", prevSessionType.current);
  //   // console.log("current category", currentCategory);
  //   // console.log("categoryChangeInfoArray", categoryChangeInfoArray);
  //   // console.log("_arr", categoryChangeInfoArray);

  //   // console.log("-------------------------------------------------->");
  //   // console.log("userInfoContext.pomoInfo", userInfoContext.pomoInfo);
  //   // console.log("<--------------------------------------------------");
  //   console.log("statesRelatedToTimers PROP - ", statesRelatedToTimer);
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
   *    1) 끝까지 완료       timeCountedDown=== duration
   *    2) 끝까지 완료(x)    timeCountedDown < duration
   *      (end button을 클릭한 것)
   * 2. puase가 있는 경우
   *    1) 끝까지 완료
   *    2) 끝까지 완료(x)
   *      a. resume 버튼을 누르고 세션을 마저 이어 진행하다가 세션이 끝나기 전에 end button을 클릭
   *      b. pause 도중에 end button을 클릭
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

    const session = identifySession({
      howManyCountdown,
      numOfPomo,
    });
    const currentSessionType = +session % 2 === 0 ? "pomo" : "break";
    sessionStorage.setItem(CURRENT_SESSION_TYPE, currentSessionType);

    wrapUpSession({
      session,
      data: {
        state,
        timeCountedDownInMilliSeconds,
        sessionData,
      },
    });
  }

  //#region Utils
  function identifySession({
    howManyCountdown,
    numOfPomo,
  }: {
    howManyCountdown: number;
    numOfPomo: number;
  }): SESSION {
    if (howManyCountdown === 0) {
      // Timer component말고 여기서 re-fresh했을 때, repetitionCount가 0인 경우에 call되면, 계속 short-break이라고 나와서.
      //! determineNextPatternTimerStates함수 in Timer.tsx의 마지막 else, 그리고 return값에 대한 주석 확인.
      return SESSION.LONG_BREAK;
    }
    // console.log("howManyCountdown:", howManyCountdown);
    // console.log("numOfPomo", numOfPomo);

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

    //#region Original
    // if (howManyCountdown < numOfPomo! * 2 - 1 && howManyCountdown % 2 === 1) {
    //   return SESSION.POMO;
    // } else if (
    //   howManyCountdown < numOfPomo! * 2 - 1 &&
    //   howManyCountdown % 2 === 0
    // ) {
    //   return SESSION.SHORT_BREAK;
    // } else if (howManyCountdown === numOfPomo * 2 - 1) {
    //   return SESSION.LAST_POMO;
    // } else {
    //   return SESSION.LONG_BREAK;
    // }
    //#endregion
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
    if (user) {
      const infoArr = [
        {
          categoryName:
            currentCategory === null ? "uncategorized" : currentCategory.name,
          categoryChangeTimestamp: 0,
          _uuid: currentCategory?._uuid,
          color:
            currentCategory !== null
              ? currentCategory.color
              : colorForUnCategorized,
          progress: 0, //? 시작을 아직 안한거니까 0으로 하겠음.
        },
      ];
      setPomoInfo((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          categoryChangeInfoArray: infoArr,
        };
      });
      // console.log("categoryChangeInfoArray", infoArr);
      persistCategoryChangeInfoArrayToIDB(infoArr);
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY, {
        categoryChangeInfoArray: infoArr.map((info) => {
          return {
            categoryName: info.categoryName,
            categoryChangeTimestamp: info.categoryChangeTimestamp,
            color: info.color,
            progress: info.progress,
          };
        }),
      });
    }
    switch (session) {
      case SESSION.POMO:
        prevSessionType.current = session;
        if (user) {
          categoryChangeInfoArray[0].categoryChangeTimestamp =
            sessionData.startTime;
          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            categoryChangeInfoArray,
            sessionData
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
        prevSessionType.current = session;
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
        prevSessionType.current = session;
        if (user) {
          categoryChangeInfoArray[0].categoryChangeTimestamp = //? unde냥ined.categoryChangeTimestamp 이런식으로 해서 error가 발생했음.
            sessionData.startTime;
          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            categoryChangeInfoArray,
            sessionData
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
        prevSessionType.current = session;
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
  //   console.log("Pattern Timer was mounted");
  //   return () => {
  //     console.log("Pattern Timer was unmounted");
  //   };
  // }, []);

  //#region Revised
  useEffect(() => {
    async function reflectCategoryChange() {
      // console.log("revised is called");
      if (isFirstRender.current) {
        isFirstRender.current = false;
      } else {
        let states = await obtainStatesFromIDB("withoutSettings");
        const progress = getProgress(states as TimersStatesType);

        if (
          SESSION[prevSessionType.current] === "SHORT_BREAK" ||
          SESSION[prevSessionType.current] === "LONG_BREAK"
        ) {
          if (
            (states as TimersStatesType).running === false &&
            (states as TimersStatesType).startTime === 0
          ) {
            // console.log("pomo session but not started yet");
            const infoObj: CategoryChangeInfo = {
              categoryName:
                currentCategory !== null
                  ? currentCategory.name
                  : "uncategorized",
              categoryChangeTimestamp: 0,
              _uuid: currentCategory?._uuid,
              color:
                currentCategory !== null
                  ? currentCategory.color
                  : colorForUnCategorized,
              progress,
            };
            setPomoInfo((prev) => {
              if (!prev) return prev;
              return { ...prev, categoryChangeInfoArray: [infoObj] };
            });
            // console.log("categoryChangeInfoArray", [infoObj]);
            persistCategoryChangeInfoArrayToIDB([infoObj]);
            axiosInstance.patch(
              RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
              {
                categoryChangeInfoArray: [
                  {
                    categoryName: infoObj.categoryName,
                    categoryChangeTimestamp: infoObj.categoryChangeTimestamp,
                    color: infoObj.color,
                    progress: infoObj.progress,
                  },
                ],
              }
            );
          } else {
            // console.log("pomo session is on going");
            // console.log("running", (states as TimersStatesType).running);
            // console.log("startTime", (states as TimersStatesType).startTime);

            const infoObj = {
              categoryName:
                currentCategory !== null
                  ? currentCategory.name
                  : "uncategorized",
              categoryChangeTimestamp: Date.now(),
              _uuid: currentCategory?._uuid,
              color:
                currentCategory !== null
                  ? currentCategory.color
                  : colorForUnCategorized,
              progress,
            };

            setPomoInfo((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                categoryChangeInfoArray: [...categoryChangeInfoArray, infoObj],
              };
            });
            // console.log("categoryChangeInfoArray", [
            //   ...categoryChangeInfoArray,
            //   infoObj,
            // ]);
            persistCategoryChangeInfoArrayToIDB([
              ...categoryChangeInfoArray,
              infoObj,
            ]);
            axiosInstance.patch(
              RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
              {
                categoryChangeInfoArray: [
                  ...categoryChangeInfoArray.map((info) => {
                    return {
                      categoryName: info.categoryName,
                      categoryChangeTimestamp: info.categoryChangeTimestamp,
                      color: info.color,
                      progress: info.progress,
                    };
                  }),
                  {
                    categoryName: infoObj.categoryName,
                    categoryChangeTimestamp: infoObj.categoryChangeTimestamp,
                    color: infoObj.color,
                    progress: infoObj.progress,
                  },
                ],
              }
            );
          }
        }
        if (
          SESSION[prevSessionType.current] === "POMO" ||
          SESSION[prevSessionType.current] === "LAST_POMO"
        ) {
          // console.log("break session");
          const infoObj = {
            categoryName:
              currentCategory !== null ? currentCategory.name : "uncategorized",
            categoryChangeTimestamp: 0,
            _uuid: currentCategory?._uuid,
            color:
              currentCategory !== null
                ? currentCategory.color
                : colorForUnCategorized,
            progress,
          };
          setPomoInfo((prev) => {
            if (!prev) return prev;
            return { ...prev, categoryChangeInfoArray: [infoObj] };
          });
          // console.log("categoryChangeInfoArray", [infoObj]);
          persistCategoryChangeInfoArrayToIDB([infoObj]);
          axiosInstance.patch(
            RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
            {
              categoryChangeInfoArray: [
                {
                  categoryName: infoObj.categoryName,
                  categoryChangeTimestamp: infoObj.categoryChangeTimestamp,
                  color: infoObj.color,
                  progress: infoObj.progress,
                },
              ],
            }
          );
        }
      }
    }

    //  * Cases 1. categoriezd -> categoriezd
    //  *       2. uncategorized -> categorized - _uuid should be re-assigned.
    //  *       3. categorized -> uncategorized
    async function justChangeCategory() {
      if (isFirstRender.current) {
        isFirstRender.current = false;
      } else {
        const updated = [...categoryChangeInfoArray];
        if (currentCategory) {
          updated[updated.length - 1]._uuid = currentCategory?._uuid;
          updated[updated.length - 1].categoryName = currentCategory?.name;
          updated[updated.length - 1].color = currentCategory?.color;
        } else {
          delete updated[updated.length - 1]._uuid;
          updated[updated.length - 1].categoryName = "uncategorized";
          updated[updated.length - 1].color = colorForUnCategorized;
        }

        setPomoInfo((prev) => {
          if (!prev) return prev;

          return { ...prev, categoryChangeInfoArray: updated };
        });
        persistCategoryChangeInfoArrayToIDB(updated);
        axiosInstance.patch(
          RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
          {
            categoryChangeInfoArray: updated.map((info) => {
              const { _uuid, ...infoWithout_uuid } = info;
              return infoWithout_uuid;
            }),
          }
        );
      }
      // 0. idb (x)
      // 1. server (x)
      // 2. pomoInfo (x)
    }

    if (user) {
      if (doesItJustChangeCategory) justChangeCategory();
      else reflectCategoryChange();
    }
  }, [currentCategory?.name]);

  useEffect(() => {
    const prevSession = identifySession({
      howManyCountdown: repetitionCount,
      numOfPomo,
    });
    // console.log(
    //   `prevSession calculated in  [] side-effect`,
    //   SESSION[prevSession]
    // );
    prevSessionType.current = prevSession;

    const currentSessionType = +prevSession % 2 === 0 ? "pomo" : "break";
    sessionStorage.setItem(CURRENT_SESSION_TYPE, currentSessionType);
  }, []);

  // useEffect(() => {
  //   console.log("categoryChangeInfoArray", categoryChangeInfoArray);
  // });
  //#endregion

  return (
    <Timer
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
    // console.log("res of persistRecOfTodayToSever", response);
  } catch (error) {
    console.warn(error);
  }
}

async function recordPomo(
  user: User,
  durationInMinutes: number,
  startTime: number,
  currentCategory: Category | null,
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[],
  sessionData: Omit<RecType, "kind">
) {
  try {
    //#region
    // console.log("categoryChangeInfoArray", categoryChangeInfoArray);
    // console.log("sessionData", sessionData);
    //#endregion

    //#region Prepare some values
    const today = new Date(startTime);
    let LocaleDateString = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;
    const newData = createDataSortedByTimestamp(
      categoryChangeInfoArray,
      sessionData.pause.record as {
        start: number;
        end: number; // After a session is ended, the end property is no longer able to have "undefined".
      }[],
      sessionData.endTime
    )
      .reduce<NN>(calculateDurationForEveryCategory, {
        durationArr: [],
        currentType: "focus",
        currentOwner: "",
        currentStartTime: 0,
      })
      .durationArr.reduce<M>(aggregateFocusDurationOfTheSameCategory, {
        c_duration_array: [],
        currentCategoryName: "",
      });

    // data type at stat cache
    // {
    //*     "userEmail": "syh300089@gmail.com",
    //     "duration": 1,
    //     "startTime": 1723690589962,
    //*     "date": "8/15/2024",
    //!     "isDummy": false,
    //?     "category": {
    //?         "name": "et cetera"
    //?     }
    // }
    const final: {
      userEmail: string;
      duration: number;
      startTime: number;
      date: string;
      isDummy: boolean;
      category?: {
        name: string;
      };
    }[] = convertMilliSecToMin(newData.c_duration_array).map((val) => {
      if (val.categoryName !== "uncategorized") {
        return {
          userEmail: user.email!,
          duration: val.duration,
          startTime: val.startTime,
          date: LocaleDateString,
          isDummy: false,
          category: {
            name: val.categoryName,
          },
        };
      } else {
        return {
          userEmail: user.email!,
          duration: val.duration,
          startTime: val.startTime,
          date: LocaleDateString,
          isDummy: false,
        };
      }
    });

    // console.log("final by Array.Prototype.Map()", final);
    // [
    //     {
    //         "userEmail": "syh300089@gmail.com",
    //         "duration": 1,
    //         "startTime": 1723701247658,
    //         "date": "8/15/2024",
    //         "isDummy": false,
    //         "category": {
    //             "name": "Netflix"
    //         }
    //     },
    //     {
    //         "userEmail": "syh300089@gmail.com",
    //         "duration": 1,
    //         "startTime": 1723701310612,
    //         "date": "8/15/2024",
    //         "isDummy": false,
    //         "category": {
    //             "name": "ENGLISH"
    //         }
    //     }
    // ]
    //#endregion

    //#region Update cache
    let cache = DynamicCache || (await openCache(CacheName));
    let statResponse = await cache.match(BASE_URL + RESOURCE.POMODOROS);
    if (statResponse !== undefined) {
      let statData = await statResponse.json();

      const dataToPush: PomodoroSessionDocument[] = final;
      statData.push(...dataToPush);

      await cache.put(
        BASE_URL + RESOURCE.POMODOROS,
        new Response(JSON.stringify(statData))
      );
    }
    //#endregion

    axiosInstance.post(RESOURCE.POMODOROS, {
      pomodoroRecordArr: final,
    });
  } catch (err) {
    if (
      // ignore the code below for now
      !window.navigator.onLine &&
      // !(err as AxiosError).response && // https://stackoverflow.com/questions/62061642/how-to-check-if-axios-call-fails-due-to-no-internet-connection/72198060#72198060
      (err as AxiosError).code === "ERR_NETWORK"
    ) {
      // console.log("network is not connected");
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
    noti.close();
    window.focus();
  });

  setTimeout(() => {
    noti.close();
  }, 5000);
}
