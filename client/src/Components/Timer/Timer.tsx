import {
  useState,
  useEffect,
  useReducer,
  Dispatch,
  SetStateAction,
} from "react";
import {
  reducerTimer as reducer,
  ACTION,
  TimerState,
  TimerAction,
} from "../reducers";
import CircularProgressBar from "../CircularProgressBar/circularProgressBar";
import { Button } from "../Buttons/Button";
import { Grid } from "../Layouts/Grid";
import { GridItem } from "../Layouts/GridItem";
import { FlexBox } from "../Layouts/FlexBox";
import { StatesType, postMsgToSW } from "../..";

type TimerProps = {
  statesRelatedToTimer: StatesType | {};
  duration: number;
  next: (
    howManyCountdown: number,
    startTime: number,
    concentrationTime?: number
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
  duration,
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

  let seconds = 0;

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
            { name: "duration", value: duration / 60 },
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

  function endTimer() {
    let timePassed = Math.floor((duration - remainingDuration) / 60);
    setRepetitionCount(repetitionCount + 1);
    postMsgToSW("saveStates", {
      component: "PatternTimer",
      stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
    });
    next(repetitionCount + 1, state.startTime, timePassed);
    dispatch({ type: ACTION.RESET });
    setRemainingDuration(0);
  }

  // UPGRADE: if I want my data about my pomo session I was doing to be persistent between reloading page,
  //         I think I need to store the pomo session data to the indexed db I guess.
  //* This effect function is called every update because of the remainingDuration in the dep array.
  useEffect(() => {
    // console.log(`repetitionCount - ${repetitionCount}`);
    // console.log(`duration- ${duration}`);
    // console.log(`remainingDuration - ${remainingDuration}`);
    // console.log(`isOnCycle - ${isOnCycle}`);

    //TODO: The name of this variable is a little bit weird since ACTION.RESET deos not reset the remainingDuration.
    const isAfterReset = remainingDuration === 0 && state.startTime === 0;
    const isEnd = remainingDuration <= 0 && state.startTime !== 0;

    //* 0. remainingDuration !== 0 && state.startTime !== 0 && state.running === false
    //* to log the pause object
    if (
      remainingDuration !== 0 &&
      state.startTime !== 0 &&
      state.running === false
    ) {
      // console.log(state.pause);
    }

    //* 1. remainingDuration === 0 && state.startTime === 0 && state.running === false
    if (isAfterReset) {
      // running === false
      setRemainingDuration(duration); // setting remaining duration to the one newly passed in from parent component.
    }

    //* 2. remainingDuration !== 0 && state.startTime === 0 && state.running === false
    //* This is right after this component is mounted.
    if (remainingDuration !== 0 && state.startTime === 0) {
      // console.log(`isRunning - ${state.running}`); // running === false
      setRemainingDuration(duration);
    }
    // console.log(`remainingDuration - ${remainingDuration}`);

    //* 3. remainingDuration !== 0 && state.startTime !== 0 && state.running === true
    if (state.running && remainingDuration > 0) {
      //? 당연히 startTime !== 0 일 것 같아서 확인 안해봄.
      // running
      const id = setInterval(() => {
        setRemainingDuration(
          Math.floor(
            //seconds to miliseconds
            (duration * 1000 -
              // (Date.now() - state.startTime - state.pause!.totalLength)) / // -> is paired with reducers.ts line 4
              (Date.now() - state.startTime - state.pause.totalLength)) /
              1000
          )
        );
      }, 500);

      return () => {
        clearInterval(id);
        // console.log(`isOnCycle - ${isOnCycle}`);
        // console.log(`duration - ${duration}`);
        console.log(`startTime - ${state.startTime}`);
      };
      // state.startTime is not zero yet.

      //* 4. remainingDuration === 0 && state.startTime !== 0 && state.running === true
    } else if (isEnd) {
      // console.log(`Focus session is complete from ${Timer.name}`);
      // The changes of the states in the parent component
      setRepetitionCount(repetitionCount + 1);
      postMsgToSW("saveStates", {
        component: "PatternTimer",
        stateArr: [{ name: "repetitionCount", value: repetitionCount + 1 }],
      });
      next(repetitionCount + 1, state.startTime);
      // The changes of the states in this component
      dispatch({ type: ACTION.RESET });
    }
  }, [remainingDuration, duration, state.running]);

  let durationRemaining =
    remainingDuration < 0 ? (
      <h2>0:00</h2>
    ) : (
      <h2>
        {Math.trunc(remainingDuration / 60)}:
        {(seconds = remainingDuration % 60) < 10 ? "0" + seconds : seconds}
      </h2>
    );

  let durationBeforeStart = (
    <h2>
      {!!(duration / 60) === false ? "Loading data" : duration / 60 + ":00"}
    </h2>
  );

  return (
    <Grid gap={"13px"} justifyItems={"center"}>
      <GridItem>
        <div
          style={{
            textAlign: "center",
            marginTop: "10px",
            marginBottom: "10px",
          }}
        >
          <h1>{repetitionCount % 2 === 0 ? "POMO" : "BREAK"}</h1>
          {state.startTime === 0 ? durationBeforeStart : durationRemaining}
        </div>
      </GridItem>

      <GridItem>
        <CircularProgressBar
          progress={
            duration === 0
              ? 0
              : remainingDuration < 0
              ? 1
              : 1 - remainingDuration / duration
          }
        />
      </GridItem>

      <GridItem>
        <FlexBox>
          <Button type={"submit"} color={"primary"} handleClick={toggleTimer}>
            {state.running && remainingDuration !== 0 ? "Pause" : "Start"}
          </Button>
          <Button handleClick={endTimer}>End</Button>
        </FlexBox>
      </GridItem>
    </Grid>
  );
}
