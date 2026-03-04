import { useEffect, useRef, useState } from "react";
import {
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDownInBackground,
  deciderOfWhetherDataForRunningTimerFetched,
} from "..";
import {
  CycleInfoType,
  TimersStatesType,
  TimersStatesTypeWithCurrentCycleInfo,
  RecType,
} from "../types/clientStatesType";
import { pubsub } from "../pubsub";
import { SUCCESS_PersistingTimersStatesWithCycleInfoToIDB } from "../constants";

/**
 * useTimerData Custom Hook
 * 
 * 기존 Main.tsx 파일에 존재하던 타이머 관련 데이터 페칭 및 구독 로직을 분리한 훅입니다.
 * IndexedDB에서 타이머 상태(statesRelatedToTimer, currentCycleInfo) 및 오늘자 기록(records)을 
 * 가져오고, PubSub 이벤트를 통해 상태를 최신으로 유지합니다.
 * 
 * @param options.skipPubSub 
 *  - true일 경우: PubSub 이벤트 구독을 생략하고 오직 마운트 시 IndexedDB에서 최신 데이터만 읽어옵니다.
 *    (예: RoomTimer에서는 이미 /timer 페이지 방문 시 전역 데이터 페칭이 완료되었다고 가정하고
 *    불필요한 중복 구독을 피하기 위해 사용됩니다.)
 */
export function useTimerData(options?: { skipPubSub?: boolean }) {
  // NOTE:
  // options?.skipPubSub can be true | false | undefined.
  // We intentionally normalize it to a strict boolean so dependency arrays
  // compare only boolean values and the condition reads as "skip only when true".
  const skipPubSub = options?.skipPubSub === true;

  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    TimersStatesType | {} | null
  >(null);
  const [currentCycleInfo, setCurrentCycleInfo] = useState<
    CycleInfoType | {} | null
  >(null);
  const [records, setRecords] = useState<RecType[]>([]);

  const areDataForRunningTimerFetched = useRef<[boolean, boolean]>(
    deciderOfWhetherDataForRunningTimerFetched
  );

  useEffect(() => {
    function setStatesRelatedToTimerAndCurrentCycleInfoUsingDataFromIDB() {
      const getStatesFromIDB = async () => {
        const states = await obtainStatesFromIDB("withoutSettings");
        if (Object.entries(states).length !== 0) {
          const { currentCycleInfo, ...timersStates } =
            states as TimersStatesTypeWithCurrentCycleInfo;

          setStatesRelatedToTimer(timersStates);
          setCurrentCycleInfo(currentCycleInfo);
        } else {
          setStatesRelatedToTimer({});
          setCurrentCycleInfo({});
        }
      };
      getStatesFromIDB();
    }
    setStatesRelatedToTimerAndCurrentCycleInfoUsingDataFromIDB();
  }, []);

  useEffect(() => {
    function setRecordsUsingDataFromIDB() {
      async function getTodaySession() {
        const data = await retrieveTodaySessionsFromIDB();
        const dataSet = new Set(data);
        setRecords((prev) => {
          prev.forEach((val) => {
            dataSet.add(val);
          });
          return Array.from(dataSet);
        });
      }
      getTodaySession();
    }
    setRecordsUsingDataFromIDB();
  }, []);

  useEffect(() => {
    // NOTE: dependency array의 `[skipPubSub]`에 대한 설명
    // RoomTimer처럼 이미 Main에서 데이터를 다 받아오고 넘어와 굳이 이벤트를 다시 구독할 필요가 없는 경우(skipPubSub === true),
    // useEffect 내부 첫 줄에서 `if (skipPubSub) return;`으로 인해 아무 동작도 하지 않고 종료(early return)됩니다.
    // 만약 미래에 특정 동작에 의해 skipPubSub 값이 런타임 중에 false로 바뀐다면,
    // 의존성 배열에 담겨 있기 때문에 이 useEffect가 다시 실행되어 정상적으로 이벤트를 구독하게 됩니다.
    // 즉, 값의 변화에 안전하게 대응하기 위한 React의 표준적인 패턴입니다.
    if (skipPubSub) return;
    function subscribeToSuccessOfPersistingTimerStatesWithCurrentCycleInfoToIDB() {
      const unsub = pubsub.subscribe(
        SUCCESS_PersistingTimersStatesWithCycleInfoToIDB,
        (data) => {
          setStatesRelatedToTimer(data.timersStates);
          setCurrentCycleInfo(data.currentCycleInfo);
          areDataForRunningTimerFetched.current[0] = true;
        }
      );
      return () => {
        unsub();
      };
    }
    return subscribeToSuccessOfPersistingTimerStatesWithCurrentCycleInfoToIDB();
  }, [skipPubSub]);

  useEffect(() => {
    if (skipPubSub) return;
    function subscribeToSuccessOfPersistingRecordsOfTodayToIDB() {
      const unsub = pubsub.subscribe(
        "successOfPersistingRecordsOfTodayToIDB",
        (data) => {
          setRecords(data);
          areDataForRunningTimerFetched.current[1] = true;
        }
      );
      return () => {
        unsub();
      };
    }
    return subscribeToSuccessOfPersistingRecordsOfTodayToIDB();
  }, [skipPubSub]);

  useEffect(() => {
    if (skipPubSub) return;
    function subscribeToRePersistingFailedRecOfToday() {
      const unsub = pubsub.subscribe(
        "addFailedRecOfTodayToIDB",
        (newlyAddedRecArr) => {
          setRecords((prev) => [...prev, ...newlyAddedRecArr]);
        }
      );
      return () => {
        unsub();
      };
    }
    return subscribeToRePersistingFailedRecOfToday();
  }, [skipPubSub]);

  useEffect(() => {
    function endTimerInBackground() {
      statesRelatedToTimer !== null &&
        Object.keys(statesRelatedToTimer).length !== 0 &&
        (statesRelatedToTimer as TimersStatesType).running &&
        stopCountDownInBackground();
    }
    endTimerInBackground();
  }, [statesRelatedToTimer]);

  const isStatesRelatedToTimerReady = statesRelatedToTimer !== null;
  const isCurrentCycleInfoReady = currentCycleInfo !== null;
  const areDataForRunningTimerFetchedCompletely = skipPubSub
    ? true
    : areDataForRunningTimerFetched.current[0] &&
      areDataForRunningTimerFetched.current[1];

  return {
    statesRelatedToTimer,
    currentCycleInfo,
    records,
    setRecords,
    isStatesRelatedToTimerReady,
    isCurrentCycleInfoReady,
    areDataForRunningTimerFetchedCompletely,
  };
}
