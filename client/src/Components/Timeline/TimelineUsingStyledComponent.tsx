// Styled component이용해서 Timeline 다시 만들려고 했는데, 실패했음. 그런데 그냥 우선은 지우지 않고 놔두겠음 혹시 모르니.
import { useState, useRef, useEffect } from "react";
import Session from "../Session/Session";
import { SessionType } from "../../types/clientStatesType";
import Scale from "../Scale/Scale";
import DetailArea from "../DetailArea/DetailArea";
import { StyledTimeline } from "../styles/timeline-related/Timeline.styled";

type TimelineProps = {
  arrOfSessions: SessionType[];
};

/**
 * 주목할 점들:
 * 1. mouse down -> mouse move -> mouse up에서,
 * 마우스 move하는 순간 순간을 포착해서 delta값을 계산 후 그것을 이용해서 left값을 계산 후 대입
 * => 그러므로 순간순간 적절한 left값을 대입받아서 timeline이 움직이게 된다.
 *
 */

export default function TimelineUsingStyledComponent({
  arrOfSessions,
}: TimelineProps) {
  const [dynamicLeftAndRight, setDynamicLeftAndRight] =
    useState(getCSSLeftAndRight);

  //! These are going to be used by UI event handlers defined below.
  let isButtonPressed = false;
  let clientXByMouseDown: number = 0;
  let leftWhenMouseDown: number | null = null;
  const FHDWidth = 1920; // 4hours
  const FullWidthOfTimeline = FHDWidth * 6; // 24hours

  //#region UI Event Handlers
  function moveTimelineByDragging(clientXByMouseMove: number) {
    //* 1. calculate leftWhenMouseDown
    let deltaX = clientXByMouseMove - clientXByMouseDown;

    //! 여기 style에 바로 접근하는 방식이 styled-component와 맞지 않는거 아니야?
    if (dynamicLeftAndRight.right === 0) {
      leftWhenMouseDown = -(
        FullWidthOfTimeline - document.documentElement.clientWidth
      );
      deltaX >= 0 &&
        setDynamicLeftAndRight((prev) => {
          prev.right = null;
          return prev;
        });
    }

    //* 2. calculate a new left value.
    let newLeftVal = leftWhenMouseDown! + deltaX;

    //* 3. assign a new left or right value.
    if (newLeftVal > 0) {
      setDynamicLeftAndRight((prev) => {
        prev.left = 0;
        return prev;
      });
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      FullWidthOfTimeline
    ) {
      //1.
      setDynamicLeftAndRight((prev) => {
        prev.right = 0;
        prev.left = null;
        return prev;
      });
    } else {
      //2.
      setDynamicLeftAndRight((prev) => {
        prev.left = newLeftVal;
        return prev;
      });
    }
  }
  function handleMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    console.log("handleMouseDown", ev);

    // Main button pressed, usually the left button
    if (ev.button === 0) {
      isButtonPressed = true;
      clientXByMouseDown = ev.clientX;
      console.log(
        "can isButtonPressed be changed? -> isButtonPressed should be true at this point ==>",
        isButtonPressed
      );
      //3
      leftWhenMouseDown = dynamicLeftAndRight.left;

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
    // 더이상 남아있는 오른쪽 부분의 타임라인이 존재하지 않는다(현재 오른쪽 끝까지 (24시) 타임라인을 이동한 상태)
    if (dynamicLeftAndRight.right === 0) {
      currentLeft = -(
        FullWidthOfTimeline - document.documentElement.clientWidth
      );
      ev.deltaY < 0 &&
        setDynamicLeftAndRight((prev) => {
          prev.right = null;
          return prev;
        }); // deltaY가 음의 값이라는 것은 앞으로 타임라인을 오른쪽으로 이동시킬 것이라는 것. 그러므로 right을 이용해서 잡아둘 필요가 없다.
    } else {
      currentLeft = dynamicLeftAndRight.left!; //그냥 null말고 초기값을 cssLeftAndRight() 이용해서 구하면 되지 않나?
    }

    //* 2
    newLeftVal = currentLeft - ev.deltaY;

    //* 3 assign a new left or right value.
    if (newLeftVal > 0) {
      setDynamicLeftAndRight((prev) => {
        prev.left = 0;
        return prev;
      });
    } else if (
      -newLeftVal + document.documentElement.clientWidth >
      FullWidthOfTimeline
    ) {
      setDynamicLeftAndRight((prev) => {
        prev.right = 0;
        prev.left = null;
        return prev;
      });
    } else {
      setDynamicLeftAndRight((prev) => {
        prev.left = newLeftVal;
        return prev;
      });
    }
  }
  function handleContextMenu(ev: React.MouseEvent<HTMLDivElement>) {
    ev.preventDefault();
  }
  //#endregion

  // 이거는 초기값인데, 그냥 아예 고정값처럼 Styled component에 주고
  // 나중에 style object이용해서 left값 다시 설정해주는 거는 아예 styled component에
  // 연결도 안해놓았으니까. 거기서 나오는 한계 아니냐?
  function getCSSLeftAndRight() {
    const FHDWidth = 1920;
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
      return { left: null, right: 0 };
    } else {
      return { left: -FHDWidth * n, right: null };
    }
  }

  useEffect(() => {
    window.onresize = (ev) => {
      console.log(window.innerWidth);
      if (
        window.document.documentElement.clientWidth >=
        FullWidthOfTimeline - Math.abs(dynamicLeftAndRight.left!)
      ) {
        setDynamicLeftAndRight((prev) => {
          prev.right = 0;
          prev.left = null;
          return prev;
        });
      }
    };

    return () => {
      window.onresize = null;
    };
  }, []);

  // Children of StyledTimeline are positioned absolute to this StyledTimemline.
  // In other words, when moving timeline by either dragging or scrolling,
  // the children are also moved along with the timeline they are sitting on.
  //? Therefore, I think it is okay to memoize them using memo().
  return (
    <StyledTimeline
      dynamicLeftAndRight={dynamicLeftAndRight}
      fullWidthOfTimeline={FullWidthOfTimeline}
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
    </StyledTimeline>
  );
}
