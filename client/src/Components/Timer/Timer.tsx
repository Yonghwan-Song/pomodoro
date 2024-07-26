import {
  useState,
  useEffect,
  useReducer,
  Dispatch,
  SetStateAction,
  useMemo,
} from "react";
import { reducerTimer as reducer, ACTION, TimerAction } from "../reducers";
import {
  AutoStartSettingType,
  TimerStateType,
  TimersStatesType,
} from "../../types/clientStatesType";
import { Button } from "../Buttons/Button";
import { Grid } from "../Layouts/Grid";
import { GridItem } from "../Layouts/GridItem";
import { FlexBox } from "../Layouts/FlexBox";
import { DB, openIndexedDB, postMsgToSW, updateTimersStates } from "../..";
import PauseTimer from "../PauseTimer/PauseTimer";
import { useAuthContext } from "../../Context/AuthContext";
import { useUserContext } from "../../Context/UserContext";
import Time from "../Time/Time";
import CircularProgressBar from "../CircularProgressBar/circularProgressBar";

type TimerProps = {
  statesRelatedToTimer: TimersStatesType | {};
  durationInSeconds: number;
  setDurationInMinutes: React.Dispatch<React.SetStateAction<number>>;
  next: ({
    howManyCountdown,
    state,
    timeCountedDownInMilliSeconds,
    endForced,
  }: {
    howManyCountdown: number;
    state: TimerStateType;
    timeCountedDownInMilliSeconds?: number;
    endForced?: number;
  }) => void;

  // Let's assume that one cycle is like below
  // {(focus, short break) * 4 + Long break}.
  // Then, the timer is going to be run 9 times. Thus, repetitionCount is supposed to be 9.
  repetitionCount: number;
  setRepetitionCount: Dispatch<SetStateAction<number>>;
  isOnCycle: boolean;
  setIsOnCycle: Dispatch<SetStateAction<boolean>>;
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
};

let argumentOfInitializer = {
  running: false,
  startTime: 0,
  pause: { totalLength: 0, record: [] },
};

