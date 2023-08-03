import { useEffect, useState } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import {
  postMsgToSW,
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDown,
} from "../..";
import { PomoSettingType, UserInfo } from "../../Context/UserContext";
import { UserAuth } from "../../Context/AuthContext";
import { StatesType } from "../..";

export default function Main() {
  const { user } = UserAuth()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    StatesType | {} | null
  >(null);
  const userInfoContext = UserInfo()!;
  const pomoSetting = userInfoContext.pomoSetting ?? ({} as PomoSettingType);

  useEffect(() => {
    console.log("statesRelatedToTimer", statesRelatedToTimer);
    if (
      statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      (statesRelatedToTimer as StatesType).running
    ) {
      stopCountDown();
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
    retrieveTodaySessionsFromIDB(); //I'm gonna use this for a new feature soon.
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
    <div>
      {!!Object.entries(pomoSetting).length &&
        statesRelatedToTimer !== null && (
          <PatternTimer
            statesRelatedToTimer={statesRelatedToTimer}
            pomoDuration={pomoSetting.pomoDuration}
            shortBreakDuration={pomoSetting.shortBreakDuration}
            longBreakDuration={pomoSetting.longBreakDuration}
            numOfPomo={pomoSetting.numOfPomo}
          />
        )}
    </div>
  );
}
