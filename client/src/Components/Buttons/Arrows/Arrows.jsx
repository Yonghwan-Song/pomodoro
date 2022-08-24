import { useRef } from "react";
import { ReactComponent as Arrow } from "../../../Icons/down-arrow-svgrepo-com.svg";
import styles from "./Arrows.module.css";
export function ArrowDown({ handleClick }) {
  const intervalId = useRef(null);
  const timerId = useRef(null);

  function handleMouseDown(e) {
    const begin = Date.now();

    handleClick();
    timerId.current = setTimeout(function checkTimePassed() {
      if (Date.now() - begin < 800) {
        timerId.current = setTimeout(checkTimePassed, 100);
      } else {
        intervalId.current = setInterval(handleClick, 150);
      }
    });
  }

  function handleMouseUp(e) {
    console.log(
      `TIMEOUT ID--------------------${timerId.current}--------------------------------------------`
    );
    console.log(
      `INTERVAL ID--------------------${intervalId.current}--------------------------------------------`
    );
    clearTimeout(timerId.current);
    clearInterval(intervalId.current);
  }

  return (
    <Arrow
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`${styles.forBothArrows}`}
    />
  );
}

export function ArrowUp({ handleClick }) {
  const intervalId = useRef(null);
  const timerId = useRef(null);

  function handleMouseDown(e) {
    const begin = Date.now();

    handleClick();
    timerId.current = setTimeout(function checkTimePassed() {
      if (Date.now() - begin < 700) {
        timerId.current = setTimeout(checkTimePassed, 100);
      } else {
        intervalId.current = setInterval(handleClick, 100);
      }
    });
  }

  function handleMouseUp(e) {
    console.log(
      `TIMEOUT ID--------------------${timerId.current}--------------------------------------------`
    );
    console.log(
      `INTERVAL ID--------------------${intervalId.current}--------------------------------------------`
    );
    clearTimeout(timerId.current);
    clearInterval(intervalId.current);
  }

  return (
    <Arrow
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`${styles.upArrow} ${styles.forBothArrows}`}
    />
  );
}
