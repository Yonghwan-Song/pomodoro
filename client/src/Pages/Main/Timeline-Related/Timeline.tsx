import { useRef, useEffect, useCallback } from "react";
import Session from "./Session";
import { SessionType } from "../../../types/clientStatesType";
import Scale from "../../../ReusableComponents/Scale/Scale";
import DetailArea from "./DetailArea";
import { MINIMUMS, PIXEL, VH_RATIO } from "../../../constants";

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

  // ref로 변경된 변수들
  const isButtonPressed = useRef<boolean>(false);
  const clientXByMouseDown = useRef<number>(0);
  const leftWhenMouseDown = useRef<number | null>(null);
  const touchStartX = useRef<number>(0);
  const isTouching = useRef<boolean>(false);

  //#region About Responsiveness
  const fullWidthOfTimeline = useRef<number>(1920 * 6);
  let initialLeftAndRight = {
    left: "0px",
    right: "",
  };
  const currentRule = useRef<number>(8 / 60);

  //#region Listen to the change events of every range
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
   * 타임라인을 드래그하여 이동시키는 핵심 함수
   * 원리: 시작위치 + 움직인거리 = 새로운위치
   * @param clientX - 현재 마우스/터치의 X 좌표
   */
  function moveTimelineByDragging(clientX: number) {
    // 1. 얼마나 움직였는지 계산 (터치와 마우스 구분)
    let deltaX =
      clientX -
      (isTouching.current ? touchStartX.current : clientXByMouseDown.current);

    // 2. 타임라인이 끝에 붙어있는 경우 (right: 0px) 처리
    if (isTimelineAtTheEnd()) {
      // 끝에서 시작하는 경우의 left값 계산 (음수)
      leftWhenMouseDown.current = -(
        fullWidthOfTimeline.current - document.documentElement.clientWidth
      );
      // 오른쪽으로 드래그하면 right 속성 제거
      (isTouching.current ? deltaX > 0 : isTimelineDraggedToTheRight()) &&
        (divRef.current!.style.right = "");
    }

    // 3. 새로운 left 위치 = 시작위치 + 움직인거리
    let newLeftVal = leftWhenMouseDown.current! + deltaX;

    // 4. 경계 처리
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
      // 너무 왼쪽으로 드래그 → 끝점 고정
      divRef.current!.style.right = "0px";
      divRef.current!.style.left = "";
    } else {
      // 정상 범위 → left 값 업데이트
      divRef.current!.style.left = newLeftVal + "px";
    }

    // 헬퍼 함수들
    function isTimelineBeingDraggedBeyondLeftEdge() {
      return newLeftVal > 0; // left가 양수 = 시작점을 넘어섬
    }
    function isTimelineAtTheEnd() {
      return parseInt(divRef.current!.style.right) === 0; // right: 0px인 상태
    }
    function isTimelineDraggedToTheRight() {
      return deltaX > 0; // 마우스가 오른쪽으로 움직임
    }
  }

  /**
   * 마우스 드래그 시작 처리
   * 전역 이벤트 리스너를 등록해서 요소 밖에서도 드래그 추적 가능
   */
  function handleMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    if (ev.button === 0) {
      // 왼쪽 마우스 버튼만
      // 1. 드래그 상태 저장
      isButtonPressed.current = true;
      clientXByMouseDown.current = ev.clientX; // 시작 X좌표
      if (divRef.current !== null) {
        leftWhenMouseDown.current = parseInt(divRef.current.style.left); // 시작 left값
      }

      // 2. 전역 이벤트 리스너 등록 (요소 밖에서도 드래그 추적)
      document.body.onmousemove = (ev) => {
        if (isButtonPressed.current) {
          moveTimelineByDragging(ev.clientX);
        }
      };
      document.body.onmouseup = (ev) => {
        // 3. 드래그 종료 처리
        isButtonPressed.current = false;
        document.body.onmouseup = null;
        document.body.onmousemove = null;
      };
      document.body.onmouseleave = (ev) => {
        // 4. 마우스가 브라우저 밖으로 나가면 드래그 종료
        isButtonPressed.current = false;
        document.body.onmouseleave = null;
        document.body.onmouseup = null;
        document.body.onmousemove = null;
      };
    }
  }

  /**
   * 마우스 이동 처리 (요소 내에서만)
   * 실제로는 mouseDown에서 등록한 전역 리스너가 주로 사용됨
   */
  function handleMouseMove(ev: React.MouseEvent<HTMLDivElement>) {
    if (isButtonPressed.current) {
      moveTimelineByDragging(ev.clientX);
    }
  }

  /**
   * 터치 시작 처리
   * 마우스와 달리 요소에 직접 등록된 이벤트만 사용
   */
  function handleTouchStart(ev: React.TouchEvent<HTMLDivElement>) {
    if (ev.touches.length === 1) {
      // 한 손가락 터치만 처리
      isTouching.current = true;
      touchStartX.current = ev.touches[0].clientX; // 터치 시작 X좌표
      if (divRef.current !== null) {
        leftWhenMouseDown.current = parseInt(divRef.current.style.left); // 시작 left값
      }
    }
  }

  /**
   * 터치 이동 처리
   * preventDefault()로 페이지 스크롤 방지 중요!
   */
  function handleTouchMove(ev: React.TouchEvent<HTMLDivElement>) {
    if (isTouching.current && ev.touches.length === 1) {
      ev.preventDefault(); // 페이지 스크롤 방지
      moveTimelineByDragging(ev.touches[0].clientX);
    }
  }

  /**
   * 터치 종료 처리
   * 터치 상태를 false로 변경 (마우스와 달리 반드시 필요)
   */
  function handleTouchEnd(ev: React.TouchEvent<HTMLDivElement>) {
    isTouching.current = false;
  }

  /**
   * 마우스 휠로 타임라인 스크롤
   * deltaY 값으로 left 위치를 조정 (위로 스크롤 = 음수, 아래로 스크롤 = 양수)
   */
  function handleWheel(ev: React.WheelEvent<HTMLDivElement>) {
    let currentLeft = 0,
      newLeftVal = 0;

    // 1. 현재 left 값 계산
    if (parseInt(divRef.current!.style.right) === 0) {
      // right: 0px인 경우 (끝에 붙어있는 상태)
      currentLeft = -(
        fullWidthOfTimeline.current - document.documentElement.clientWidth
      );
      // 위로 스크롤하면 right 속성 제거
      ev.deltaY < 0 && (divRef.current!.style.right = "");
    } else {
      // 일반적인 경우
      currentLeft = parseInt(divRef.current!.style.left);
    }

    // 2. 새로운 left 값 = 현재값 - 휠 이동량
    newLeftVal = currentLeft - ev.deltaY;

    // 3. 경계 처리 (moveTimelineByDragging과 동일한 로직)
    if (newLeftVal > 0) {
      // 너무 오른쪽 → 시작점 고정
      divRef.current!.style.left = "0px";
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      fullWidthOfTimeline.current
    ) {
      // 너무 왼쪽 → 끝점 고정
      divRef.current!.style.right = "0px";
      divRef.current!.style.left = "";
    } else {
      // 정상 범위 → left 값 업데이트
      divRef.current!.style.left = newLeftVal + "px";
    }
  }

  /**
   * 우클릭 메뉴 방지
   */
  function handleContextMenu(ev: React.MouseEvent<HTMLDivElement>) {
    ev.preventDefault();
  }
  //#endregion

  /**
   * 화면 크기 변경시 타임라인 위치 조정
   * 뷰포트가 타임라인보다 클 때 끝점에 맞춤
   */
  function checkAndAdjustTimelinePosition() {
    if (
      divRef.current &&
      window.document.documentElement.clientWidth >=
        fullWidthOfTimeline.current -
          Math.abs(parseInt(divRef.current!.style.left))
    ) {
      // 뷰포트가 남은 타임라인보다 크면 끝점에 고정
      divRef.current.style.right = "0px";
      divRef.current.style.left = "";
    }
  }

  /**
   * 반응형 전환시 비례 계산으로 left 값 조정
   * 예: FHD→모바일 전환시 픽셀 비율에 맞춰 위치 유지
   */
  function calculateNewLeft({
    prevRule,
    newRule,
  }: {
    prevRule: number;
    newRule: number;
  }) {
    if (divRef.current && divRef.current.style.left.length !== 0) {
      // 이전 규칙 기준 위치를 새 규칙 기준으로 변환
      let newLeft = (parseInt(divRef.current.style.left) / prevRule) * newRule;
      divRef.current.style.left = newLeft + "px";
    }
  }

  // 타임라인에서 휠 스크롤시 페이지 스크롤 방지
  divRef.current?.addEventListener("wheel", preventScroll, { passive: false });
  function preventScroll(ev: any) {
    ev.preventDefault();
  }

  //#region side effects
  useEffect(() => {
    let divNode = divRef.current;
    return () => {
      divNode && divNode.removeEventListener("wheel", preventScroll);
    };
  }, []);

  useEffect(() => {
    window.onresize = (ev) => {
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

  //! Things good to know to understand positioning of this component and its children.

  //1. Timeline is a `positioned` element. Its containing block is the initial containing block.
  //   https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Positioning#positioning_contexts
  //
  //*  2. StyledNumberForTime and StyledOneHour are positioned absolutely to their containing block Timeline.
  //    3. A `StyledTenMinutes` component is positioned absolutely to its containing block StyledOneHour.
  //*  4. SessionStyled is positioned absolutely to its containing block Timeline.
  //    5. DurationStyled is following normal flow since its position is static (default value).
  //*  6. DetailArea is positioned absolutely to its containing block Timeline.

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        height: `max(${MINIMUMS.TIMELINE}px, ${VH_RATIO.TIMELINE}vh)`,
        backgroundColor: "#c6d1e6",
        left: initialLeftAndRight.left,
        right: initialLeftAndRight.right,
        width: `${fullWidthOfTimeline.current}px`,
        touchAction: "none", // 브라우저 기본 터치 동작 비활성화
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
