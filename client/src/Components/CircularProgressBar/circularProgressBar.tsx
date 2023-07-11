import React, { useEffect, useRef } from "react";
import * as C from "../../constants/index";
import styles from "./circularProgressBar.module.css";

type CircularProgressBarProps = {
  progress: number;
};

const CircularProgressBar = ({ progress }: CircularProgressBarProps) => {
  const circleRef = useRef<SVGCircleElement>(null);

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
    </svg>
  );
};

export default CircularProgressBar;