export function Timer({
  statesRelatedToTimer,
  durationInSeconds,
  setDurationInMinutes,
  next,
  repetitionCount,
  setRepetitionCount,
  isOnCycle,
  setIsOnCycle,
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
}: TimerProps) {
  //#region States
  const { user } = useAuthContext()!;
  // lazy Initialization
  const [timerState, dispatch] = useReducer<
    (state: TimerStateType, action: TimerAction) => TimerStateType,
    TimerStateType
  >(reducer, argumentOfInitializer, initializeTimerState);

  const [remainingDuration, setRemainingDuration] = useState(
    initializeRemainingDuration
  );
  const userInfoContext = useUserContext()!;
  const autoStartSetting = useMemo(
    () =>
      userInfoContext.pomoInfo !== null
        ? userInfoContext.pomoInfo.autoStartSetting
        : ({} as AutoStartSettingType),
    [userInfoContext.pomoInfo]
  );
  //#endregion

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

  //#region Tracking mounting and states
  // useEffect(() => {
  //   console.log("AutoStartSetting", autoStartSetting);
  // });

  useEffect(() => {
    console.log("Timer was mounted");
    return () => {
      console.log("Timer was unmounted");
    };
  }, []);
  //#endregion

  //#region Button Click Handlers
  //문제점: toggle이 나타내는 case들 중 분명 resume이라는게 존재하는데 조건식에서 resume이라는 단어는 코빼기도 보이지 않는다.
  async function toggleTimer(momentTimerIsToggled: number) {
    if (start()) {
      // initial start
      dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
      if (repetitionCount === 0) {
        //new cycle
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
    } else if (resume()) {
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
    } else if (pause()) {
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
    function start() {
      return (
        timerState.running === false && timerState.pause!.record.length === 0
      ); // if this is not the first start of the timer, it means resuming the timer.
    }
    function resume() {
      return (
        timerState.running === false && timerState.pause!.record.length !== 0
      );
    }
    function pause() {
      return timerState.running;
    }
  }

  /**
   * What it does:
   * 1. save states to the idb
   * 2. persist states to the server
   * 3. call next()
   * 4. setStates
   *
   * @param now the moment a session is forced to end in the middle.
   */
  async function endTimer(now: number) {
    const patternTimerStates = determineNextPatternTimerStates({
      howManyCountdown: repetitionCount + 1,
      numOfPomo: numOfPomo,
    });

    postMsgToSW("saveStates", {
      stateArr: [
        {
          name: "repetitionCount",
          value: patternTimerStates.repetitionCount ?? repetitionCount + 1,
        },
      ],
    });

    const timeCountedDownInMilliSeconds =
      (durationInSeconds - remainingDuration) * 1000;

    // call next()
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
    setRepetitionCount(
      patternTimerStates.repetitionCount ?? repetitionCount + 1
    );
    setRemainingDuration(0);

    let nextRepetitionCount =
      patternTimerStates.repetitionCount ?? repetitionCount + 1;

    console.log("nextRepetitionCount", nextRepetitionCount);
    console.log(
      "doesPomoAutoStart",
      autoStartSetting.doesPomoStartAutomatically
    );
    console.log(
      "doesBreakAutoStart",
      autoStartSetting.doesBreakStartAutomatically
    );

    if (nextSessionIsStartOfCycle()) {
      user &&
        updateTimersStates({
          running: false,
          startTime: 0,
          pause: { totalLength: 0, record: [] },
          duration: patternTimerStates.duration!,
          repetitionCount: nextRepetitionCount,
        });
    } else {
      handleNonStartOfCycle();
    }

    function isNextSessionPomo() {
      return nextRepetitionCount % 2 === 0;
    }
    function isNextSessionBreak() {
      return nextRepetitionCount % 2 !== 0;
    }
    function nextSessionIsStartOfCycle() {
      return nextRepetitionCount === 0;
    }
    function handleNonStartOfCycle(): void {
      if (isNextSessionPomo() && !autoStartSetting.doesPomoStartAutomatically) {
        user &&
          updateTimersStates({
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: patternTimerStates.duration!,
            repetitionCount: nextRepetitionCount,
          });
      }
      if (
        isNextSessionBreak() &&
        !autoStartSetting.doesBreakStartAutomatically
      ) {
        user &&
          updateTimersStates({
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: patternTimerStates.duration!,
            repetitionCount: nextRepetitionCount,
          });
      }
    }
    function isThisSessionPaused() {
      return (
        timerState.pause.record.length !== 0 &&
        timerState.pause.record[timerState.pause.record.length - 1].end ===
          undefined
      );
    }
  }

  //#region UseEffects
  useEffect(autoStartNextSession, [repetitionCount]);

  useEffect(logPause, [
    remainingDuration,
    durationInSeconds,
    timerState.running,
  ]);

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
  // isPaused={timerState.running === false && timerState.startTime !== 0}

  useEffect(checkIfSessionShouldBeFinished, [
    remainingDuration,
    durationInSeconds,
    timerState.running,
  ]);
  //#endregion

  //#region Side Effect Callbacks
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
  // 이 함수에 의해 종료되는 세션은 next함수에서 concentrationTime === duration인 경우에 해당된다.
  // 왜냐하면 remainingDuration <= 0인 경우에 발동되기 때문이다.
  function checkIfSessionShouldBeFinished() {
    const patternTimerStates = determineNextPatternTimerStates({
      howManyCountdown: repetitionCount + 1,
      numOfPomo: numOfPomo,
    });

    let nextRepetitionCount =
      patternTimerStates.repetitionCount ?? repetitionCount + 1;

    checkWhetherSessionShouldBeFinished(timerState.startTime);

    function isNextSessionPomo() {
      return nextRepetitionCount % 2 === 0;
    }
    function isNextSessionBreak() {
      return nextRepetitionCount % 2 !== 0;
    }
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
    function isNextSessionStartOfCycle() {
      return nextRepetitionCount === 0;
    }
    function handleNonStartOfCycle(): void {
      if (isNextSessionPomo() && !autoStartSetting.doesPomoStartAutomatically) {
        user &&
          updateTimersStates({
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: patternTimerStates.duration!,
            repetitionCount: nextRepetitionCount,
          });
      }
      if (
        isNextSessionBreak() &&
        !autoStartSetting.doesBreakStartAutomatically
      ) {
        user &&
          updateTimersStates({
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: patternTimerStates.duration!,
            repetitionCount: nextRepetitionCount,
          });
      }
    }
    async function checkWhetherSessionShouldBeFinished(startTime: number) {
      // if (timerState.startTime !== 0) {
      if (startTime !== 0) {
        if (
          remainingDuration === 0 ||
          (remainingDuration < 0 &&
            (await doesFailedReqInfoExistInIDB()) === false)
        ) {
          setRepetitionCount(
            // patternTimerStates.repetitionCount ?? repetitionCount + 1
            nextRepetitionCount
          );
          postMsgToSW("saveStates", {
            stateArr: [
              {
                name: "repetitionCount",
                // value: patternTimerStates.repetitionCount ?? repetitionCount + 1,
                value: nextRepetitionCount,
              },
            ],
          });
          next({
            howManyCountdown: repetitionCount + 1,
            state: timerState,
          });
          // The changes of the states in this component
          dispatch({ type: ACTION.RESET });

          // Cases when the next session does not start automatically
          // 1. The next session is the start of a new cycle.
          if (isNextSessionStartOfCycle()) {
            user &&
              updateTimersStates({
                running: false,
                startTime: 0,
                pause: { totalLength: 0, record: [] },
                duration: patternTimerStates.duration!,
                repetitionCount: nextRepetitionCount,
              });
          } else {
            // 2.
            handleNonStartOfCycle();
          }
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
      toggleTimer(Date.now());
    }

    // Auto start all break sessions of a cycle
    if (
      autoStartSetting.doesBreakStartAutomatically &&
      isNextSessionNew() &&
      isNextSessionBreak() &&
      !isNextSessionStartOfCycle()
    ) {
      toggleTimer(Date.now());
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
  }
  //#endregion

  //#region Etc functions
  //이 함수의 논리는 next함수에서 사용하는 것과 동일하다.
  /**
   * @param numOfPomo pomo세션 몇개를 한 사이클이 포함하고 있는지(완료시켜야 하는지)
   * @param howManyCountdown numOfPomo중에 실제로 몇번 pomo세션을 완료했는지를 나타낸다. 이 두개를 비교해서 한사이클이 다 끝났는지 그리고 다음 세션은 어떤 것이어야 하는지 파악 할 수 있다.
   * @returns 이제 한사이클 다 돌아서 새로 시작해야 하는 경우에만 repetitionCount를 0값으로 return value에 포함시킨다.
   */
  function determineNextPatternTimerStates({
    howManyCountdown,
    numOfPomo,
  }: {
    howManyCountdown: number;
    numOfPomo: number;
  }): { duration: number; repetitionCount?: number } {
    let retVal = null;
    if (howManyCountdown < numOfPomo * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        retVal = { duration: shortBreakDuration };
      } else {
        retVal = { duration: pomoDuration };
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      retVal = { duration: longBreakDuration };
    } else {
      retVal = { duration: pomoDuration, repetitionCount: 0 };
    }
    return retVal;
  }
  //#endregion

  //#region from CountDownTimer
  let durationRemaining =
    remainingDuration < 0 ? (
      <h2>ending session...</h2>
    ) : (
      <h2>
        <Time seconds={remainingDuration} />
      </h2>
    );
  let durationBeforeStart = (
    <h2>
      {!!(durationInSeconds / 60) === false ? (
        "loading data..."
      ) : (
        <Time seconds={durationInSeconds} />
      )}
    </h2>
  );
  //#endregion

  return (
    <Grid
      column={2}
      alignItems={"center"}
      // rowGap={"15px"}
    >
      <GridItem>
        <FlexBox justifyContent="space-evenly">
          <h1>{repetitionCount % 2 === 0 ? "POMO" : "BREAK"}</h1>
          {timerState.startTime === 0 ? durationBeforeStart : durationRemaining}
        </FlexBox>
      </GridItem>
      <GridItem rowStart={1} rowEnd={5} columnStart={2}>
        <CircularProgressBar
          progress={
            durationInSeconds === 0
              ? 0
              : remainingDuration < 0
              ? 1
              : 1 - remainingDuration / durationInSeconds
          }
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
