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

  return (
    <main>
      <RecOfToday records={records} />
      <section>
        {!!Object.entries(pomoSetting).length &&
          statesRelatedToTimer !== null && (
            <PatternTimer
              statesRelatedToTimer={statesRelatedToTimer}
              pomoDuration={pomoSetting.pomoDuration}
              shortBreakDuration={pomoSetting.shortBreakDuration}
              longBreakDuration={pomoSetting.longBreakDuration}
              numOfPomo={pomoSetting.numOfPomo}
              setRecords={setRecords}
            />
          )}
      </section>
    </main>
  );
}
