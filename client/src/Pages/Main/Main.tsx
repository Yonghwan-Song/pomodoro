import { useEffect, useState } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { DB, postMsgToSW } from "../..";
import { UserInfo } from "../../Context/UserContext";
import { UserAuth } from "../../Context/AuthContext";
import { TimerRelatedStates, StatesType } from "../..";
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

  // useEffect(() => {
  //   console.log("statesRelatedToTimer", statesRelatedToTimer);

  //   const getStatesFromIDB = async () => {
  //     let states = await obtainStatesFromIDB();
  //     setStatesRelatedToTimer(states);
  //   };

  //   if (
  //     statesRelatedToTimer !== null &&
  //     Object.keys(statesRelatedToTimer).length !== 0
  //   ) {
  //     let remainingDuration = Math.floor(
  //       (statesRelatedToTimer.duration * 60 * 1000 - // min * 60 * 1000 => Milliseconds
  //         (Date.now() -
  //           statesRelatedToTimer.startTime -
  //           statesRelatedToTimer.pause.totalLength)) /
  //         1000
  //     );

  //     if (remainingDuration <= 0) {
  //       getStatesFromIDB();
  //     }
  //   }
  // }, [statesRelatedToTimer?.running]);

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
    // console.log(pomoSetting);
    if (Object.entries(pomoSetting).length === 0) {
    } else {
      postMsgToSW("saveStates", {
        component: "PatternTimer",
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
  }, [user, pomoSetting]);

  useEffect(() => {
    // console.log(pomoSetting);
    //Problem: statesRelatedToTimer below were actually the TimerRelatedToStates directly imported from index.tsx
    //Thus, it was not null unlike this statesRelatedToTimer unavoidably has to be initialized to null
    //because it is totally unaware of the previous lifecycle where the states... were not null.
    //The statesRelatedToTimer is supposed to be always null regardless of the value it is going to be assigned from idb is not null and .running is true.
    /*if (
      statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      statesRelatedToTimer.running
    ) {
      postMsgToSW("stopCountdown", {
        idOfSetInterval: localStorage.getItem("idOfSetInterval"),
      });
    }*/
    return () => {
      // for the case where a user navigates to another page.
      // postMsgToSW("countDown", localStorage.getItem("idOfSetInterval"));
    };
  }, []);

  //! ㅠㅠ
  // if (!!Object.entries(pomoSetting).length && statesRelatedToTimer !== null) {
  //   if (Object.keys(statesRelatedToTimer).length === 0) {
  //     return (
  //       <div>
  //         <PatternTimer
  //           statesRelatedToTimer={statesRelatedToTimer}
  //           pomoDuration={pomoSetting.pomoDuration}
  //           shortBreakDuration={pomoSetting.shortBreakDuration}
  //           longBreakDuration={pomoSetting.longBreakDuration}
  //           numOfPomo={pomoSetting.numOfPomo}
  //         />
  //       </div>
  //     );
  //   } else if (
  //     Math.floor(
  //       (statesRelatedToTimer.duration * 60 * 1000 - // min * 60 * 1000 => Milliseconds
  //         (Date.now() -
  //           statesRelatedToTimer.startTime -
  //           statesRelatedToTimer.pause.totalLength)) /
  //         1000
  //     ) > 0
  //   ) {
  //     return (
  //       <div>
  //         <PatternTimer
  //           statesRelatedToTimer={statesRelatedToTimer}
  //           pomoDuration={pomoSetting.pomoDuration}
  //           shortBreakDuration={pomoSetting.shortBreakDuration}
  //           longBreakDuration={pomoSetting.longBreakDuration}
  //           numOfPomo={pomoSetting.numOfPomo}
  //         />
  //       </div>
  //     );
  //   } else {
  //     return <div>Waiting for data</div>;
  //   }
  // } else {
  //   return <div>Waiting for data</div>;
  // }

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

  // return (
  //   <div>
  //     {!!Object.entries(pomoSetting).length && (
  //       <PatternTimer
  //         pomoDuration={pomoSetting.pomoDuration}
  //         shortBreakDuration={pomoSetting.shortBreakDuration}
  //         longBreakDuration={pomoSetting.longBreakDuration}
  //         numOfPomo={pomoSetting.numOfPomo}
  //       />
  //     )}
  //   </div>
  // );
}
