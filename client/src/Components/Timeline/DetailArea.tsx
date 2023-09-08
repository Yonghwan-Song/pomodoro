import { useEffect, useRef, useState } from "react";
import { DurationType, SessionType } from "../../types/clientStatesType";

type DetailAreaProps = {
  arrOfSessions: SessionType[];
};

export default function DetailArea({ arrOfSessions }: DetailAreaProps) {
  const [flattened, setFlattened] = useState<DurationType[]>([]);
  const [message, setMessage] = useState<string>("");
  const divRef = useRef<HTMLDivElement>(null);
  const nestedDivRef = useRef<HTMLDivElement>(null);
  const msToPx = 8 * (1 / 60) * (1 / 1000); //milliSecond to pixel
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  let isButtonPressed = false;

  useEffect(() => {
    setFlattened(
      arrOfSessions.reduce((accu, curVal) => {
        accu.push(...curVal);
        return accu;
      }, [])
    );
  }, [arrOfSessions]);

  //#region  UI event handlers
  function handleMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    let parentElement = divRef.current?.parentElement;
    let middle: number | null = null;
    let matchingDuration: DurationType | undefined = flattened.find(
      (dur, index) => {
        let startPoint = (dur.startTime - startOfTodayTimestamp) * msToPx;
        let endPoint = (dur.endTime - startOfTodayTimestamp) * msToPx;
        let pointerLocation =
          Math.abs(
            parseInt(window.getComputedStyle(parentElement as Element).left)
          ) + ev.clientX;
        if (pointerLocation >= startPoint && pointerLocation <= endPoint) {
          middle = (startPoint + endPoint) / 2;
          return true;
        } else {
          return false;
        }
      }
    );
    console.log("matchingDuration", matchingDuration);
    console.log("middle", middle);

    if (matchingDuration !== undefined) {
      nestedDivRef.current!.style.left = middle + "px";
      let startTimeString = new Date(
        matchingDuration.startTime
      ).toLocaleTimeString();
      let endTimeString = new Date(
        matchingDuration.endTime
      ).toLocaleTimeString();
      let durationInSeconds = Math.floor(matchingDuration.duration / 1000);
      let minutes = Math.floor(durationInSeconds / 60);
      let seconds = durationInSeconds % 60;
      setMessage(
        `${startTimeString} ~ ${endTimeString}
        ${minutes}m ${seconds}s`
      );
    } else {
      setMessage("");
    }

    if (ev.button === 0) {
      isButtonPressed = true;
      ev.stopPropagation();
      document.body.onmouseup = (ev) => {
        isButtonPressed = false;
        document.body.onmouseup = null;
      };
    }
  }
  function handleMouseMove(ev: React.MouseEvent<HTMLDivElement>) {
    if (isButtonPressed) {
      ev.stopPropagation();
    }
  }
  function handleWheel(ev: React.WheelEvent<HTMLDivElement>) {
    ev.stopPropagation();
  }
  //#endregion

  return (
    <div
      ref={divRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      style={{
        position: "absolute",
        top: "80px",
        backgroundColor: "#9ca0bb",
        height: "50px",
        width: 1920 * 6 + "px",
      }}
    >
      <div
        ref={nestedDivRef}
        style={{
          display: "inline-block",
          position: "absolute",
          height: "50%",
          left: "0px",
          transform: "translateX(-50%)",
          textAlign: "center",
          lineHeight: "50px",
        }}
      >
        {message}
      </div>
    </div>
  );
}
