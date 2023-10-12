import { useEffect, useRef, useState } from "react";
import {
  postMsgToSW,
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDownInBackground,
} from "../..";
import { useUserContext } from "../../Context/UserContext";
import { PomoSettingType } from "../../types/clientStatesType";
import { useAuthContext } from "../../Context/AuthContext";
import { StatesType } from "../..";
import RecOfToday from "../../Components/RecOfToday/RecOfToday";
import { RecType } from "../../types/clientStatesType";
import { StyledLoadingMessage } from "../../Components/styles/LoadingMessage.styled";
import { pubsub } from "../../pubsub";
import TogglingTimer from "./TogglingTimer";

export default function Main() {
  const { user } = useAuthContext()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    StatesType | {} | null
  >(null);
  const [records, setRecords] = useState<RecType[]>([]);
  const [toggle, setToggle] = useState(false);
  const areUserDataFetchedCompletely = useRef<[boolean, boolean]>([
    false, // for persisting timersStates to idb
    false, // for persisting recordsOfToday to idb
  ]);
  const toggleCounter = useRef(0);
  const userInfoContext = useUserContext()!;
  const { pomoInfo } = userInfoContext;

  let pomoSetting = {} as PomoSettingType;
  if (pomoInfo !== null && pomoInfo.pomoSetting !== undefined) {
    pomoSetting = pomoInfo.pomoSetting;
  }

  //#region UseEffects
  // useEffect(showToggleCount);

  useEffect(setStatesRelatedToTimerUsingDataFromIDB, []);

  useEffect(setRecordsUsingDataFromIDB, []);

  useEffect(subscribeToSuccessOfPersistingTimerStatesToIDB, []);

  useEffect(subscribeToSuccessOfPersistingRecordsOfTodayToIDB, []);

  useEffect(subscribeToClearObjectStores, []);

  useEffect(endTimerInBackground, [statesRelatedToTimer]);

  useEffect(postSaveStatesMessageToServiceWorker, [user, pomoSetting]);
  //#endregion

  //#region Side Effect Callbacks
  function endTimerInBackground() {
    statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      (statesRelatedToTimer as StatesType).running &&
      stopCountDownInBackground();
  }

  function setStatesRelatedToTimerUsingDataFromIDB() {
    const getStatesFromIDB = async () => {
      let states = await obtainStatesFromIDB("withoutPomoSetting");
      setStatesRelatedToTimer(states);
    };
    getStatesFromIDB();
  }

  function setRecordsUsingDataFromIDB() {
    async function getTodaySession() {
      let data = await retrieveTodaySessionsFromIDB();
      setRecords(data);
    }
    getTodaySession();
  }

  //! This event is published in the `persistTimersStatesToIDB()` defined in UserContext.tsx
  function subscribeToSuccessOfPersistingTimerStatesToIDB() {
    // Since UserContext component is rendered after this Main component is rendered when signing in.
    const unsub = pubsub.subscribe(
      "successOfPersistingTimersStatesToIDB",
      (data) => {
        setStatesRelatedToTimer(data);

        //#region restriction on calling setToggle using a ref.
        areUserDataFetchedCompletely.current[0] = true;

        // toggle timer only when both data are fetched
        if (
          areUserDataFetchedCompletely.current[0] &&
          areUserDataFetchedCompletely.current[1]
        ) {
          setToggle((prev) => !prev);
          toggleCounter.current += 1;
        }
        //#endregion
      }
    );

    return () => {
      unsub();
    };
  }

  function subscribeToSuccessOfPersistingRecordsOfTodayToIDB() {
    const unsub = pubsub.subscribe(
      "successOfPersistingRecordsOfTodayToIDB",
      (data) => {
        setRecords(data);

        //#region restriction on calling setToggle using a ref.
        areUserDataFetchedCompletely.current[1] = true;

        // toggle timer only when both data are fetched
        if (
          areUserDataFetchedCompletely.current[0] &&
          areUserDataFetchedCompletely.current[1]
        ) {
          setToggle((prev) => !prev);
          toggleCounter.current += 1;
        }
        //#endregion
      }
    );

    return () => {
      unsub();
    };
  }

  /**
   * Purpose: to mount unlogged-in user's timer using default pomoSetting and timersStates.
   *                                            not using the previous user's pomoSetting and timersStates.
   *   User logs out -> recOfToday and stateStore are cleared.
   */
  function subscribeToClearObjectStores() {
    const getDataFromIDB = async () => {
      const states = await obtainStatesFromIDB("withoutPomoSetting");
      const sessionsOfToday = await retrieveTodaySessionsFromIDB();

      setStatesRelatedToTimer(states);
      setRecords(sessionsOfToday); //!<-----
      setToggle((prev) => !prev); // this makes it the mounting with appropriate data unlike the commented one below.
    };

    const unsub = pubsub.subscribe("clearObjectStores", (data) => {
      getDataFromIDB();
    });

    return () => {
      unsub();
    };
  }

  function postSaveStatesMessageToServiceWorker() {
    if (Object.entries(pomoSetting).length !== 0) {
      postMsgToSW("saveStates", {
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
  }

  function showToggleCount() {
    console.log("toggleCount - ", toggleCounter.current);
  }
  //#endregion

  // When this main page is loaded,
  // pomoSetting is fetched from a remote server unlike the statesRelatedToTimer is retrieved from a browser's storage (client side).
  // Therefore, I just want to show "loading timer..." message only when the pomoSetting is not ready.
  // Reason:
  // User experience에 유의미하게 영향을 주는 요소는 여기서
  // pomoSetting object를 가져오는 데 걸리는 시간이다.
  // 왜냐하면 이것은 애초에 remote server에서 가져오는 데이터이기 때문이다(비록 cache를 하더라도).
  // statesRelatedToTimer는 user가 사용하는 브라우저에 저장되기 때문에 준비하는 데 걸리는 시간은 유의미한 영향을 주지 않는다.
  const isPomoSettingReady = !!Object.entries(pomoSetting).length;
  const isStatesRelatedToTimerReady = statesRelatedToTimer !== null;

  return (
    <main>
      <RecOfToday records={records} />
      <section>
        {isStatesRelatedToTimerReady &&
          (isPomoSettingReady ? (
            <TogglingTimer
              toggle={toggle}
              statesRelatedToTimer={statesRelatedToTimer}
              pomoDuration={pomoSetting.pomoDuration}
              shortBreakDuration={pomoSetting.shortBreakDuration}
              longBreakDuration={pomoSetting.longBreakDuration}
              numOfPomo={pomoSetting.numOfPomo}
              setRecords={setRecords}
            />
          ) : (
            <StyledLoadingMessage top="51%">
              loading timer...
            </StyledLoadingMessage>
          ))}
      </section>
    </main>
  );
}
