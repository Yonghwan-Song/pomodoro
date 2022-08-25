import React, { useEffect, useRef } from "react";
import * as C from "../../constants/index";
import styles from "./circularProgressBar.module.css";

//const CircularProgressBar = ({ progress }) => {
const CircularProgressBar = ({ progress }) => {
  //do I need to have the div tag wrapped around svg?
  const circleRef = useRef(null);

  //? 사실 이거 왜 여기다가 해야하는지 설명 못하겠어.
  useEffect(() => {
    console.log(
      `BAR IS RENDERED -------------------- progress >>> ${progress}`
    );
    circleRef.current.style = "transition: stroke-dashoffset 0ms linear";
  });

  return (
    <div className={styles.center}>
      <svg
        width={C.SVG.WIDTH}
        height={C.SVG.HEGITH}
        className={styles.svgBackground}
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
          //              ={      -  progress *      }
          // when we click the start/pause button, we need to pass the progress untill then.
          // Then, an offset can be reset to the progress value
          // making it possible to restart the timer from where it has stopped.
          // the timer stopped
          // Offset is applied counter-clockwise.

          strokeDashoffset={910.6 - progress * 910.6}
          ref={circleRef}
        ></circle>
      </svg>
    </div>
  );
};

export default CircularProgressBar;
