import { useEffect, useState } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import {
  postMsgToSW,
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDownInBackground,
} from "../..";
import { PomoSettingType, UserInfo } from "../../Context/UserContext";
import { UserAuth } from "../../Context/AuthContext";
import { StatesType } from "../..";
import RecOfToday from "../../Components/RecOfToday/RecOfToday";
import { RecType } from "../../types/clientStatesType";
import { StyledLoadingMessage } from "../../Components/styles/LoadingMessage.styled";

export default function Main() {
  const { user } = UserAuth()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    StatesType | {} | null
  >(null);
  const [records, setRecords] = useState<RecType[]>([]);
  const userInfoContext = UserInfo()!;
  const pomoSetting = userInfoContext.pomoSetting ?? ({} as PomoSettingType);

  useEffect(() => {
    console.log("statesRelatedToTimer", statesRelatedToTimer);
    if (
      statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      (statesRelatedToTimer as StatesType).running
    ) {
      stopCountDownInBackground();
    }
  }, [statesRelatedToTimer]);

  useEffect(() => {
    const getStatesFromIDB = async () => {
      let states = await obtainStatesFromIDB("withoutPomoSetting");
      setStatesRelatedToTimer(states);
    };
    getStatesFromIDB();
  }, []);

  useEffect(() => {
    async function getTodaySession() {
      let data = await retrieveTodaySessionsFromIDB();
      setRecords(data);
    }
    getTodaySession();
  }, []);

  useEffect(() => {
    if (Object.entries(pomoSetting).length !== 0) {
      postMsgToSW("saveStates", {
        component: "PatternTimer",
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
  }, [user, pomoSetting]);

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
            <PatternTimer
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
