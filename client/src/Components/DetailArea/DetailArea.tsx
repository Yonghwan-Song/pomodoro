import { useCallback, useEffect, useRef, useState } from "react";
import { DurationType, SessionType } from "../../types/clientStatesType";
import {
  mobileRange,
  tabletRange,
  fhdRange,
  qhdRange,
  uhdRange,
} from "../Timeline/mediaQueryLists";
import { MINIMUMS, PIXEL, VH_RATIO } from "../../constants";

type DetailAreaProps = {
  arrOfSessions: SessionType[];
};

export default function DetailArea({ arrOfSessions }: DetailAreaProps) {
  const [flattened, setFlattened] = useState<DurationType[]>([]);
  const [message, setMessage] = useState<string>("");
  const divRef = useRef<HTMLDivElement>(null);
  const nestedDivRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  let isButtonPressed = false;

  const msToPx = useRef<number>(PIXEL.PER_SEC.IN_FHD / 1000);
  const fullWidthOfTimeline = useRef<number>(PIXEL.PER_HR.IN_FHD * 24);

  if (mobileRange.matches) {
    msToPx.current = PIXEL.PER_SEC.IN_MOBILE / 1000;
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_MOBILE * 24;
  } else if (tabletRange.matches) {
    msToPx.current = PIXEL.PER_SEC.IN_TABLET / 1000;
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_TABLET * 24;
  } else if (fhdRange.matches) {
    msToPx.current = PIXEL.PER_SEC.IN_FHD / 1000;
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_FHD * 24;
  } else if (qhdRange.matches) {
    msToPx.current = PIXEL.PER_SEC.IN_QHD / 1000;
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_QHD * 24;
  } else if (uhdRange.matches) {
    msToPx.current = PIXEL.PER_SEC.IN_UHD / 1000;
    fullWidthOfTimeline.current = PIXEL.PER_HR.IN_UHD * 24;
  }

  // Initial width is the same as the fullWidthOfTImeline prop.
  // But as viewport width changes, width is set accordingly.
  //#region Listen to the change events of every range

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   *
   * If the function or object is already in the list of event listeners for this target, the function or object is not added a second time.
   * But, every time this function is updated, handlers are re-defined and they get different references than the handlers added previously.
   *
   * useCallback:  is a React Hook that lets you cache a function definition between re-renders.
   * https://react.dev/reference/react/useCallback
   */

  const handleMobileRangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log("MOBILE IN DETAIL_AREA");
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_MOBILE * 24 + "px");
        msToPx.current = PIXEL.PER_SEC.IN_MOBILE / 1000;
      }
    },
    []
  );
  const handleTabletRangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log("TABLET IN DETAIL_AREA");
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_TABLET * 24 + "px");
        msToPx.current = PIXEL.PER_SEC.IN_TABLET / 1000;
      }
    },
    []
  );
  const handleFHD_RangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log("FHD IN DETAIL_AREA");
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_FHD * 24 + "px");
        msToPx.current = PIXEL.PER_SEC.IN_FHD / 1000;
      }
    },
    []
  );
  const handleQHD_RangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log("QHD IN DETAIL_AREA");
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_QHD * 24 + "px");
        msToPx.current = PIXEL.PER_SEC.IN_QHD / 1000;
      }
    },
    []
  );
  const handleUHD_RangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log("UHD IN DETAIL_AREA");
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_UHD * 24 + "px");
        msToPx.current = PIXEL.PER_SEC.IN_UHD / 1000;
      }
    },
    []
  );

  mobileRange.addEventListener("change", handleMobileRangeAtDetailedArea);
  tabletRange.addEventListener("change", handleTabletRangeAtDetailedArea);
  fhdRange.addEventListener("change", handleFHD_RangeAtDetailedArea);
  qhdRange.addEventListener("change", handleQHD_RangeAtDetailedArea);
  uhdRange.addEventListener("change", handleUHD_RangeAtDetailedArea);
  //#endregion

  //#region side effects
  useEffect(() => {
    return () => {
      mobileRange.removeEventListener(
        "change",
        handleMobileRangeAtDetailedArea
      );
      tabletRange.removeEventListener(
        "change",
        handleTabletRangeAtDetailedArea
      );
      fhdRange.removeEventListener("change", handleFHD_RangeAtDetailedArea);
      qhdRange.removeEventListener("change", handleQHD_RangeAtDetailedArea);
      uhdRange.removeEventListener("change", handleUHD_RangeAtDetailedArea);
    };
  }, []);

  useEffect(() => {
    setFlattened(arrOfSessions.flat());
  }, [arrOfSessions]);
  //#endregion

  //#region  UI event handlers
  function handleMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    let parentElement = divRef.current?.parentElement;
    let middle: number | null = null;
    let matchingDuration: DurationType | undefined = flattened.find(
      (dur, index) => {
        let startPoint =
          (dur.startTime - startOfTodayTimestamp) * msToPx.current;
        let endPoint = (dur.endTime - startOfTodayTimestamp) * msToPx.current;
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
    // console.log("matchingDuration", matchingDuration);
    // console.log("middle", middle);

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
        bottom: `min(-${MINIMUMS.DETAIL_AREA}px,-${VH_RATIO.DETAIL_AREA}vh)`,
        height: `max(${MINIMUMS.DETAIL_AREA}px,${VH_RATIO.DETAIL_AREA}vh)`,
        backgroundColor: "#9ca0bb",
        width: fullWidthOfTimeline.current + "px",
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
          lineHeight: `max(${MINIMUMS.DETAIL_AREA}px,${VH_RATIO.DETAIL_AREA}vh)`,
        }}
      >
        {message}
      </div>
    </div>
  );
}
