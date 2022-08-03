import React, { useEffect, useState, useRef } from "react";
import * as CONSTANTS from "../../constants/index";
import styles from "./circularProgressBar.module.css";

const CircularProgressBar = (props) => {
  //do I need to have the div tag wrapped around svg?
  const circleRef = useRef(null);

  useEffect(() => {
    circleRef.current.style = "transition: stroke-dashoffset 850ms linear";
  });

  return (
    <div className={styles.center}>
      <svg
        width={CONSTANTS.SVG.WIDTH}
        height={CONSTANTS.SVG.HEGITH}
        className={styles.svgBackground}
      >
        <circle
          className={styles.circleOne}
          r={CONSTANTS.RADIUS}
          cx={CONSTANTS.MIDDLE_X}
          cy={CONSTANTS.MIDDLE_Y}
          stroke={CONSTANTS.BACKGROUND_COLOR}
          strokeWidth={CONSTANTS.STROKE_WIDTH}
        ></circle>
        <circle
          className={styles.circleTwo}
          r={CONSTANTS.RADIUS}
          cx={CONSTANTS.MIDDLE_X}
          cy={CONSTANTS.MIDDLE_Y}
          stroke={CONSTANTS.FOREGROUND_COLOR}
          strokeWidth={CONSTANTS.STROKE_WIDTH}
          strokeDasharray={CONSTANTS.CIRCUMFERENCE}
          strokeDashoffset={910.6 - 0 * 910.6}
          ref={circleRef}
        ></circle>
      </svg>
    </div>
  );
};

export default CircularProgressBar;
