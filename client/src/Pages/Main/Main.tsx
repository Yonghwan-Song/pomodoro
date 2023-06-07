import { useEffect } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { SW } from "../..";
import { UserInfo } from "../../Context/UserContext";
import { UserAuth } from "../../Context/AuthContext";
import { TimerRelatedStates } from "../..";

export default function Main() {
  const { pomoSetting } = UserInfo()!;
  const { user } = UserAuth()!; // 혹시 몰라서... 왜냐하면, 이유는 기억 안나지만 이전의 PatternTimer useEffect의 reactive value였음.

  useEffect(() => {
    console.log(pomoSetting);
    if (Object.entries(pomoSetting).length === 0) {
      //애초에 이런 경우가 왜 발생하는 지 잘 모르겠어 그리고 결국에는 pomoSetting 받아오는데
      //그러면 dep Array
    } else {
      SW?.postMessage({
        component: "PatternTimer",
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
    // if (Object.entries(pomoSetting).length !== 0) {
    //   SW?.postMessage({
    //     component: "PatternTimer",
    //     stateArr: [{ name: "pomoSetting", value: pomoSetting }],
    //   });
    // }
  }, [user, pomoSetting]);

  useEffect(() => {
    console.log(pomoSetting);
    if (
      TimerRelatedStates !== null &&
      Object.keys(TimerRelatedStates).length !== 0 &&
      TimerRelatedStates.running
    ) {
      // SW?.postMessage("clearInterval"); // paired with around 88 in service-worker.js
      let id = localStorage.getItem("idOfSetInterval");
      //! Idea
      //! 이거 아예 thread가 달라서 의미가 없는 것 같고 그냥 id를 다시 sw에 message를 이용해서 보내야함.
      //! clearInterval(Number(id));
      SW?.postMessage({ idOfSetInterval: id });
      localStorage.removeItem("idOfSetInterval"); //? 혹시 몰라서 ...
    }
    return () => {
      SW?.postMessage("sendDataToIndex");
    };
  }, []);
  // return (
  //   <div>
  //     <PatternTimer
  //       pomoDuration={pomoSetting.pomoDuration}
  //       shortBreakDuration={pomoSetting.shortBreakDuration}
  //       longBreakDuration={pomoSetting.longBreakDuration}
  //       numOfPomo={pomoSetting.numOfPomo}
  //     />
  //   </div>
  // );
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
