import { useCallback, useEffect, useRef, useState } from 'react';
import { DurationType, SessionType } from '../../../types/clientStatesType';
import {
  mobileRange,
  tabletRange,
  fhdRange,
  qhdRange,
  uhdRange,
} from './mediaQueryLists';
import { MINIMUMS, PIXEL, VH_RATIO } from '../../../constants';

type DetailAreaProps = {
  arrOfSessions: SessionType[];
};

/**
 * 선택된 세션/구간의 세부 정보 타입
 */
type SelectedDetail = {
  startTimeString: string;
  endTimeString: string;
  durationString: string;
  subject: DurationType['subject'];
  pauseReason?: string | null;
};

export default function DetailArea({ arrOfSessions }: DetailAreaProps) {
  const [flattened, setFlattened] = useState<DurationType[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(
    null,
  );
  const divRef = useRef<HTMLDivElement>(null);
  const nestedDivRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
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
        console.log('MOBILE IN DETAIL_AREA');
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_MOBILE * 24 + 'px');
        msToPx.current = PIXEL.PER_SEC.IN_MOBILE / 1000;
      }
    },
    [],
  );
  const handleTabletRangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log('TABLET IN DETAIL_AREA');
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_TABLET * 24 + 'px');
        msToPx.current = PIXEL.PER_SEC.IN_TABLET / 1000;
      }
    },
    [],
  );
  const handleFHD_RangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log('FHD IN DETAIL_AREA');
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_FHD * 24 + 'px');
        msToPx.current = PIXEL.PER_SEC.IN_FHD / 1000;
      }
    },
    [],
  );
  const handleQHD_RangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log('QHD IN DETAIL_AREA');
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_QHD * 24 + 'px');
        msToPx.current = PIXEL.PER_SEC.IN_QHD / 1000;
      }
    },
    [],
  );
  const handleUHD_RangeAtDetailedArea = useCallback(
    (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        console.log('UHD IN DETAIL_AREA');
        divRef.current &&
          (divRef.current.style.width = PIXEL.PER_HR.IN_UHD * 24 + 'px');
        msToPx.current = PIXEL.PER_SEC.IN_UHD / 1000;
      }
    },
    [],
  );

  mobileRange.addEventListener('change', handleMobileRangeAtDetailedArea);
  tabletRange.addEventListener('change', handleTabletRangeAtDetailedArea);
  fhdRange.addEventListener('change', handleFHD_RangeAtDetailedArea);
  qhdRange.addEventListener('change', handleQHD_RangeAtDetailedArea);
  uhdRange.addEventListener('change', handleUHD_RangeAtDetailedArea);
  //#endregion

  //#region side effects
  useEffect(() => {
    return () => {
      mobileRange.removeEventListener(
        'change',
        handleMobileRangeAtDetailedArea,
      );
      tabletRange.removeEventListener(
        'change',
        handleTabletRangeAtDetailedArea,
      );
      fhdRange.removeEventListener('change', handleFHD_RangeAtDetailedArea);
      qhdRange.removeEventListener('change', handleQHD_RangeAtDetailedArea);
      uhdRange.removeEventListener('change', handleUHD_RangeAtDetailedArea);
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
    let matchingDuration: DurationType | undefined = flattened.find((dur) => {
      let startPoint = (dur.startTime - startOfTodayTimestamp) * msToPx.current;
      let endPoint = (dur.endTime - startOfTodayTimestamp) * msToPx.current;
      let pointerLocation =
        Math.abs(
          parseInt(window.getComputedStyle(parentElement as Element).left),
        ) + ev.clientX;
      if (pointerLocation >= startPoint && pointerLocation <= endPoint) {
        middle = (startPoint + endPoint) / 2;
        return true;
      } else {
        return false;
      }
    });

    // TODO - 아래 테스트 해봐야함.
    if (matchingDuration !== undefined && middle !== null) {
      /**
       * [오른쪽/왼쪽 끝 잘림 방지 (Clamping)]
       * 11:50pm이나 00:05am처럼 타임라인 가장자리에 위치한 블록을 클릭했을 때,
       * translateX(-50%)로 인해 텍스트가 화면 바깥으로 삐져나가지 않도록
       * 예상 절반 너비(140px)를 기준으로 안전한 left 좌표를 계산합니다.
       */
      const minLeft = 140;
      const maxLeft = fullWidthOfTimeline.current - 140;
      const clampedLeft = Math.max(minLeft, Math.min(middle, maxLeft));

      if (nestedDivRef.current) {
        nestedDivRef.current.style.left = clampedLeft + 'px';
      }

      let startTimeString = new Date(
        matchingDuration.startTime,
      ).toLocaleTimeString();
      let endTimeString = new Date(
        matchingDuration.endTime,
      ).toLocaleTimeString();
      let durationInSeconds = Math.floor(matchingDuration.duration / 1000);
      let minutes = Math.floor(durationInSeconds / 60);
      let seconds = durationInSeconds % 60;

      setSelectedDetail({
        startTimeString,
        endTimeString,
        durationString: `${minutes}m ${seconds}s`,
        subject: matchingDuration.subject,
        pauseReason:
          matchingDuration.subject === 'pause'
            ? matchingDuration.pauseReason
            : undefined,
      });
    } else {
      setSelectedDetail(null);
    }

    if (ev.button === 0) {
      isButtonPressed = true;
      ev.stopPropagation();
      document.body.onmouseup = () => {
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
        position: 'absolute',
        bottom: `min(-${MINIMUMS.DETAIL_AREA}px,-${VH_RATIO.DETAIL_AREA}vh)`,
        height: `max(${MINIMUMS.DETAIL_AREA}px,${VH_RATIO.DETAIL_AREA}vh)`,
        backgroundColor: '#9ca0bb',
        width: fullWidthOfTimeline.current + 'px',
        overflow: 'hidden',
      }}
    >
      {selectedDetail && (
        <div
          ref={nestedDivRef}
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            top: '50%',
            left: '0px',
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap',
            lineHeight: 1.25,
            pointerEvents: 'none',
          }}
        >
          {/* 1줄: 시작 ~ 종료 시각 및 소요 시간 */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1e2430',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>
              {selectedDetail.startTimeString} ~ {selectedDetail.endTimeString}
            </span>
            <span style={{ fontWeight: 500, color: '#333d4e' }}>
              {selectedDetail.durationString}
            </span>
            {selectedDetail.subject === 'pause' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#D08770',
                  color: '#ffffff',
                  fontWeight: 600,
                }}
              >
                Pause
              </span>
            )}
          </div>

          {/* 2줄: 일시정지 사유 배지 (사유가 등록되어 있을 때만 표시) */}
          {selectedDetail.pauseReason && (
            <div
              title={selectedDetail.pauseReason}
              style={{
                marginTop: '3px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#2a3240',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '1px 8px',
                borderRadius: '10px',
                maxWidth: '260px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                display: 'inline-block',
              }}
            >
              💬 {selectedDetail.pauseReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
