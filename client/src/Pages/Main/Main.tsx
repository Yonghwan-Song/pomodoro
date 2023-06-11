import { useEffect } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { SW } from "../..";
import { UserInfo } from "../../Context/UserContext";
import { UserAuth } from "../../Context/AuthContext";
import { TimerRelatedStates } from "../..";

export default function Main() {
  const { pomoSetting } = UserInfo()!;
  const { user } = UserAuth()!;

  useEffect(() => {
    console.log(pomoSetting);
    if (Object.entries(pomoSetting).length === 0) {
    } else {
      SW?.postMessage({
        component: "PatternTimer",
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
  }, [user, pomoSetting]);

  useEffect(() => {
    console.log(pomoSetting);
    if (
      TimerRelatedStates !== null &&
      Object.keys(TimerRelatedStates).length !== 0 &&
      TimerRelatedStates.running
    ) {
      let id = localStorage.getItem("idOfSetInterval");
      //! Idea
      //! 이거 아예 thread가 달라서 의미가 없는 것 같고 그냥 id를 다시 sw에 message를 이용해서 보내야함.
      //! clearInterval(Number(id));
      SW?.postMessage({ idOfSetInterval: id });
      localStorage.removeItem("idOfSetInterval");
    }
    return () => {
      // for the case where a user navigates to another page.
      SW?.postMessage({
        action: "sendDataToIndex",
        payload: localStorage.getItem("idOfSetInterval"),
      });
    };
  }, []);
  return (
    <div>
      {!!Object.entries(pomoSetting).length && (
        <PatternTimer
          pomoDuration={pomoSetting.pomoDuration}
          shortBreakDuration={pomoSetting.shortBreakDuration}
          longBreakDuration={pomoSetting.longBreakDuration}
          numOfPomo={pomoSetting.numOfPomo}
        />
      )}
    </div>
  );
}
