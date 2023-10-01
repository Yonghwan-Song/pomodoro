import { useEffect, useState } from "react";
import {
  postMsgToSW,
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDownInBackground,
} from "../..";
import { UserInfo } from "../../Context/UserContext";
import { PomoSettingType } from "../../types/clientStatesType";
import { UserAuth } from "../../Context/AuthContext";
import { StatesType } from "../..";
import RecOfToday from "../../Components/RecOfToday/RecOfToday";
import { RecType } from "../../types/clientStatesType";
import { StyledLoadingMessage } from "../../Components/styles/LoadingMessage.styled";
import { pubsub } from "../../pubsub";
import TogglingTimer from "./TogglingTimer";

export default function Main() {
  const { user } = UserAuth()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    StatesType | {} | null
  >(null);
  const [records, setRecords] = useState<RecType[]>([]);
  const [toggle, setToggle] = useState(false);
  const userInfoContext = UserInfo()!;
  const { pomoInfo } = userInfoContext;

  let pomoSetting = {} as PomoSettingType;
  if (pomoInfo !== null && pomoInfo.pomoSetting !== undefined) {
    pomoSetting = pomoInfo.pomoSetting;
  }

  //#region UseEffects
  // useEffect(checkRendering);

  useEffect(endTimerInBackground, [statesRelatedToTimer]);

  useEffect(setStatesRelatedToTimerUsingDataFromIDB, []);

  useEffect(setRecordsUsingTodaySessionsFromIDB, []);

  useEffect(subscribeToSuccessOfPersistingTimerStatesToIDB, []);

  // Because of log out in the Main page... actually this makes it unnecessary to refresh app to provide PT and T with default pomoSetting.
  useEffect(subscribeToClearStateStore, []);

  useEffect(postSaveStatesMessageToServiceWorkerAndSetToggle, [
    user,
    pomoSetting,
  ]);
  //#endregion

  //#region Side Effect Callbacks
  function checkRendering() {
    console.log("Main");
    console.log("user", user === null ? null : "non-null");
    console.log("pomoInfo", pomoInfo);
    console.log("statesRelatedToTimer", statesRelatedToTimer);
    console.log("records", records);
    console.log(
      "------------------------------------------------------------------"
    );
  }

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

  function setRecordsUsingTodaySessionsFromIDB() {
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
        setToggle((prev) => !prev);
      }
    );

    return () => {
      unsub();
    };
  }

  function subscribeToClearStateStore() {
    const getStatesFromIDB = async () => {
      let states = await obtainStatesFromIDB("withoutPomoSetting");
      console.log(
        "set this to statesRelatedToTimer after clearing stateStore",
        states
      );
      setStatesRelatedToTimer(states);
      setToggle((prev) => !prev);
    };
    const unsub = pubsub.subscribe("clearStateStore", (data) => {
      getStatesFromIDB();
    });

    return () => {
      unsub();
    };
  }

  function postSaveStatesMessageToServiceWorkerAndSetToggle() {
    if (Object.entries(pomoSetting).length !== 0) {
      postMsgToSW("saveStates", {
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
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
