import {
  useState,
  useEffect,
  useReducer,
  Dispatch,
  SetStateAction,
} from "react";
import { reducerTimer as reducer, ACTION, TimerAction } from "../reducers";
import {
  PatternTimerStatesType,
  TimerStateType,
} from "../../types/clientStatesType";
import { Button } from "../Buttons/Button";
import { Grid } from "../Layouts/Grid";
import { GridItem } from "../Layouts/GridItem";
import { FlexBox } from "../Layouts/FlexBox";
import { StatesType, postMsgToSW, updateTimersStates } from "../..";
import CountDownTimer from "../CountDownTimer/CountDownTimer";
import PauseTimer from "../PauseTimer/PauseTimer";
import { useAuthContext } from "../../Context/AuthContext";

type TimerProps = {
  statesRelatedToTimer: StatesType | {};
  durationInSeconds: number;
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
  //#endregion

  //#region Initializers
  function initializeTimerState(initialVal: TimerStateType): TimerStateType {
    let timerState = initialVal;
    Object.keys(statesRelatedToTimer).length !== 0 &&
      (timerState = {
        running: (statesRelatedToTimer as StatesType).running,
        startTime: (statesRelatedToTimer as StatesType).startTime,
        pause: (statesRelatedToTimer as StatesType).pause,
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
        statesRelatedToTimer as StatesType;
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
        //running === false && startTime !== 0 -> timer has not paused.
        timePassed = pause.record[pause.record.length - 1].start - startTime;
        timeCountedDown = timePassed - pause.totalLength;
        remainingDuration = Math.floor(
          (durationInSeconds * 1000 - timeCountedDown) / 1000
        );
      }
    }
    return remainingDuration;
  }
  //#endregion

  //#region Tracking Unmount
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
    if (isStarting()) {
      // initial start
      dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
      if (repetitionCount === 0) {
        //new cycle
        user !== null &&
          updateTimersStates(user, {
            startTime: momentTimerIsToggled,
            running: true,
            pause: { totalLength: 0, record: [] },
            repetitionCount: 0,
            duration: durationInSeconds / 60,
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
          updateTimersStates(user, {
            startTime: momentTimerIsToggled,
            running: true,
            pause: { totalLength: 0, record: [] },
          });
      }
    } else if (isResuming()) {
      // resume
      dispatch({ type: ACTION.RESUME, payload: momentTimerIsToggled });
      // to serveer
      user &&
        updateTimersStates(user, {
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
          repetitionCount,
          duration: durationInSeconds / 60,
        });
    } else {
      // pause
      dispatch({ type: ACTION.PAUSE, payload: momentTimerIsToggled });
      // to serveer
      user &&
        updateTimersStates(user, {
          startTime: timerState.startTime,
          running: false,
          pause: {
            ...timerState.pause,
            record: [
              ...timerState.pause!.record,
              { start: momentTimerIsToggled, end: undefined },
            ],
          },
          repetitionCount,
          duration: durationInSeconds / 60,
        });
    }
    function isStarting() {
      return (
        timerState.running === false && timerState.pause!.record.length === 0
      ); // if this is not the first start of the timer, it means resuming the timer.
    }
    function isResuming() {
      return (
        timerState.running === false && timerState.pause!.record.length !== 0
      );
    }
    function isPausing() {
      return timerState.running;
    }
  }

  //TODO: calculate totalLength of the pause and pass it
  async function endTimer(now: number) {
    postMsgToSW("saveStates", {
      stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
    });

    const timeCountedDownInMilliSeconds =
      (durationInSeconds - remainingDuration) * 1000;
    // 이전에 puase되었던 것이 있다면 이 계산을 해줘야함 그러니까 조건을 잡아보자.
    // if (!timerState.running) {

    //#region purpose: to manually caclulate the total length of pause in case of ending timer while a session was paused.
    if (
      timerState.pause.record.length !== 0 &&
      timerState.pause.record[timerState.pause.record.length - 1].end ===
        undefined
    ) {
      let stateRevised = { ...timerState };
      stateRevised.pause.totalLength +=
        now -
        stateRevised.pause.record[stateRevised.pause.record.length - 1].start;
      stateRevised.pause.record[stateRevised.pause.record.length - 1].end = now;
      console.log("stateCloned", stateRevised);
      next({
        howManyCountdown: repetitionCount + 1,
        state: stateRevised,
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
    //#endregion

    dispatch({ type: ACTION.RESET });
    setRepetitionCount(repetitionCount + 1);
    setRemainingDuration(0);

    //중복
    const patternTimerStates = determineNextPatternTimerStates(
      repetitionCount + 1,
      numOfPomo
    );
    patternTimerStates &&
      user &&
      updateTimersStates(user, {
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] },
        duration: patternTimerStates.duration!,
        repetitionCount:
          patternTimerStates.repetitionCount ?? repetitionCount + 1,
      });
    patternTimerStates ?? console.warn("patternTimerStates is null");
  }
  //#endregion

  //#region UseEffects
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
        console.log(`startTime - ${timerState.startTime}`);
      };
    }
  }
  // 이 함수에 의해 종료되는 세션은 next함수에서 concentrationTime === duration인 경우에 해당된다.
  // 왜냐하면 remainingDuration <= 0인 경우에 발동되기 때문이다.
  function checkIfSessionShouldBeFinished() {
    console.log("check if remainingDuratin is less than 0");
    if (remainingDuration <= 0 && timerState.startTime !== 0) {
      setRepetitionCount(repetitionCount + 1);
      postMsgToSW("saveStates", {
        stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
      });
      next({
        howManyCountdown: repetitionCount + 1,
        state: timerState,
        // endTime: Date.now(), //<-- 이게 문제네, remainingDuration이 딱 0인 경우만 endTime값이 정확함.
        //걍 계산할 수 있음.
      });
      // The changes of the states in this component
      dispatch({ type: ACTION.RESET });

      const patternTimerStates = determineNextPatternTimerStates(
        repetitionCount + 1,
        numOfPomo
      );

      patternTimerStates &&
        user &&
        updateTimersStates(user, {
          running: false,
          startTime: 0,
          pause: { totalLength: 0, record: [] },
          duration: patternTimerStates.duration!,
          repetitionCount:
            patternTimerStates.repetitionCount ?? repetitionCount + 1,
        });

      patternTimerStates ?? console.warn("patternTimerStates is null");
    }
  }
  //#endregion

  //#region Etc functions
  //이 함수의 논리는 next함수에서 사용하는 것과 동일하다.
  function determineNextPatternTimerStates(
    howManyCountdown: number,
    numOfPomo: number
  ): Partial<PatternTimerStatesType> | null {
    let retVal = null;
    if (howManyCountdown < numOfPomo * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        retVal = { duration: shortBreakDuration };
      } else {
        retVal = { duration: pomoDuration };
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      retVal = { duration: longBreakDuration };
    } else if (howManyCountdown === numOfPomo * 2) {
      retVal = { duration: pomoDuration, repetitionCount: 0 };
    }
    return retVal;
  }
  //#endregion

  return (
    <Grid
      gap={"15px"}
      justifyItems={"center"}
      marginTop="148px"
      marginBottom="40px"
    >
      <GridItem>
        <CountDownTimer
          repetitionCount={repetitionCount}
          startTime={timerState.startTime}
          durationInSeconds={durationInSeconds}
          remainingDuration={remainingDuration}
        />
      </GridItem>
      <GridItem>
        <PauseTimer
          isOnSession={timerState.running || timerState.startTime !== 0}
          isPaused={timerState.running === false && timerState.startTime !== 0}
          pauseData={timerState.pause}
          startTime={timerState.startTime}
        />
      </GridItem>
      <GridItem>
        <FlexBox>
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
    </Grid>
  );
}
