import React, { useEffect, useRef } from "react";
import * as C from "../../constants/index";
import styles from "./circularProgressBar.module.css";
import { persistStatesToIDB, updateTimersStates } from "../..";
import { useAuthContext } from "../../Context/AuthContext";

type CircularProgressBarProps = {
  progress: number;
  durationInSeconds: number;
  remainingDuration: number;
  setRemainingDuration: React.Dispatch<React.SetStateAction<number>>;
  setDurationInMinutes: React.Dispatch<React.SetStateAction<number>>;
};

const CircularProgressBar = ({
  progress,
  durationInSeconds,
  remainingDuration,
  setRemainingDuration,
  setDurationInMinutes,
}: CircularProgressBarProps) => {
  const { user } = useAuthContext()!;
  const circleRef = useRef<SVGCircleElement>(null);

  async function addFiveMinutes() {
    await persistStatesToIDB({
      duration: durationInSeconds / 60 + 5,
    });
    if (user) {
      await updateTimersStates({
        duration: durationInSeconds / 60 + 5,
      });
    }
    setDurationInMinutes((prev) => prev + 5);
    setRemainingDuration((prev) => prev + 5 * 60);
  }

  async function subtractFiveMinutes() {
    if (remainingDuration - 5 * 60 > 0) {
      await persistStatesToIDB({
        duration: durationInSeconds / 60 - 5,
      });
      if (user) {
        await updateTimersStates({
          duration: durationInSeconds / 60 - 5,
        });
      }
      setDurationInMinutes((prev) => prev - 5);
      setRemainingDuration((prev) => prev - 5 * 60);
    }
  }

  useEffect(() => {
    console.log(`user is ${user}`);
  });

  //? 사실 이거 왜 여기다가 해야하는지 설명 못하겠어.
  useEffect(() => {
    // console.log(
    //   `BAR IS RENDERED --------------------> progress is ${progress}`
    // );

    // https://stackoverflow.com/questions/64243292/ts-2540-cannot-assign-to-style-because-it-is-a-read-only-property
    // circleRef.current!.style = "transition: stroke-dashoffset 0ms linear";
    circleRef.current!.setAttribute(
      "style",
      "transition: stroke-dashoffset 0ms linear"
    );
  });

  return (
    <svg
      width={C.SVG.WIDTH}
      height={C.SVG.HEGITH}
      className={`${styles.svgBackground} ${styles.sizing}`}
    >
      <circle
        className={styles.circleOne}
        r={C.RADIUS}
        cx={C.MIDDLE_X}
        cy={C.MIDDLE_Y}
        stroke={C.BACKGROUND_COLOR}
        strokeWidth={C.STROKE_WIDTH}
      ></circle>
      <circle
        className={styles.circleTwo}
        r={C.RADIUS}
        cx={C.MIDDLE_X}
        cy={C.MIDDLE_Y}
        stroke={C.FOREGROUND_COLOR}
        strokeWidth={C.STROKE_WIDTH}
        strokeDasharray={C.CIRCUMFERENCE}
        // when we click the start/pause button, we need to pass the progress untill then.
        // Then, an offset can be reset to the progress value
        // making it possible to restart the timer from where it has stopped.
        // the timer stopped
        // Offset is applied counter-clockwise.

        strokeDashoffset={910.6 - progress * 910.6}
        ref={circleRef}
      ></circle>

      {/* to split the circle */}
      <line
        x1={C.MIDDLE_X}
        y1={C.STROKE_WIDTH}
        // y1={0}
        x2={C.MIDDLE_X}
        y2={C.SVG.HEGITH - C.STROKE_WIDTH}
        stroke="#E0C2B8"
        // stroke="#F04005"
        strokeWidth="2.2"
      />

      {/* embedded svg for plus sign */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        x={(C.SVG.WIDTH * 3) / 4 - 20}
        y={C.SVG.HEGITH / 2 - 20}
      >
        {/* to make the sign easier to click, I created a transparent circle */}
        <g onClick={addFiveMinutes} cursor={"pointer"}>
          <circle cx={20} cy={20} r={20} fill="transparent" />
          <line
            x1="10"
            y1="20"
            x2="30"
            y2="20"
            stroke="black"
            strokeWidth="2"
          />
          <line
            x1="20"
            y1="30"
            x2="20"
            y2="10"
            stroke="black"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* embedded svg for minus sign */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        x={(C.SVG.WIDTH * 1) / 4 - 20}
        y={C.SVG.HEGITH / 2 - 20}
      >
        <g onClick={subtractFiveMinutes} cursor={"pointer"}>
          <circle cx={20} cy={20} r={20} fill="transparent" />
          <line
            x1="10"
            y1="20"
            x2="30"
            y2="20"
            stroke="black"
            stroke-width="2"
          />
        </g>
      </svg>
    </svg>
  );
};

export default CircularProgressBar;
