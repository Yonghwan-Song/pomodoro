import { useRef } from "react";
import Session from "../Session/Session";
import { SessionType } from "../../types/clientStatesType";
import Scale from "../Scale/Scale";
import DetailArea from "./DetailArea";

type TimelineProps = {
  arrOfSessions: SessionType[];
};

export default function Timeline({ arrOfSessions }: TimelineProps) {
  const divRef = useRef<HTMLDivElement>(null);

  //! These are going to be used by UI event handlers defined below.
  let isButtonPressed = false;
  let clientXByMouseDown: number = 0;
  let leftWhenMouseDown: number | null = null;
  const FHDWidth = 1920; // 1920px for 4 hours
  const fullWithOfTimeline = FHDWidth * 6;

  //#region UI event handlers
  function moveTimelineByDragging(clientXByMouseMove: number) {
    let deltaX = clientXByMouseMove - clientXByMouseDown;

    let newLeftVal = leftWhenMouseDown! + deltaX;
    if (newLeftVal > 0) {
      newLeftVal = 0;
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      fullWithOfTimeline
    ) {
      newLeftVal = -(fullWithOfTimeline - document.documentElement.clientWidth);
    }
    divRef.current!.style.left = newLeftVal + "px";
  }
  function handleMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    if (ev.button === 0) {
      isButtonPressed = true;
      clientXByMouseDown = ev.clientX;
      if (divRef.current !== null) {
        leftWhenMouseDown = parseInt(divRef.current.style.left);
      }
      document.body.onmousemove = (ev) => {
        if (isButtonPressed) {
          moveTimelineByDragging(ev.clientX);
        }
      };
      document.body.onmouseup = (ev) => {
        isButtonPressed = false;
        document.body.onmouseup = null;
        document.body.onmousemove = null;
      };
      document.body.onmouseleave = (ev) => {
        isButtonPressed = false;
        document.body.onmouseleave = null;
        document.body.onmouseup = null;
        document.body.onmousemove = null;
      };
    }
  }
  function handleMouseMove(ev: React.MouseEvent<HTMLDivElement>) {
    if (isButtonPressed) {
      moveTimelineByDragging(ev.clientX);
    }
  }
  function handleWheel(ev: React.WheelEvent<HTMLDivElement>) {
    let currentLeft = parseInt(divRef.current!.style.left);
    let newLeftVal = currentLeft - ev.deltaY;
    if (newLeftVal > 0) {
      newLeftVal = 0;
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      fullWithOfTimeline
    ) {
      newLeftVal = -(fullWithOfTimeline - document.documentElement.clientWidth);
    }
    divRef.current!.style.left = newLeftVal + "px";
  }
  function handleContextMenu(ev: React.MouseEvent<HTMLDivElement>) {
    ev.preventDefault();
  }
  //#endregion

  function getCSSLeft(): number {
    const now = new Date();
    const hours = now.getHours();

    let n = 0;
    if (hours >= 0 && hours < 4) {
      n = 0;
    } else if (hours >= 4 && hours < 8) {
      n = 1;
    } else if (hours >= 8 && hours < 12) {
      n = 2;
    } else if (hours >= 12 && hours < 16) {
      n = 3;
    } else if (hours >= 16 && hours < 20) {
      n = 4;
    } else {
      n = 5;
    }

    return -FHDWidth * n;
  }

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        left: getCSSLeft() + "px",
        top: "10vh",
        height: "80px",
        width: `${fullWithOfTimeline}px`,
        backgroundColor: "#c6d1e6",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <Scale />
      <>
        {arrOfSessions.map((aSession, index) => {
          return <Session durations={aSession} key={index} />;
        })}
      </>
      <DetailArea arrOfSessions={arrOfSessions} />
    </div>
  );
}
