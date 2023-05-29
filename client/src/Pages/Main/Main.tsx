import { useEffect } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { SW } from "../..";
import { UserInfo } from "../../Context/UserContext";

export default function Main() {
  const { pomoSetting } = UserInfo()!;
  // const { user } = UserAuth()!; // 혹시 몰라서... 왜냐하면, 이유는 기억 안나지만 이전의 PatternTimer useEffect의 reactive value였음.

  useEffect(() => {
    if (Object.entries(pomoSetting).length !== 0) {
      console.log(
        "그런데 이렇게 할 필요 없는거 아니냐? 왜냐하면 pomoSetting바뀌면 PatternTImer로 가는 prop 바뀌니까 PT 자연스럽게 updatae되잖아."
      );

      //todo: 여기 조건식 안에 넣는게 맞는거야? 모르겠다 ㅠ => getPomoSetting in UserContext.tsx에서 해야하는거 아니냐
      //      어차피 거기서
      SW?.postMessage({
        component: "PatternTimer",
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }
  }, [pomoSetting]);
  // }, [user, pomoSetting]);
  useEffect(() => {
    return () => {
      SW?.postMessage("sendDataToIndex");
    };
  }, []);
  return (
    <div>
      <PatternTimer
        pomoDuration={pomoSetting.pomoDuration}
        shortBreakDuration={pomoSetting.shortBreakDuration}
        longBreakDuration={pomoSetting.longBreakDuration}
        numOfPomo={pomoSetting.numOfPomo}
      />
    </div>
  );
}
