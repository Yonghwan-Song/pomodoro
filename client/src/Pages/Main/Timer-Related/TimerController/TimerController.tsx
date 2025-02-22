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
  persistTimersStatesToServer,
  openIndexedDB,
  DB,
  persistStatesToIDB,
} from "../../../..";
import {
  AutoStartSettingType,
  Category,
  CategoryChangeInfo,
  CycleInfoType,
  PomoSettingType,
  RecType,
  TimerStateType,
  TimersStatesType,
  TimersStatesTypeWithCurrentCycleInfo,
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
import {
  calculateCycleCount,
  calculateNumOfRemainingPomoSessions,
  calculateRepetitionCountWithinCycle,
  getProgress,
  msToSec,
  isThisFocusSession,
} from "../utility-functions";
import { roundTo_X_DecimalPoints } from "../../../../utils/number-related-utils";
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

type TimerControllerProps = {
  statesRelatedToTimer: TimersStatesType | {};
  currentCycleInfo: CycleInfoType | {};
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
  records: RecType[];
  setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
};

enum SESSION {
  POMO = 1,
  SHORT_BREAK,
  LAST_POMO,
  LONG_BREAK,
  VERY_LAST_POMO,
}

export function TimerController({
  statesRelatedToTimer,
  currentCycleInfo,
  pomoSetting,
  autoStartSetting,
  records,
  setRecords,
}: TimerControllerProps) {
  //#region global states
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
  const { user } = useAuthContext()!;
  //#endregion

  const {
    pomoDuration,
    shortBreakDuration,
    longBreakDuration,
    numOfPomo,
    numOfCycle,
  } = pomoSetting;

  //
  const currentCategory = useMemo(() => {
    return categoriesFromStore.find((c) => c.isCurrent) ?? null;
  }, [categoriesFromStore]);

  //
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
  const endTimeRefForAutoStart = useRef(0);
  const [remainingDuration, setRemainingDuration] = useState(
    initializeRemainingDuration
  );

  //#region Ratios and adherenceRate
  const totalFocusDurationTargetedInSec = 60 * pomoDuration * numOfPomo;
  const cycleDurationTargetedInSec =
    60 *
    (pomoDuration * numOfPomo +
      shortBreakDuration * (numOfPomo - 1) +
      longBreakDuration);
  const [totalFocusDurationInSec, setTotalFocusDurationInSec] = useState(() => {
    if (Object.entries(currentCycleInfo).length !== 0) {
      return (currentCycleInfo as CycleInfoType).totalFocusDuration;
    } else {
      return totalFocusDurationTargetedInSec;
    }
  });
  const [cycleDurationInSec, setCycleDurationInSec] = useState(() => {
    if (Object.entries(currentCycleInfo).length !== 0) {
      return (currentCycleInfo as CycleInfoType).cycleDuration;
    } else {
      return cycleDurationTargetedInSec;
    }
  });

  const ratioTargeted = roundTo_X_DecimalPoints(
    totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
    2
  );
  const currentRatio = roundTo_X_DecimalPoints(
    totalFocusDurationInSec / cycleDurationInSec,
    2
  );
  const adherenceRateInPercent = roundTo_X_DecimalPoints(
    (currentRatio / ratioTargeted) * 100,
    2
  );
  //#endregion

  /**
   * !IMPT
   * 사이클이 결국에는 focus duration setting이 결정적인 요소이고 다시 말하면,
   * 한 사이클이 목표하는 총 focus duration을 수행하는데 필요한 총 시간이 있을것이고,
   * 그렇다면 총 focus duration과 그것을 수행하는데 필요한 총 시간의 비를 사이클의 강도를 나타내는 하나의 척도로 사용할 수 있다.
   *
   * 그런데 실제로 작업을 하다보면, 생각했던/설정했던 정도만큼 시간을 활용하지/보내지 못하는 경우가 발생한다. (물론 강도값에 따라 다르지만...)
   *
   * 그래서 원래 목표로 했던/설정했던 structure대로 완벽하게 시간을 보냈다면, 100% 목표를 달성했다 할 수 있다.
   * 그런데 만약 화장실을 가든 뭐를 사먹으로 매점을 가던지 한다면, 현재 사이클이 그것들에 의해 얼마나 영향을 받았는지 숫자로 표현.
   * 자극도 되고 아주 조금이라도 더 시간을 잘 보내는데 도움이 되지 않을까 하는 마음에 adherenceRate이라는 값을 생각해봄.
   *
   * * 계산 방법 - actualRatio / targetRatio
   * ? Why? - 이런식으로 생각하면 된다.
   * ?      --> 같은 시간을 준다고 가정했을 때,
   * ?          actualRatio에 의해 뽑아낼 수 있는 작업량이
   * *          targetRatio값으로 뽑아야 했던 작업량에 비해 어느정도 인지... 알고 싶다는 거니까.
   * *          나누겠다는 거다...
   *
   * TODO - 변수명좀..
   */
  // We assume that a user is perfectly going to carry out current cycle.
  // And if an inccident occurs that either negatively or positively affect the assumption, we need to reflect it.
  // Based on my experience, it will mostly decrease the rate.

  //
  const isFirstRender = useRef(true);
  const prevSessionType = useRef<number>(0);

  //
  const durationInSeconds = durationInMinutes * 60;
  let isBeforeStartOfCycles =
    repetitionCount === 0 && timerState.startTime === 0;
  let cycleCount = calculateCycleCount(
    isBeforeStartOfCycles,
    numOfPomo,
    numOfCycle,
    repetitionCount
  );
  let repetitionCountWithinCycle = calculateRepetitionCountWithinCycle(
    numOfPomo,
    numOfCycle,
    repetitionCount,
    cycleCount
  ) as number;

  // console.log("numOfPomo", numOfPomo);
  // console.log("repetitionCount", repetitionCount);
  // console.log("repetitionCountWithinCycle", repetitionCountWithinCycle);
  //
  const DURATIONS = {
    pomoDuration,
    shortBreakDuration,
    longBreakDuration,
  };

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
    endTimeRefForAutoStart.current = endTime;

    const sessionData = {
      ...withoutRunning,
      endTime,
      timeCountedDown: timeCountedDownInMilliSeconds,
    };

    // console.log("howManyCountdown", howManyCountdown);
    // console.log("numOfPomo", numOfPomo);
    const prevSession = identifyPrevSession({
      howManyCountdown,
      numOfPomo,
    });
    // console.log("prevSession", SESSION[prevSession]);
    const currentSessionType = +prevSession % 2 === 0 ? "pomo" : "break";
    sessionStorage.setItem(CURRENT_SESSION_TYPE, currentSessionType);

    wrapUpSession({
      prevSession: prevSession,
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
      console.log("1");
      return SESSION.VERY_LAST_POMO;
    }

    // E.g) no matter what, we always add one to the repetitionCount and pass it to this function as the howManyCountdown arg.
    // NP = 2, NC = 2 -> PBPLPBP
    //                   01234567
    //        7 is caught by this conditional statement and repetitionCount set to zero again by wrapUpSession()
    //        to start new cycles of sessions. 실제로 repetitionCount 상태값이 7로 되지는 않고, 그냥 판단상 그렇게 하는거고
    //        wrapUpSession()에서 setRepetitionCount(0)를 call함.
    //! 그래서 mount됬을 때 currentSessionType확인 하는 setUp 함수에서 실제 repetitionCount를 arg로 보내기 때문에 (여기처럼 방금 끝난 세션이 뭔지 확인하기 위해 가상으로 1더하는게 아니고)
    //! 그 setUp함수에서 이 conditional block으로 오는 경우는 없다. :::...
    //! 그러므로 그냥 %2값만 가지고도 Pomo인지 Break인지 판단해도 괜찮다. :::...
    if (howManyCountdown === 2 * numOfPomo * numOfCycle - 1) {
      console.log("2");
      return SESSION.VERY_LAST_POMO;
    }

    if (numOfCycle > 1) {
      if (numOfPomo > 1) {
        // (numOfPomo, numOfCycle) = (3, 2) -> PBPBPL|PBPBP
        //                         = (2, 3) -> PBPL|PBPL|PBP
        if (howManyCountdown % 2 === 0) {
          if (howManyCountdown % (2 * numOfPomo) === 0) {
            console.log("3");
            return SESSION.LONG_BREAK;
          }
          console.log("4");
          return SESSION.SHORT_BREAK;
        }
        if (howManyCountdown % 2 === 1) {
          if ((howManyCountdown + 1) % (2 * numOfPomo) === 0) {
            console.log("5");
            return SESSION.LAST_POMO;
          }
          console.log("6");
          return SESSION.POMO;
        }
      } else if (numOfPomo === 1) {
        // numOfCycle = 3, 4 -> PL|PL|P, PL|PL|PL|P
        // Short break does not exist
        if (howManyCountdown % 2 === 0) {
          console.log("7");
          return SESSION.LONG_BREAK;
        }
        if (howManyCountdown % 2 === 1) {
          console.log("8");
          return SESSION.LAST_POMO;
        }
      }
    } else if (numOfCycle === 1) {
      // Long break does not exist
      if (numOfPomo > 1) {
        // numOfPomo = 2, 5 -> PBP, PBPBPBPBP
        if (howManyCountdown % 2 === 1) {
          console.log("9");
          return SESSION.POMO;
        }
        if (howManyCountdown % 2 === 0) {
          console.log("10");
          return SESSION.SHORT_BREAK;
        }
      } else if (numOfPomo === 1) {
        // P
        console.log("11");
        return SESSION.VERY_LAST_POMO; // 여기까지 안오고 두번째 conditional block에 걸리네 그냥..
      }
    }

    console.log("12");
    return SESSION.POMO; //dummy
  }
  //#endregion

  /**
   * Purpose
   * A. 삼각. 다음 세션 진행하기 위한 정보의 변환 (TimersStatesType - client/src/types/clientStatesType.ts)
   *    1. F. E - 1) 상태를 변환 2) Indexed DB에 있는 해당 데이터의 sync를 맞춘다. --> (startTime, running, pause는 reducer에서 1), 2)를 모두 담당.
   *    2. B. E - API를 통해 DB에 있는 데이터 변환.
   * B. 세션을 마무리하면서 생기는 데이터를 client state과 DB에 반영
   *    1. pomodoro records ( <=> Pomodoros Collection in DB)
   *      1) DB에 persist
   *      2) Cache에 - Statistics component에서 불필요하게 HTTP request를 날리지 않게 하기 위해.
   *    2. 삼각. records of today (either pomo or break) ( <=> TodayRecords Collection in DB) - For the Timeline component
   *      1) setState
   *      2) DB에 persist
   *      3) Indexed DB에 - unlogged-in user도 Timeline기능을 사용할 수 있게 하기 위해.
   */
  async function wrapUpSession({
    prevSession,
    data,
  }: {
    prevSession: SESSION;
    data: {
      state: TimerStateType;
      timeCountedDownInMilliSeconds: number;
      sessionData: Omit<RecType, "kind">;
    };
  }) {
    // console.log("SESSION inside wrapUpSession", SESSION[prevSession]);

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

    prevSessionType.current = prevSession;

    switch (prevSession) {
      case SESSION.POMO:
        notify("shortBreak");
        //#region A
        // A - 1: F.E
        // 1)
        setDurationInMinutes(shortBreakDuration!);
        setRepetitionCount(repetitionCount + 1);
        // 2)
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: shortBreakDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
          ],
        });
        // A - 2: B.E
        // 자동시작 - 근본적으로  //!TimerState (running, startTime, pause)만 바꿔주면 됨.
        // duration은 이미 정해져 있는거 그게 무엇이 되었든 그걸 돌릴것이고,
        // repetitionCount는 시작할 때는 별 문제가 되지 않아 (끝났을 때 신경 써줘야 할 것임).
        if (!autoStartSetting.doesBreakStartAutomatically) {
          user &&
            persistTimersStatesToServer({
              // 아래 TimerState도 사실, state update할 때, 그곳에서 이 API를 call하면 모양이 예쁜데,
              // 아래 마지막 두개 PatternTimerStates도 같이 한번에 보내기 위해 이해하기 불편하지만 여기에 적었음.
              //TimerStateType
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              //PatternTimerStatesType
              duration: shortBreakDuration,
              repetitionCount: repetitionCount + 1,
            });
        }
        //#endregion
        //#region B 세션을 마무리하면서 생기는 데이터를 client state과 DB에 반영
        // B - 1: pomodoro records
        if (user) {
          let copiedCategoryChangeInfoArray = structuredClone(
            categoryChangeInfoArray
          );
          copiedCategoryChangeInfoArray[0].categoryChangeTimestamp =
            sessionData.startTime;
          // 1) and 2) 모두 아래 함수에서 실행한다.
          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            copiedCategoryChangeInfoArray,
            sessionData
          );
        }
        // B - 2: records of today
        // 1)
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        // 2)
        user &&
          persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });
        // 3)
        await persistSingleTodaySessionToIDB({
          kind: "pomo",
          data: sessionData,
        });
        //#endregion
        break;

      case SESSION.SHORT_BREAK:
        notify("pomo");

        //#region A 다음 세션 진행하기 위한 정보의 변환
        // A - 1: F.E
        // 1)
        setDurationInMinutes(pomoDuration!);
        setRepetitionCount(repetitionCount + 1);
        // 2)
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: pomoDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
          ],
        });
        // A - 2: B.E
        if (!autoStartSetting.doesPomoStartAutomatically) {
          user &&
            persistTimersStatesToServer({
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              duration: pomoDuration,
              repetitionCount: repetitionCount + 1,
            });
        } //#endregion

        //#region B 세션을 마무리하면서 생기는 데이터를 client state과 DB에 반영
        // B - 2: records of today
        // 1)
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        // 2)
        user &&
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
        // 3)
        await persistSingleTodaySessionToIDB({
          kind: "break",
          data: sessionData,
        });
        //#endregion
        break;

      case SESSION.LAST_POMO:
        notify("longBreak");

        //#region A 다음 세션 진행하기 위한 정보의 변환
        // A - 1: F.E
        // 1)
        setDurationInMinutes(longBreakDuration!);
        setRepetitionCount(repetitionCount + 1);
        // 2)
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: longBreakDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
          ],
        });
        // A - 2: B.E
        if (!autoStartSetting.doesBreakStartAutomatically) {
          user &&
            persistTimersStatesToServer({
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              duration: longBreakDuration,
              repetitionCount: repetitionCount + 1,
            });
        } //#endregion

        //#region B 세션을 마무리하면서 생기는 데이터를 client state과 DB에 반영
        // B - 1: pomodoro records
        if (user) {
          let copiedCategoryChangeInfoArray = structuredClone(
            categoryChangeInfoArray
          );
          copiedCategoryChangeInfoArray[0].categoryChangeTimestamp =
            sessionData.startTime;
          // 1) and 2) 모두 아래 함수에서 실행한다.
          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            copiedCategoryChangeInfoArray,
            sessionData
          );
        }
        // B - 2: records of today
        // 1)
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        // 2)
        user &&
          persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });
        // 3)
        await persistSingleTodaySessionToIDB({
          kind: "pomo",
          data: sessionData,
        });
        //#endregion

        break;

      case SESSION.VERY_LAST_POMO:
        notify("cyclesCompleted");

        setTotalFocusDurationInSec(totalFocusDurationTargetedInSec);
        setCycleDurationInSec(cycleDurationTargetedInSec);
        //#region A
        // A - 1: F.E
        // 1)
        setDurationInMinutes(pomoDuration);
        setRepetitionCount(0);
        // 2)
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: pomoDuration },
            {
              name: "repetitionCount",
              value: 0,
            },
            {
              name: "currentCycleInfo",
              value: {
                totalFocusDuration: totalFocusDurationTargetedInSec,
                cycleDuration: cycleDurationTargetedInSec,
              },
            },
          ],
        });
        // A - 2: B.E
        if (user) {
          await persistTimersStatesToServer({
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: pomoDuration,
            repetitionCount: 0,
          });
          axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
            totalFocusDuration: totalFocusDurationTargetedInSec,
            cycleDuration: cycleDurationTargetedInSec,
          });
        }

        //#endregion

        //#region B 세션을 마무리하면서 생기는 데이터를 client state과 DB에 반영
        // B - 1: pomodoro records
        if (user) {
          let copiedCategoryChangeInfoArray = structuredClone(
            categoryChangeInfoArray
          );
          copiedCategoryChangeInfoArray[0].categoryChangeTimestamp =
            sessionData.startTime;
          // 1) and 2) 모두 아래 함수에서 실행한다.
          await recordPomo(
            user,
            Math.floor(timeCountedDownInMilliSeconds / (60 * 1000)),
            state.startTime,
            currentCategory,
            copiedCategoryChangeInfoArray,
            sessionData
          );
        }
        // B - 2: records of today
        // 1)
        setRecords((prev) => [...prev, { kind: "pomo", ...sessionData }]);
        // 2)
        user &&
          persistRecOfTodayToServer(user, { kind: "pomo", ...sessionData });
        // 3)
        await persistSingleTodaySessionToIDB({
          kind: "pomo",
          data: sessionData,
        });
        //#endregion
        break;

      case SESSION.LONG_BREAK:
        notify("nextCycle");

        setTotalFocusDurationInSec(totalFocusDurationTargetedInSec);
        setCycleDurationInSec(cycleDurationTargetedInSec);
        //#region A 다음 세션 진행하기 위한 정보의 변환
        // A - 1: F.E
        // 1)
        setDurationInMinutes(pomoDuration!); //TODO: non-null assertion....
        setRepetitionCount(repetitionCount + 1);
        // 2)
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "duration", value: pomoDuration },
            {
              name: "repetitionCount",
              value: repetitionCount + 1,
            },
            {
              name: "currentCycleInfo",
              value: {
                totalFocusDuration: totalFocusDurationTargetedInSec,
                cycleDuration: cycleDurationTargetedInSec,
              },
            },
          ],
        });

        if (user)
          axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
            totalFocusDuration: totalFocusDurationTargetedInSec,
            cycleDuration: cycleDurationTargetedInSec,
          });

        // A - 2: B.E
        if (!autoStartSetting.doesCycleStartAutomatically) {
          user &&
            (await persistTimersStatesToServer({
              running: false,
              startTime: 0,
              pause: { totalLength: 0, record: [] },
              duration: pomoDuration,
              repetitionCount: repetitionCount + 1,
            }));
        }
        //#endregion

        //#region B 세션을 마무리하면서 생기는 데이터를 client state과 DB에 반영
        // B - 2: records of today
        // 1)
        setRecords((prev) => [...prev, { kind: "break", ...sessionData }]);
        // 2)
        user &&
          persistRecOfTodayToServer(user, { kind: "break", ...sessionData });
        // 3)
        await persistSingleTodaySessionToIDB({
          kind: "break",
          data: sessionData,
        });
        //#endregion

        break;

      default:
        break;
    }
  }
  //#endregion

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
          SESSION[prevSessionType.current] === "LONG_BREAK" ||
          SESSION[prevSessionType.current] === "VERY_LAST_POMO"
        ) {
          if (
            (states as TimersStatesTypeWithCurrentCycleInfo).running ===
              false &&
            (states as TimersStatesTypeWithCurrentCycleInfo).startTime === 0
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
    // }, [currentCategory?.name]);
  }, [currentCategory?.name, doesItJustChangeCategory]);

  useEffect(() => {
    const prevSession = +identifyPrevSession({
      howManyCountdown: repetitionCount,
      numOfPomo,
    });
    // console.log(
    //   `prevSession calculated in  [] side-effect`,
    //   SESSION[prevSession]
    // );
    prevSessionType.current = prevSession;

    let currentSessionType = "";
    if (prevSession === 5) {
      currentSessionType = "pomo";
    } else if (prevSession % 2 === 0) {
      currentSessionType = "pomo";
    } else currentSessionType = "break";
    // const currentSessionType = +prevSession % 2 === 0 ? "pomo" : "break";
    sessionStorage.setItem(CURRENT_SESSION_TYPE, currentSessionType); // CategoryList component에서 이 값이 필요함.
  }, []);

  //#region UseEffects from Timer.tsx
  useEffect(autoStartCurrentSession, [repetitionCount, durationInSeconds]);
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

  function autoStartCurrentSession() {
    if (!isSessionNotStartedYet()) return;

    const prevSessionType = identifyPrevSession({
      howManyCountdown: repetitionCount,
      numOfPomo,
    });

    switch (prevSessionType) {
      case SESSION.SHORT_BREAK:
        autoStartSetting.doesPomoStartAutomatically &&
          startSession(pomoDuration, Date.now());
        break;

      case SESSION.POMO:
        autoStartSetting.doesBreakStartAutomatically &&
          startSession(shortBreakDuration, Date.now());
        break;

      case SESSION.LAST_POMO:
        autoStartSetting.doesBreakStartAutomatically &&
          startSession(longBreakDuration, Date.now());
        break;

      case SESSION.LONG_BREAK:
        autoStartSetting.doesCycleStartAutomatically &&
          startSession(pomoDuration, Date.now());
        break;

      default:
        break;
    }

    function isSessionNotStartedYet() {
      // [timerState.startTime]이 dep arr => session이 1)끝났을 때 그리고 2)시작할 때 side effect이 호출.
      return timerState.running === false && timerState.startTime === 0;
    }
    function startSession(duration: number, startTime: number) {
      if (repetitionCount === 0) {
        user !== null &&
          persistTimersStatesToServer({
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
      } else {
        dispatch({ type: ACTION.START, payload: startTime });

        if (records.length !== 0 && prevSessionType !== SESSION.LONG_BREAK) {
          let lastSessionEndTime = records[records.length - 1].endTime;
          // negative value is not supposed to be calculated here. It is an error and before debugging it, I am just going to handle it with if conditional blocks.
          let gapInMs = startTime - endTimeRefForAutoStart.current;
          if (gapInMs < 0) gapInMs = 0;

          // 여기서부터의 gap값은 틀린 값이 없다.
          let gapInSec = msToSec(gapInMs);
          //* Whether the current session is a focus session or break session does not matter.
          //* In both cases, what only changes is the cycleDuration.
          if (
            gapInSec > 0 &&
            endTimeRefForAutoStart.current !== 0 // just in case
          ) {
            // 한 세션이 끝난 후 곧바로 자동시작 하는 경우 말고, 사실상 이전 세션이 종료된 이후의 시점에 앱을 다시 여는 경우
            // 이전에 진행 중에 앱을 종료했었기 때문에, 그것을 먼저 끝내고 다음 세션을 자동으로 시작하게 된다.
            // 이 경우, endTime of previous session과 current session의 startTime간의 간극이 생긴다.
            const newCycleDuration = cycleDurationInSec + gapInSec;
            setCycleDurationInSec(newCycleDuration);
            postMsgToSW("saveStates", {
              name: "currentCycleInfo",
              value: {
                totalFocusDuration: totalFocusDurationInSec,
                cycleDuration: newCycleDuration,
              },
            });
            axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
              totalFocusDuration: totalFocusDurationInSec,
              cycleDuration: newCycleDuration,
            });
          }
        } else {
          //TODO
        }

        user !== null &&
          persistTimersStatesToServer({
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
          persistTimersStatesToServer({
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
      }

      if (repetitionCount !== 0) {
        dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
        if (
          records.length !== 0 &&
          identifyPrevSession({
            howManyCountdown: repetitionCount,
            numOfPomo,
          }) !== SESSION.LONG_BREAK
        ) {
          let lastSessionEndTime = records[records.length - 1].endTime;
          // negative value is not supposed to be calculated here. It is an error and before debugging it, I am just going to handle it with if conditional blocks.
          let gapInMs = momentTimerIsToggled - lastSessionEndTime;
          if (gapInMs < 0) gapInMs = 0;

          // 여기서부터의 gap값은 틀린 값이 없다.
          let gapInSec = msToSec(gapInMs);
          //* Whether the current session is a focus session or break session does not matter.
          //* In both cases, what only changes is the cycleDuration.
          if (gapInSec > 0) {
            const newCycleDuration = cycleDurationInSec + gapInSec;
            setCycleDurationInSec(newCycleDuration);
            postMsgToSW("saveStates", {
              stateArr: [
                {
                  name: "currentCycleInfo",
                  value: {
                    totalFocusDuration: totalFocusDurationInSec,
                    cycleDuration: newCycleDuration,
                  },
                },
              ],
            });
            axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
              totalFocusDuration: totalFocusDurationInSec,
              cycleDuration: newCycleDuration,
            });
          }
        } else {
          //TODO
        }
        user !== null &&
          persistTimersStatesToServer({
            startTime: momentTimerIsToggled,
            running: true,
            pause: { totalLength: 0, record: [] },
            repetitionCount,
            duration: durationInSeconds / 60,
          });
      }
    } else if (doWeResumeTimer()) {
      dispatch({ type: ACTION.RESUME, payload: momentTimerIsToggled });
      let pause = {
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
      };
      // to serveer
      user &&
        persistTimersStatesToServer({
          startTime: timerState.startTime,
          running: true,
          pause,
        });

      // calculate the ratio affected
      const newCycleDuration = cycleDurationInSec + msToSec(pause.totalLength);
      setCycleDurationInSec(newCycleDuration);
      persistStatesToIDB({
        currentCycleInfo: {
          totalFocusDuration: totalFocusDurationInSec,
          cycleDuration: newCycleDuration,
        },
      });
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
        totalFocusDuration: totalFocusDurationInSec,
        cycleDuration: newCycleDuration,
      });
    } else if (doWePauseTimer()) {
      dispatch({ type: ACTION.PAUSE, payload: momentTimerIsToggled });
      // to serveer
      user &&
        persistTimersStatesToServer({
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

    if (isThisFocusSession(repetitionCount)) {
      const newTotalFocusDuration = totalFocusDurationInSec - remainingDuration;
      const newCycleDuration = cycleDurationInSec - remainingDuration;
      setTotalFocusDurationInSec(newTotalFocusDuration);
      setCycleDurationInSec(newCycleDuration);
      persistStatesToIDB({
        currentCycleInfo: {
          totalFocusDuration: newTotalFocusDuration,
          cycleDuration: newCycleDuration,
        },
      });
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
        totalFocusDuration: newTotalFocusDuration,
        cycleDuration: newCycleDuration,
      });
    } else {
      const newCycleDuration = cycleDurationInSec - remainingDuration;
      setCycleDurationInSec(newCycleDuration);
      persistStatesToIDB({
        currentCycleInfo: {
          totalFocusDuration: totalFocusDurationInSec,
          cycleDuration: newCycleDuration,
        },
      });
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
        totalFocusDuration: totalFocusDurationInSec,
        cycleDuration: newCycleDuration,
      });
    }

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
          <h1>{isThisFocusSession(repetitionCount) ? "POMO" : "BREAK"}</h1>
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
          repetitionCount={repetitionCount}
          remainingDuration={remainingDuration}
          setRemainingDuration={setRemainingDuration}
          setDurationInMinutes={setDurationInMinutes}
          totalFocusDurationInSec={totalFocusDurationInSec}
          setTotalFocusDurationInSec={setTotalFocusDurationInSec}
          cycleDurationInSec={cycleDurationInSec}
          setCycleDurationInSec={setCycleDurationInSec}
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
          {calculateNumOfRemainingPomoSessions(
            numOfPomo,
            repetitionCountWithinCycle
          )}
        </h3>
      </GridItem>
      <GridItem>
        <h3 style={{ textAlign: "center" }}>
          Cycle - {cycleCount} out of {numOfCycle}
        </h3>
      </GridItem>
      <GridItem>
        <span>current ratio - {currentRatio}</span>{" "}
        <span>targeted ratio - {ratioTargeted}</span>
        <p>adherence rate - {adherenceRateInPercent}%</p>
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
      userEmail: string; //TODO: 이거 없어도 bearer token에서 뽑아내잖아.
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
      body = "Time to focus";
      break;
    case "shortBreak":
      body = "Time to take a short break";
      break;
    case "longBreak":
      body = "Time to take a long break";
      break;
    case "nextCycle":
      body = "Time to do the next cycle of pomos";
      break;
    case "cyclesCompleted":
      body = "All cycles of focus durations are done";
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
