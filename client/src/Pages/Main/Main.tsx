import { useEffect } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { postMsgToSW } from "../..";
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
      postMsgToSW("saveStates", {
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
      postMsgToSW("clearInterval", {
        idOfSetInterval: localStorage.getItem("idOfSetInterval"),
      });
      localStorage.removeItem("idOfSetInterval");
    }
    return () => {
      // for the case where a user navigates to another page.
      postMsgToSW("sendDataToIndex", localStorage.getItem("idOfSetInterval"));
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
