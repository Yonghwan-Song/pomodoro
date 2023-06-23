import { useEffect, useState } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { DB, postMsgToSW } from "../..";
import { UserInfo } from "../../Context/UserContext";
import { UserAuth } from "../../Context/AuthContext";
import { StatesType } from "../..";
import { wrap } from "idb";

export default function Main() {
  const { pomoSetting } = UserInfo()!;
  const { user } = UserAuth()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] =
    useState<StatesType | null>(null);

  async function obtainStatesFromIDB() {
    if (DB) {
      const wrapped = wrap(DB);
      const store = wrapped.transaction("stateStore").objectStore("stateStore");

      let dataArr = await store.getAll();
      let states = dataArr.reduce((acc, cur) => {
        return { ...acc, [cur.name]: cur.value };
      }, {});
      const { pomoSetting, ...withoutPomoSetting } = states;

      return withoutPomoSetting;
    }
  }

  useEffect(() => {
    console.log("statesRelatedToTimer", statesRelatedToTimer);
    if (
      statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      statesRelatedToTimer.running
    ) {
      postMsgToSW("stopCountdown", {
        idOfSetInterval: localStorage.getItem("idOfSetInterval"),
      });
    }
  }, [statesRelatedToTimer]);

  useEffect(() => {
    const getStatesFromIDB = async () => {
      let states = await obtainStatesFromIDB();
      setStatesRelatedToTimer(states);
    };
    getStatesFromIDB();
  }, []);

  useEffect(() => {
    if (Object.entries(pomoSetting).length === 0) {
    } else {
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
