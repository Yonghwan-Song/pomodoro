import { useState, useMemo, useEffect, useRef, useReducer } from "react";
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
  updateTimersStates,
  openIndexedDB,
  DB,
} from "../../../..";
import {
  Category,
  CategoryChangeInfo,
  RecType,
  TimerStateType,
  TimersStatesType,
} from "../../../../types/clientStatesType";
import { axiosInstance } from "../../../../axios-and-error-handling/axios-instances";
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
import { useBoundedPomoInfoStore } from "../../../../zustand-stores/pomoInfoStoreUsingSlice";
import { Grid } from "../../../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../../../ReusableComponents/Layouts/GridItem";
import { FlexBox } from "../../../../ReusableComponents/Layouts/FlexBox";
import CircularProgressBar from "../CircularProgressBar/circularProgressBar";
import { Tooltip } from "react-tooltip";
import PauseTimer from "../PauseTimer";
import { Button } from "../../../../ReusableComponents/Buttons/Button";
import { ACTION, reducer, TimerAction } from "../reducers";
import Time from "../Time/Time";

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
  const updateCategoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.setCategoryChangeInfoArray
  );
  const categoriesFromStore = useBoundedPomoInfoStore(
    (state) => state.categories
  );
  const categoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.categoryChangeInfoArray
  );
  const colorForUnCategorized = useBoundedPomoInfoStore(
    (state) => state.colorForUnCategorized
  );
  const doesItJustChangeCategory = useBoundedPomoInfoStore(
    (state) => state.doesItJustChangeCategory
  );
  const currentCategory = useMemo(() => {
    return categoriesFromStore.find((c) => c.isCurrent) ?? null;
  }, [categoriesFromStore]);
  const [durationInMinutes, setDurationInMinutes] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return (statesRelatedToTimer as TimersStatesType).duration;
    } else {
      return pomoDuration;
    }
  }); // How long the timer is going to run next time.

  const durationInSeconds = durationInMinutes * 60;

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

  const [timerState, dispatch] = useReducer<
    (state: TimerStateType, action: TimerAction) => TimerStateType,
    TimerStateType
  >(
    reducer,
    {
      running: false,
      startTime: 0,
      pause: { totalLength: 0, record: [] },
    },
    initializeTimerState
  );

  const [remainingDuration, setRemainingDuration] = useState(
    initializeRemainingDuration
  );
  const autoStartSetting = useBoundedPomoInfoStore(
    (state) => state.autoStartSetting
  );

  const DURATIONS = {
    pomoDuration,
    shortBreakDuration,
    longBreakDuration,
  };

  const isFirstRender = useRef(true);
  const prevSessionType = useRef<number>(0);

  //#region Initializers
  function initializeTimerState(initialVal: TimerStateType): TimerStateType {
    let timerState = initialVal;
    Object.keys(statesRelatedToTimer).length !== 0 &&
      (timerState = {
        running: (statesRelatedToTimer as TimersStatesType).running,
        startTime: (statesRelatedToTimer as TimersStatesType).startTime,
        pause: (statesRelatedToTimer as TimersStatesType).pause,
      });
    return timerState;
  }
  function initializeRemainingDuration() {
    // let retVal = durationInSeconds,// this makes a timer not be able to go to next sessin when re-opening the app after a certain session has already finished.
    let remainingDuration = 0;
    let timePassed = 0;
    let timeCountedDown = 0; // timeCountedDown = timePassed - pause.totalLength

    if (Object.keys(statesRelatedToTimer).length !== 0) {
      let { duration, pause, running, startTime } =
        statesRelatedToTimer as TimersStatesType;
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
        //TODO
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
    }
    return remainingDuration;
  }
  //#endregion

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

    const session = identifyPrevSession({
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
  /**
   * For example, if howManyCountdown === 0,
   * it means that the previous session was Long Break and the current session is Pomo.
   * We do not consider whether the Pomo session is running or not, here, because that is not important in this function.
   */
  function identifyPrevSession({
    howManyCountdown,
    numOfPomo,
  }: {
    howManyCountdown: number;
    numOfPomo: number;
  }): SESSION {
    if (howManyCountdown === 0) {
      // Timer component말고 여기서 re-fresh했을 때, repetitionCount가 0인 경우에 call되면, 계속 short-break이라고 나와서.
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
      updateCategoryChangeInfoArray(infoArr);
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
          let copiedCategoryChangeInfoArray = structuredClone(
            categoryChangeInfoArray
          );
          copiedCategoryChangeInfoArray[0].categoryChangeTimestamp =
            sessionData.startTime;

          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            copiedCategoryChangeInfoArray,
            sessionData
          );
          if (!autoStartSetting.doesBreakStartAutomatically)
            updateTimersStates({
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              duration: shortBreakDuration,
              repetitionCount: repetitionCount + 1,
            });
        } else {
          // console.log("user is not ready", user);
        }
        notify("shortBreak");
        setDurationInMinutes(shortBreakDuration!);
        setRepetitionCount(repetitionCount + 1);
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: shortBreakDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
          ],
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

        if (user) {
          if (!autoStartSetting.doesPomoStartAutomatically)
            updateTimersStates({
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              duration: pomoDuration,
              repetitionCount: repetitionCount + 1,
            });
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
        }

        setDurationInMinutes(pomoDuration!);
        setRepetitionCount(repetitionCount + 1);
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: pomoDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
          ],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        await persistSingleTodaySessionToIDB({
          kind: "break",
          data: sessionData,
        });
        break;

      case SESSION.LAST_POMO:
        prevSessionType.current = session;
        notify("longBreak");

        if (user) {
          let copiedCategoryChangeInfoArray = structuredClone(
            categoryChangeInfoArray
          );
          copiedCategoryChangeInfoArray[0].categoryChangeTimestamp =
            sessionData.startTime;

          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            copiedCategoryChangeInfoArray,
            sessionData
          );
          if (!autoStartSetting.doesBreakStartAutomatically)
            updateTimersStates({
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              duration: longBreakDuration,
              repetitionCount: repetitionCount + 1,
            });
        }

        setDurationInMinutes(longBreakDuration!);
        setRepetitionCount(repetitionCount + 1);
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: longBreakDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
          ],
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

        if (user) {
          await updateTimersStates({
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: pomoDuration,
            repetitionCount: 0,
          });
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
        }

        //setCycleCount((prev) => prev + 1);
        setDurationInMinutes(pomoDuration!); //TODO: non-null assertion....
        setRepetitionCount(0);
        setIsOnCycle(false);
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: pomoDuration },
            {
              name: "repetitionCount",
              value: 0,
            },
          ],
        });

        // for timeline
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        await persistSingleTodaySessionToIDB({
          kind: "break",
          data: sessionData,
        });
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
    async function changeCategoryWithRecordingPrev() {
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
            updateCategoryChangeInfoArray([infoObj]);
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

            updateCategoryChangeInfoArray([
              ...categoryChangeInfoArray,
              infoObj,
            ]);
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
          updateCategoryChangeInfoArray([infoObj]);
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
    async function changeCategoryWithoutRecordingPrev() {
      if (isFirstRender.current) {
        isFirstRender.current = false;
      } else {
        const updated = structuredClone(categoryChangeInfoArray);
        if (currentCategory) {
          updated[updated.length - 1]._uuid = currentCategory?._uuid;
          updated[updated.length - 1].categoryName = currentCategory?.name;
          updated[updated.length - 1].color = currentCategory?.color;
        } else {
          delete updated[updated.length - 1]._uuid;
          updated[updated.length - 1].categoryName = "uncategorized";
          updated[updated.length - 1].color = colorForUnCategorized;
        }

        updateCategoryChangeInfoArray(updated);
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
      if (doesItJustChangeCategory) changeCategoryWithoutRecordingPrev();
      else changeCategoryWithRecordingPrev();
    }
  }, [currentCategory?.name]);

  useEffect(() => {
    const prevSession = identifyPrevSession({
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

  //#region UseEffects from Timer.tsx
  useEffect(autoStartNextSession, [repetitionCount, durationInSeconds]);
  useEffect(setRemainingDurationAfterReset, [
    remainingDuration,
    durationInSeconds,
    timerState.running,
  ]);
  useEffect(setRemainingDurationAfterMount, [
    remainingDuration,
    durationInSeconds,
    timerState.running,
  ]);
  useEffect(countDown, [
    remainingDuration,
    durationInSeconds,
    timerState.running,
  ]);
  useEffect(checkIfSessionShouldBeFinished, [
    remainingDuration,
    durationInSeconds,
    timerState.running,
  ]);
  // useEffect(logPause, [
  //   remainingDuration,
  //   durationInSeconds,
  //   timerState.running,
  // ]);
  //#endregion

  //#region Side Effect Callbacks from Timer.tsx
  function logPause() {
    remainingDuration !== 0 &&
      timerState.startTime !== 0 &&
      timerState.running === false &&
      console.log(timerState.pause);
  }
  function setRemainingDurationAfterReset() {
    // set remaining duration to the one newly passed in from the PatternTimer.
    remainingDuration === 0 &&
      timerState.startTime === 0 &&
      setRemainingDuration(durationInSeconds);
  }
  function setRemainingDurationAfterMount() {
    // as soon as this component is mounted:
    remainingDuration !== 0 &&
      timerState.startTime === 0 &&
      setRemainingDuration(durationInSeconds);
  }
  function countDown() {
    /**
     * 리팩터 하기 전의 조건식: remainingDuration !== 0 && state.startTime !== 0 && state.running === true
     * 조금 헷갈리지만, timerState.running === true 이면 timerState.startTime !== 0이다.
     * pause했을 때는 최소한 timerState.running===false이므로 countDown은 되지 않는다.
     * timerState.startTime에 영향을 주는 ACTION은 START과 RESET.
     * RESET은 starTime을 0으로 만들고 START은 0이 아닌 값을 갖게 한다.
     */
    if (timerState.running && remainingDuration > 0) {
      const id = setInterval(() => {
        setRemainingDuration(
          Math.floor(
            (durationInSeconds * 1000 -
              (Date.now() -
                timerState.startTime -
                timerState.pause.totalLength)) /
              1000
          )
        );
      }, 500);
      return () => {
        clearInterval(id);
        // console.log(`startTime - ${timerState.startTime}`);
      };
    }
  }

  /**
   * Purpose: To check if this session should be finished.
   *
   * 이 함수에 의해 종료되는 세션은 next함수에서 concentrationTime === duration인 경우에 해당된다.
   * 왜냐하면 remainingDuration <= 0인 경우에 발동되기 때문이다.
   */
  function checkIfSessionShouldBeFinished() {
    check(timerState.startTime);

    async function doesFailedReqInfoExistInIDB() {
      let userEmail = user?.email;
      if (userEmail) {
        let db = DB || (await openIndexedDB());
        const store = db
          .transaction("failedReqInfo", "readonly")
          .objectStore("failedReqInfo");
        const info = await store.get(userEmail);
        return !!info;
      } else {
        // it should be always false for unlogged-in user.
        return false;
      }
    }

    async function check(startTime: number) {
      if (startTime !== 0) {
        let flag = await doesFailedReqInfoExistInIDB();
        if (
          remainingDuration === 0 ||
          (remainingDuration < 0 && flag === false) //! 앱 다시 열자마자 이 함수가 호출되니까... 만약 failedReq이 있다면.. 그것을 처리하고 판이 다시 짜지기 때문에..
        ) {
          next({
            howManyCountdown: repetitionCount + 1,
            state: timerState,
          });
          dispatch({ type: ACTION.RESET });
        }
      }
    }
  }

  function autoStartNextSession() {
    // Auto start all pomo sessions of a cycle
    if (
      autoStartSetting.doesPomoStartAutomatically &&
      isNextSessionNew() &&
      isNextSessionPomo() &&
      !isNextSessionStartOfCycle()
    ) {
      startNext(pomoDuration, Date.now());
    }

    // Auto start all break sessions of a cycle
    if (
      autoStartSetting.doesBreakStartAutomatically &&
      isNextSessionNew() &&
      isNextSessionBreak() &&
      !isNextSessionStartOfCycle()
    ) {
      if (repetitionCount === numOfPomo * 2 - 1)
        startNext(longBreakDuration, Date.now());
      else startNext(shortBreakDuration, Date.now());
    }

    // [timerState.startTime]이 dep arr => session이 1)끝났을 때 그리고 2)시작할 때 side effect이 호출.
    function isNextSessionNew() {
      return timerState.running === false && timerState.startTime === 0;
    }
    function isNextSessionStartOfCycle() {
      return repetitionCount === 0;
    }
    function isNextSessionPomo() {
      return repetitionCount % 2 === 0;
    }
    function isNextSessionBreak() {
      return repetitionCount % 2 !== 0;
    }
    function startNext(duration: number, startTime: number) {
      if (repetitionCount === 0) {
        user !== null &&
          updateTimersStates({
            startTime,
            running: true,
            pause: { totalLength: 0, record: [] },
          });
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "repetitionCount", value: 0 },
            { name: "duration", value: duration },
          ],
        });
        setIsOnCycle(true);
      } else {
        dispatch({ type: ACTION.START, payload: startTime });
        user !== null &&
          updateTimersStates({
            startTime,
            running: true,
            pause: { totalLength: 0, record: [] },
            repetitionCount,
            duration,
          });
      }
    }
  }
  //#endregion

  //#region Button Click Handlers
  //문제점: toggle이 나타내는 case들 중 분명 resume이라는게 존재하는데 조건식에서 resume이라는 단어는 코빼기도 보이지 않는다.
  async function toggleTimer(momentTimerIsToggled: number) {
    if (doWeStartTimer()) {
      // dispatch({ type: ACTION.START, payload: momentTimerIsToggled }); //TODO 이거 아래 안쪽으로 들어가야하는거 아니야?

      //* A new cycle begins.
      if (repetitionCount === 0) {
        dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
        user !== null &&
          updateTimersStates({
            startTime: momentTimerIsToggled,
            running: true,
            pause: { totalLength: 0, record: [] },
          });
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "repetitionCount", value: 0 },
            { name: "duration", value: durationInSeconds / 60 },
          ],
        });
        setIsOnCycle(true);
      }

      if (repetitionCount !== 0) {
        dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
        user !== null &&
          updateTimersStates({
            startTime: momentTimerIsToggled,
            running: true,
            pause: { totalLength: 0, record: [] },
            repetitionCount,
            duration: durationInSeconds / 60,
          });
      }
    } else if (doWeResumeTimer()) {
      dispatch({ type: ACTION.RESUME, payload: momentTimerIsToggled });
      // to serveer
      user &&
        updateTimersStates({
          startTime: timerState.startTime,
          running: true,
          pause: {
            record: timerState.pause!.record.map((obj) => {
              if (obj.end === undefined) {
                return {
                  ...obj,
                  end: momentTimerIsToggled,
                };
              } else {
                return obj;
              }
            }),
            totalLength:
              timerState.pause!.totalLength +
              (momentTimerIsToggled -
                timerState.pause!.record[timerState.pause!.record.length - 1]
                  .start),
          },
        });
    } else if (doWePauseTimer()) {
      dispatch({ type: ACTION.PAUSE, payload: momentTimerIsToggled });
      // to serveer
      user &&
        updateTimersStates({
          startTime: timerState.startTime,
          running: false,
          pause: {
            ...timerState.pause,
            record: [
              ...timerState.pause!.record,
              { start: momentTimerIsToggled, end: undefined },
            ],
          },
        });
    }
    function doWeStartTimer() {
      return (
        timerState.running === false && timerState.pause!.record.length === 0
      ); // if this is not the first start of the timer, it means resuming the timer.
    }
    function doWeResumeTimer() {
      return (
        timerState.running === false && timerState.pause!.record.length !== 0
      );
    }
    function doWePauseTimer() {
      return timerState.running;
    }
  }

  /**
   * Purpose: To forcibly end the current session though the timer is running.
   *
   * What it does:
   * 1. save states to the idb
   * 2. persist states to the server
   * 3. call next()
   * 4. setStates
   *
   * @param now the moment a session is forced to end in the middle.
   */
  async function endTimer(now: number) {
    const timeCountedDownInMilliSeconds =
      (durationInSeconds - remainingDuration) * 1000;

    if (isThisSessionPaused()) {
      let stateCloned = { ...timerState };
      stateCloned.pause.totalLength +=
        now -
        stateCloned.pause.record[stateCloned.pause.record.length - 1].start;
      stateCloned.pause.record[stateCloned.pause.record.length - 1].end = now;
      next({
        howManyCountdown: repetitionCount + 1,
        state: stateCloned,
        timeCountedDownInMilliSeconds: timeCountedDownInMilliSeconds,
        endForced: now,
      });
    } else {
      next({
        howManyCountdown: repetitionCount + 1,
        state: timerState,
        timeCountedDownInMilliSeconds: timeCountedDownInMilliSeconds,
        endForced: now,
      });
    }

    dispatch({ type: ACTION.RESET });
    setRemainingDuration(0);

    function isThisSessionPaused() {
      return (
        timerState.pause.record.length !== 0 &&
        timerState.pause.record[timerState.pause.record.length - 1].end ===
          undefined
      );
    }
  }
  //#endregion

  //#region Etc functions
  //이 함수의 논리는 next함수에서 사용하는 것과 동일하다.
  /**
   * @param numOfPomo pomo세션 몇개를 한 사이클이 포함하고 있는지(완료시켜야 하는지)
   * @param howManyCountdown numOfPomo중에 실제로 몇번 pomo세션을 완료했는지를 나타낸다. 이 두개를 비교해서 한사이클이 다 끝났는지 그리고 다음 세션은 어떤 것이어야 하는지 파악 할 수 있다.
   * @returns 이제 한사이클 다 돌아서 새로 시작해야 하는 경우에만 repetitionCount를 0값으로 return value에 포함시킨다.
   */
  function determinePatternTimerStates({
    howManyCountdown,
    numOfPomo,
  }: {
    howManyCountdown: number;
    numOfPomo: number;
  }): {
    duration: number;
    kind: "pomoDuration" | "shortBreakDuration" | "longBreakDuration";
    repetitionCount?: number;
  } {
    let retVal: {
      duration: number;
      kind: "pomoDuration" | "shortBreakDuration" | "longBreakDuration";
      repetitionCount?: number;
    } | null = null;
    // console.log(
    //   "<-------------------determineNextPatternTimerStates------------------->"
    // );
    // console.log("durations", {
    //   pomoDuration,
    //   shortBreakDuration,
    //   longBreakDuration,
    // });
    // console.log("args", { howManyCountdown, numOfPomo });
    // console.log(
    //   "<--------------------------------------------------------------------->"
    // );
    if (howManyCountdown < numOfPomo * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        retVal = { duration: shortBreakDuration, kind: "shortBreakDuration" };
      } else {
        retVal = { duration: pomoDuration, kind: "pomoDuration" };
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      retVal = { duration: longBreakDuration, kind: "longBreakDuration" };
    } else {
      retVal = {
        duration: pomoDuration,
        kind: "pomoDuration",
        repetitionCount: 0,
      };
    }
    return retVal;
  }
  //#endregion

  //#region from CountDownTimer
  let durationRemaining =
    remainingDuration < 0 ? (
      <h2>ending session...</h2>
    ) : (
      <h2 data-tooltip-id="session-info" style={{ cursor: "pointer" }}>
        <Time seconds={remainingDuration} />
      </h2>
    );
  let durationBeforeStart =
    !!(durationInSeconds / 60) === false ? (
      <h2>"loading data..."</h2>
    ) : (
      <h2 data-tooltip-id="session-info" style={{ cursor: "pointer" }}>
        <Time seconds={durationInSeconds} />
      </h2>
    );
  //#endregion

  //#region For Tooltip
  let range = "";
  if (timerState.startTime !== 0) {
    const start = new Date(timerState.startTime);
    const end = new Date(
      timerState.startTime +
        timerState.pause.totalLength +
        durationInSeconds * 1000
    );
    range = `${start.toLocaleTimeString()} ~ ${end.toLocaleTimeString()} | `;
  }

  const sessionInfo = determinePatternTimerStates({
    howManyCountdown: repetitionCount,
    numOfPomo: numOfPomo,
  });
  const originalDuration = DURATIONS[sessionInfo.kind];
  const tooltipContent =
    range +
    `${durationInSeconds / 60} = ${originalDuration} ${
      durationInSeconds / 60 - originalDuration >= 0
        ? "+ " + (durationInSeconds / 60 - originalDuration)
        : "- " + Math.abs(durationInSeconds / 60 - originalDuration)
    }`;
  //#endregion

  return (
    <Grid column={2} alignItems={"center"} columnGap="23px" padding="0px">
      <GridItem>
        <FlexBox justifyContent="space-evenly">
          <h1>{repetitionCount % 2 === 0 ? "POMO" : "BREAK"}</h1>
          {timerState.startTime === 0 ? durationBeforeStart : durationRemaining}
        </FlexBox>
        <Tooltip id="session-info" content={tooltipContent} place="top" />
      </GridItem>
      <GridItem rowStart={1} rowEnd={5} columnStart={2} columnEnd={3}>
        <CircularProgressBar
          progress={
            durationInSeconds === 0
              ? 0
              : remainingDuration < 0
              ? 1
              : 1 - remainingDuration / durationInSeconds
          }
          startTime={timerState.startTime}
          durationInSeconds={durationInSeconds}
          remainingDuration={remainingDuration}
          setRemainingDuration={setRemainingDuration}
          setDurationInMinutes={setDurationInMinutes}
        />
      </GridItem>
      <GridItem>
        <PauseTimer
          isOnSession={timerState.running || timerState.startTime !== 0}
          isPaused={
            timerState.running === false &&
            timerState.startTime !== 0 &&
            timerState.pause.record.length !== 0
          }
          pauseData={timerState.pause}
          startTime={timerState.startTime}
        />
      </GridItem>
      <GridItem>
        <FlexBox justifyContent="space-evenly">
          <Button
            type={"submit"}
            color={"primary"}
            handleClick={() => {
              toggleTimer(Date.now());
            }}
          >
            {timerState.running === true
              ? "Pause"
              : timerState.startTime === 0
              ? "Start"
              : "Resume"}
          </Button>
          <Button
            handleClick={() => {
              endTimer(Date.now());
            }}
          >
            End
          </Button>
        </FlexBox>
      </GridItem>
      <GridItem>
        <h3 style={{ textAlign: "center" }}>
          Remaining Pomo Sessions -{" "}
          {numOfPomo -
            (repetitionCount === 0
              ? 0
              : repetitionCount % 2 === 0
              ? repetitionCount / 2
              : (repetitionCount + 1) / 2)}
        </h3>
      </GridItem>
    </Grid>
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
