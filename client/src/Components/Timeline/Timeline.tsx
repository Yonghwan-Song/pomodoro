import { useRef, useEffect, useCallback } from "react";
import Session from "../Session/Session";
import { SessionType } from "../../types/clientStatesType";
import Scale from "../Scale/Scale";
import DetailArea from "../DetailArea/DetailArea";
import { PIXEL } from "../../constants";
import {
  mobileRange,
  tabletRange,
  fhdRange,
  qhdRange,
  uhdRange,
  calculateLeftAndRight,
} from "./mediaQueryLists";

type TimelineProps = {
  arrOfSessions: SessionType[];
};

export default function Timeline({ arrOfSessions }: TimelineProps) {
  const divRef = useRef<HTMLDivElement>(null);

  //! These are going to be used by UI event handlers defined below.
  let isButtonPressed = false;
  let clientXByMouseDown: number = 0;
  let leftWhenMouseDown: number | null = null;

  //#region About Responsiveness
  const fullWidthOfTimeline = useRef<number>(1920 * 6); // pixel per hour * 24. But I will just set it to FHD media's timeline width.
  let initialLeftAndRight = {
    left: "0px",
    right: "",
  };
  const currentRule = useRef<number>(8 / 60); // <=> PIXEL.PER_SEC.IN_FHD

  //#region Listen to the change events of every range

  // Reason for `&& divRef.current` in the if condition:
  // Since these handlers are also called in other paths like "/statistics",
  // the divRef.current check ensures they are only executed when the path is "/timer".
  const handleMobileRange = useCallback((ev: MediaQueryListEvent) => {
    if (ev.matches && divRef.current) {
      console.log("------------mobile------------");

      fullWidthOfTimeline.current = PIXEL.PER_HR.IN_MOBILE * 24;
      console.log("fullWidthOfTimeline", fullWidthOfTimeline.current);

      calculateNewLeft({
        prevRule: currentRule.current,
        newRule: PIXEL.PER_SEC.IN_MOBILE,
      });
      currentRule.current = PIXEL.PER_SEC.IN_MOBILE;

      divRef.current.style.width = fullWidthOfTimeline.current + "px";
      checkAndAdjustTimelinePosition();
    }
  }, []);
  const handleTabletRange = useCallback((ev: MediaQueryListEvent) => {
    if (ev.matches && divRef.current) {
      console.log("------------tablet------------");
      fullWidthOfTimeline.current = PIXEL.PER_HR.IN_TABLET * 24;
      console.log("fullWidthOfTimeline", fullWidthOfTimeline.current);

      calculateNewLeft({
        prevRule: currentRule.current,
        newRule: PIXEL.PER_SEC.IN_TABLET,
      });
      currentRule.current = PIXEL.PER_SEC.IN_TABLET;

      divRef.current.style.width = fullWidthOfTimeline.current + "px";
      checkAndAdjustTimelinePosition();
    }
  }, []);
  const handleFHD_Range = useCallback((ev: MediaQueryListEvent) => {
    if (ev.matches && divRef.current) {
      console.log("------------fhd------------");
      fullWidthOfTimeline.current = PIXEL.PER_HR.IN_FHD * 24;
      console.log("fullWidthOfTimeline", fullWidthOfTimeline.current);

      calculateNewLeft({
        prevRule: currentRule.current,
        newRule: PIXEL.PER_SEC.IN_FHD,
      });
      currentRule.current = PIXEL.PER_SEC.IN_FHD;

      divRef.current.style.width = fullWidthOfTimeline.current + "px";
      checkAndAdjustTimelinePosition();
    }
  }, []);
  const handleQHD_Range = useCallback((ev: MediaQueryListEvent) => {
    if (ev.matches && divRef.current) {
      console.log("------------qhd------------");
      fullWidthOfTimeline.current = PIXEL.PER_HR.IN_QHD * 24;
      console.log("fullWidthOfTimeline", fullWidthOfTimeline.current);

      calculateNewLeft({
        prevRule: currentRule.current,
        newRule: PIXEL.PER_SEC.IN_QHD,
      });
      currentRule.current = PIXEL.PER_SEC.IN_QHD;

      divRef.current.style.width = fullWidthOfTimeline.current + "px";
      checkAndAdjustTimelinePosition();
    }
  }, []);
  const handleUHD_Range = useCallback((ev: MediaQueryListEvent) => {
    if (ev.matches && divRef.current) {
      console.log("------------uhd------------");
      fullWidthOfTimeline.current = PIXEL.PER_HR.IN_UHD * 24;
      console.log("fullWidthOfTimeline", fullWidthOfTimeline.current);

      calculateNewLeft({
        prevRule: currentRule.current,
        newRule: PIXEL.PER_SEC.IN_UHD,
      });
      currentRule.current = PIXEL.PER_SEC.IN_UHD;

      divRef.current.style.width = fullWidthOfTimeline.current + "px";
      checkAndAdjustTimelinePosition();
    }
  }, []);

  mobileRange.addEventListener("change", handleMobileRange);
  tabletRange.addEventListener("change", handleTabletRange);
  fhdRange.addEventListener("change", handleFHD_Range);
  qhdRange.addEventListener("change", handleQHD_Range);
  uhdRange.addEventListener("change", handleUHD_Range);
  //#endregion

  //#region To get initial position of timeline
  if (mobileRange.matches) {
    initialLeftAndRight = calculateLeftAndRight({
      slotHour: 3,
      pixelPerHour: PIXEL.PER_HR.IN_MOBILE,
    });
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_MOBILE * 24;
    currentRule.current = PIXEL.PER_SEC.IN_MOBILE;
  } else if (tabletRange.matches) {
    initialLeftAndRight = calculateLeftAndRight({
      slotHour: 3,
      pixelPerHour: PIXEL.PER_HR.IN_TABLET,
    });
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_TABLET * 24;
    currentRule.current = PIXEL.PER_SEC.IN_TABLET;
  } else if (fhdRange.matches) {
    initialLeftAndRight = calculateLeftAndRight({
      slotHour: 4,
      pixelPerHour: PIXEL.PER_HR.IN_FHD,
    });
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_FHD * 24;
    currentRule.current = PIXEL.PER_SEC.IN_FHD;
  } else if (qhdRange.matches) {
    initialLeftAndRight = calculateLeftAndRight({
      slotHour: 4,
      pixelPerHour: PIXEL.PER_HR.IN_QHD,
    });
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_QHD * 24;
    currentRule.current = PIXEL.PER_SEC.IN_QHD;
  } else if (uhdRange.matches) {
    initialLeftAndRight = calculateLeftAndRight({
      slotHour: 4,
      pixelPerHour: PIXEL.PER_HR.IN_UHD,
    });
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_UHD * 24;
    currentRule.current = PIXEL.PER_SEC.IN_UHD;
  }
  //#endregion

  //#endregion

  //#region UI event handlers
  /**
   * How it works:
   *   1. drag timeline to the right <=> see the part of timeline hided beyond the left edge of viewport
   *      <=> clientX by moving mouse pointer becomes bigger than the clientX when pressing down mouse button.
   *      <=> deltaX > 0 (deltaX is defined in this function)
   *   2. drag timeline to the left - the opposite of the explanation above.
   *
   * What it does:
   *   1. calculate leftWhenMouseDown
   *   2. calculate a new left value.
   *   2. assign a new left or right value.
   *
   * @param clientXByMouseMove - https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX
   *
   * leftWhenMouseDown, fullWidthOfTimeline are defined in this function component scope.
   */
  function moveTimelineByDragging(clientXByMouseMove: number) {
    // 1.
    let deltaX = clientXByMouseMove - clientXByMouseDown;
    if (isTimelineAtTheEnd()) {
      leftWhenMouseDown = -(
        fullWidthOfTimeline.current - document.documentElement.clientWidth
      );
      isTimelineDraggedToTheRight() && (divRef.current!.style.right = "");
    }

    // 2.
    let newLeftVal = leftWhenMouseDown! + deltaX; //non-null assertion왜 했지?... 근거라도 적어두지 ㅠ

    // 3.
    if (isTimelineBeingDraggedBeyondLeftEdge()) {
      // To prevent timeline from being dragged too much
      // to the extent that an empty span appears between the left edge of viewport and the start of timeline.
      //                 left edge     right edge
      // |<------| (o),    |   <---------| (x).
      divRef.current!.style.left = "0px";
    } else if (
      //   <-------|: -newLeftVal,    |----------------|: clientWidth,  <--------------------> : timeline
      //                          left edge       right edge
      //
      //      <------------|----------------------->|    <=>  -newLeftVal + document.documentElement.clientWidth === fullWidthOfTimeline
      //
      //   <---------------|-------------------->   |    <=>  -newLeftVal + document.documentElement.clientWidth > fullWidthOfTimeline
      // this should not happen becuase of    (this span)
      -newLeftVal + document.documentElement.clientWidth >
      fullWidthOfTimeline.current
    ) {
      divRef.current!.style.right = "0px";
      divRef.current!.style.left = "";
    } else {
      divRef.current!.style.left = newLeftVal + "px";
    }

    function isTimelineBeingDraggedBeyondLeftEdge() {
      return newLeftVal > 0;
    }
    function isTimelineAtTheEnd() {
      return parseInt(divRef.current!.style.right) === 0;
    }
    function isTimelineDraggedToTheRight() {
      return deltaX > 0;
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
    // console.log("fullWidthOfTimeline", fullWidthOfTimeline);
    let currentLeft = 0,
      newLeftVal = 0;

    //* 1. calculate currentLeft.
    // right is either "" or "0px"
    if (parseInt(divRef.current!.style.right) === 0) {
      //it means we have fully scrolled the timeline up to 24:00
      currentLeft = -(
        fullWidthOfTimeline.current - document.documentElement.clientWidth
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
      fullWidthOfTimeline.current
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

  function checkAndAdjustTimelinePosition() {
    if (
      divRef.current &&
      window.document.documentElement.clientWidth >=
        fullWidthOfTimeline.current -
          Math.abs(parseInt(divRef.current!.style.left))
    ) {
      divRef.current.style.right = "0px";
      divRef.current.style.left = "";
    }
  }

  function calculateNewLeft({
    prevRule,
    newRule,
  }: {
    prevRule: number;
    newRule: number;
  }) {
    // console.log("prevRule", prevRule);
    // console.log("newRule", newRule);
    if (divRef.current && divRef.current.style.left.length !== 0) {
      let newLeft = (parseInt(divRef.current.style.left) / prevRule) * newRule;
      // console.log("newLeft", newLeft);
      divRef.current.style.left =
        // (parseInt(divRef.current.style.left) / prevRule) * newRule + "px";
        newLeft + "px";
    }
  }

  //#region side effects
  useEffect(() => {
    window.onresize = (ev) => {
      // console.log("fullWidthOfTimeline", fullWidthOfTimeline.current);
      checkAndAdjustTimelinePosition();
    };

    return () => {
      window.onresize = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      mobileRange.removeEventListener("change", handleMobileRange);
      tabletRange.removeEventListener("change", handleTabletRange);
      fhdRange.removeEventListener("change", handleFHD_Range);
      qhdRange.removeEventListener("change", handleQHD_Range);
      uhdRange.removeEventListener("change", handleUHD_Range);
    };
  }, []);
  //#endregion

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        top: "10vh",

        //TODO 1.should be the same as the height of OneHour. 2.should be responsive to the QHD and UHD.
        height: "80px",
        backgroundColor: "#c6d1e6",

        // properties below should change dynamically.
        left: initialLeftAndRight.left,
        right: initialLeftAndRight.right,
        width: `${fullWidthOfTimeline.current}px`,
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
