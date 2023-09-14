import { useRef, useEffect } from "react";
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
  const FullWithOfTimeline = FHDWidth * 6;

  //#region UI event handlers
  function moveTimelineByDragging(clientXByMouseMove: number) {
    //* 1. calculate leftWhenMouseDown
    let deltaX = clientXByMouseMove - clientXByMouseDown;
    if (parseInt(divRef.current!.style.right) === 0) {
      leftWhenMouseDown = -(
        FullWithOfTimeline - document.documentElement.clientWidth
      );
      deltaX >= 0 && (divRef.current!.style.right = "");
    }

    //* 2. calculate a new left value.
    let newLeftVal = leftWhenMouseDown! + deltaX;

    //* 3. assign a new left or right value.
    if (newLeftVal > 0) {
      divRef.current!.style.left = "0px";
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      FullWithOfTimeline
    ) {
      divRef.current!.style.right = "0px";
      divRef.current!.style.left = "";
    } else {
      divRef.current!.style.left = newLeftVal + "px";
    }
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
    let currentLeft = 0,
      newLeftVal = 0;

    //* 1. calculate currentLeft.
    // right is either "" or "0px"
    if (parseInt(divRef.current!.style.right) === 0) {
      //it means we have fully scrolled the timeline up to 24:00
      currentLeft = -(
        FullWithOfTimeline - document.documentElement.clientWidth
      );
      ev.deltaY < 0 && (divRef.current!.style.right = "");
    } else {
      currentLeft = parseInt(divRef.current!.style.left);
    }

    //* 2
    newLeftVal = currentLeft - ev.deltaY;

    //* 3 assign a new left or right value.
    if (newLeftVal > 0) {
      divRef.current!.style.left = "0px";
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      FullWithOfTimeline
    ) {
      divRef.current!.style.right = "0px";
      divRef.current!.style.left = "";
    } else {
      divRef.current!.style.left = newLeftVal + "px";
    }
  }
  function handleContextMenu(ev: React.MouseEvent<HTMLDivElement>) {
    ev.preventDefault();
  }
  //#endregion

  function getCSSLeftAndRight() {
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

    if (n === 5) {
      return { left: "", right: "0px" };
    } else {
      return { left: -FHDWidth * n + "px", right: "" };
    }
  }

  useEffect(() => {
    window.onresize = (ev) => {
      console.log(window.innerWidth);
      if (
        window.document.documentElement.clientWidth >=
        FullWithOfTimeline - Math.abs(parseInt(divRef.current!.style.left))
      ) {
        divRef.current!.style.right = "0px";
        divRef.current!.style.left = "";
      }
    };

    return () => {
      window.onresize = null;
    };
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        left: getCSSLeftAndRight().left,
        right: getCSSLeftAndRight().right,
        top: "10vh",
        height: "80px",
        width: `${FullWithOfTimeline}px`,
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
