import {
  useState,
  useEffect,
  useReducer,
  Dispatch,
  SetStateAction,
} from "react";
import { reducerTimer as reducer, ACTION, TimerAction } from "../reducers";
import { TimerState } from "../../types/clientStatesType";
import { Button } from "../Buttons/Button";
import { Grid } from "../Layouts/Grid";
import { GridItem } from "../Layouts/GridItem";
import { FlexBox } from "../Layouts/FlexBox";
import { StatesType, postMsgToSW } from "../..";
import CountDownTimer from "../CountDownTimer/CountDownTimer";
import PauseTimer from "../PauseTimer/PauseTimer";

type TimerProps = {
  statesRelatedToTimer: StatesType | {};
  durationInSeconds: number;
  next: (
    howManyCountdown: number,
    state: TimerState,
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
};

export function Timer({
  statesRelatedToTimer,
  durationInSeconds,
  next,
  repetitionCount,
  setRepetitionCount,
  isOnCycle,
  setIsOnCycle,
}: TimerProps) {
  //! idea: When a cycle is on meaning one cylce is not done yet, initial state is set from the prop
  //! otherwise: give

  //#region for a lazy initialization
  //1. I === Omit<TimerState, "running" | "startTime">
  //2. ReducerState<R> === TimerState :::...
  //3. R === tpyeof reducer
  //4. type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  const [state, dispatch] = useReducer<
    (state: TimerState, action: TimerAction) => TimerState,
    TimerState
  >(
    reducer,
    {
      running: false,
      startTime: 0,
      pause: { totalLength: 0, record: [] },
    },
    init
  );
  const [remainingDuration, setRemainingDuration] = useState(() => {
    let retVal = 0,
      timePassed = 0,
      timeCountedDown = 0;

    if (Object.keys(statesRelatedToTimer).length !== 0) {
      let { duration, pause, running, startTime } =
        statesRelatedToTimer as StatesType;

      let durationInSeconds = duration * 60;

      if (running) {
        timePassed = Date.now() - startTime;
        timeCountedDown = timePassed - pause.totalLength;
        retVal = Math.floor(
          (durationInSeconds * 1000 - timeCountedDown) / 1000
        );
      } else if (startTime === 0) {
        //running === false && startTime === 0 -> timer has not yet started.
        retVal = durationInSeconds;
      } else {
        //running === false && startTime !== 0 -> timer has not paused.
        timePassed = pause.record[pause.record.length - 1].start - startTime;
        timeCountedDown = timePassed - pause.totalLength;
        retVal = Math.floor(
          (durationInSeconds * 1000 - timeCountedDown) / 1000
        );
      }
    }

    console.log(`remainingDuration initalizer - ${retVal}`);
    return retVal;
  });
  //#endregion

  //#region 작동하는 것
  function init(initialState: TimerState): TimerState {
    let retVal = initialState;
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      retVal = {
        running: (statesRelatedToTimer as StatesType).running,
        startTime: (statesRelatedToTimer as StatesType).startTime,
        pause: (statesRelatedToTimer as StatesType).pause,
      };
    }
    return retVal;
  }
  //#endregion

  function toggleTimer() {
    if (isFirstStart()) {
      // initial start
      dispatch({ type: ACTION.START, payload: Date.now() });
      if (repetitionCount === 0) {
        //! repetitionCount is the information from the PatternTimer component.
        // a cylce of pomo durations has started.
        postMsgToSW("saveStates", {
          component: "PatternTimer",
          stateArr: [
            { name: "repetitionCount", value: 0 },
            { name: "duration", value: durationInSeconds / 60 },
          ],
        });
        setIsOnCycle(true);
      }
    } else if (isPaused()) {
      // resume
      dispatch({ type: ACTION.RESUME, payload: Date.now() });
    } else {
      // pause
      dispatch({ type: ACTION.PAUSE, payload: Date.now() });
    }
    // if this is not the first start of the timer, it means resuming the timer.
    function isFirstStart() {
      return !state.running && state.pause!.record.length === 0;
    }
    function isPaused() {
      return !state.running && state.pause!.record.length !== 0;
    }
  }

  function endTimer(now: number) {
    let timeCountedDown = Math.floor(
      (durationInSeconds - remainingDuration) / 60
    );
    setRepetitionCount(repetitionCount + 1);
    postMsgToSW("saveStates", {
      component: "PatternTimer",
      stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
    });
    if (state.running) {
      next(repetitionCount + 1, state, now, timeCountedDown);
    } else {
      // end a paused timer.
      next(repetitionCount + 1, state, now, timeCountedDown);
    }
    dispatch({ type: ACTION.RESET });
    setRemainingDuration(0);
  }

  //#region side effects
  useEffect(() => {
    // To log the pause object:
    // remainingDuration !== 0 && state.startTime !== 0 && state.running === false
    if (
      remainingDuration !== 0 &&
      state.startTime !== 0 &&
      state.running === false
    ) {
      console.log(state.pause);
    }
  }, [remainingDuration, durationInSeconds, state.running]);
  useEffect(() => {
    // After reset:
    // remainingDuration === 0 && state.startTime === 0 && state.running === false
    if (remainingDuration === 0 && state.startTime === 0) {
      // setting remaining duration to the one newly passed in from the PatternTimer.
      setRemainingDuration(durationInSeconds);
    }
  }, [remainingDuration, durationInSeconds, state.running]);
  useEffect(() => {
    // As soon as this component is mounted:
    // remainingDuration !== 0 && state.startTime === 0 && state.running === false
    if (remainingDuration !== 0 && state.startTime === 0) {
      setRemainingDuration(durationInSeconds);
    }
  }, [remainingDuration, durationInSeconds, state.running]);
  useEffect(() => {
    // To count down timer:
    // remainingDuration !== 0 && state.startTime !== 0 && state.running === true
    if (state.running && remainingDuration > 0) {
      const id = setInterval(() => {
        setRemainingDuration(
          Math.floor(
            //seconds to miliseconds
            (durationInSeconds * 1000 -
              // (Date.now() - state.startTime - state.pause!.totalLength)) / // -> is paired with reducers.ts line 4
              (Date.now() - state.startTime - state.pause.totalLength)) /
              1000
          )
        );
      }, 500);

      return () => {
        clearInterval(id);
        console.log(`startTime - ${state.startTime}`);
      };
    }
  }, [remainingDuration, durationInSeconds, state.running]);
  useEffect(() => {
    // When the countdown of the timer has ended.
    if (remainingDuration <= 0 && state.startTime !== 0) {
      // console.log(`Focus session is complete from ${Timer.name}`);
      // The changes of the states in the parent component
      setRepetitionCount(repetitionCount + 1);
      postMsgToSW("saveStates", {
        component: "PatternTimer",
        stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
      });
      next(repetitionCount + 1, state, Date.now()); // possible error.
      // The changes of the states in this component
      dispatch({ type: ACTION.RESET });
    }
  }, [remainingDuration, durationInSeconds, state.running]);
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
          startTime={state.startTime}
          durationInSeconds={durationInSeconds}
          remainingDuration={remainingDuration}
        />
      </GridItem>
      <GridItem>
        <PauseTimer
          isOnSession={state.running || state.startTime !== 0}
          isPaused={state.running === false && state.startTime !== 0}
          pauseData={state.pause}
          startTime={state.startTime}
        />
      </GridItem>
      <GridItem>
        <FlexBox>
          <Button type={"submit"} color={"primary"} handleClick={toggleTimer}>
            {state.running === true
              ? "Pause"
              : state.startTime === 0
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
