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
  next: (
    howManyCountdown: number,
    state: TimerStateType,
    endTime: number,
    concentrationTime?: number,
    pauseEnd?: number
  ) => void;

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

export function TimerVVV({
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
  async function toggleTimer(momentTimerIsToggled: number) {
    const isFirstStart =
      !timerState.running && timerState.pause!.record.length === 0; // if this is not the first start of the timer, it means resuming the timer.
    const isPaused =
      !timerState.running && timerState.pause!.record.length !== 0;
    if (isFirstStart) {
      // initial start
      dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
      if (repetitionCount === 0) {
        //! repetitionCount is the information from the PatternTimer component.
        // a cylce of pomo durations has started.
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
      } else {
        dispatch({ type: ACTION.START, payload: momentTimerIsToggled });
        user !== null &&
          updateTimersStates(user, {
            startTime: momentTimerIsToggled,
            running: true,
            pause: { totalLength: 0, record: [] },
          });
      }
    } else if (isPaused) {
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
  }

  async function endTimer(now: number) {
    let timeCountedDown = Math.floor(
      (durationInSeconds - remainingDuration) / 60
    );
    setRepetitionCount(repetitionCount + 1);
    postMsgToSW("saveStates", {
      stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
    });
    let patternTimerStates = determineNextPatternTimerStates(
      repetitionCount + 1,
      numOfPomo
    );
    if (patternTimerStates !== null) {
      user &&
        updateTimersStates(user, {
          running: false,
          startTime: 0,
          pause: { totalLength: 0, record: [] },
          duration: patternTimerStates.duration!,
          repetitionCount:
            patternTimerStates.repetitionCount ?? repetitionCount + 1,
        });
    } else {
      console.warn("patternTimerStates is null");
    }
    next(repetitionCount + 1, timerState, now, timeCountedDown);
    dispatch({ type: ACTION.RESET });
    setRemainingDuration(0);
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
    // remainingDuration !== 0 && state.startTime !== 0 && state.running === true
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
  function checkIfSessionShouldBeFinished() {
    console.log("check if remainingDuratin is less than 0");
    if (remainingDuration <= 0 && timerState.startTime !== 0) {
      setRepetitionCount(repetitionCount + 1);
      postMsgToSW("saveStates", {
        stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
      });
      next(repetitionCount + 1, timerState, Date.now());
      // The changes of the states in this component
      dispatch({ type: ACTION.RESET });

      let patternTimerStates = determineNextPatternTimerStates(
        repetitionCount + 1,
        numOfPomo
      );
      if (patternTimerStates !== null) {
        user &&
          updateTimersStates(user, {
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
            duration: patternTimerStates.duration!,
            repetitionCount:
              patternTimerStates.repetitionCount ?? repetitionCount + 1,
          });
      } else {
        console.warn("patternTimerStates is null");
      }
    }
  }
  //#endregion

  //#region Etc functions
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
