import { pubsub } from "../pubsub";
import { boundedPomoInfoStore } from "../zustand-stores/pomoInfoStoreUsingSlice";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import { CURRENT_SESSION_TYPE, RESOURCE, SUB_SET } from "../constants";
import { CategoryChangeInfo } from "../types/clientStatesType";

export async function handleSessionEndBySW({
  categoryChangeInfoArrAfterReset,
  userEmail
}: {
  categoryChangeInfoArrAfterReset: CategoryChangeInfo[];
  userEmail: string | null;
}) {
  pubsub.publish("sessionEndBySW", categoryChangeInfoArrAfterReset); // This event is subscribed by NavBar's useEffect callback.

  // console.log("payload at endbysw", payload);

  // 이거 autoStart인 경우, zustand가 두 값을 비교해서 나중에것 하나로 (즉 true) 한번 update하는게 아니라, 찰나에 두번 update함.
  // TODO: - sw.js에서 조건을 걸어서 보내든 조건을 걸 수 있는 boolean을 payload에 포함시키면 한번만 update하게 할 수 있는데,
  //        뭔가 자꾸 에러나고 약간 복잡해서 우선 그냥 넘김.
  // QQQ: 이 global state는 왜 udpate해주는거지?... 어차피 모두 main thread로 옮겨오니까... 만약에 sw.js에서 wrapUpSession이 state을 update해줘야하면 그냥 여기에서 다 해버리면 안되나?
  boundedPomoInfoStore.getState().setTimersStatesPartial({
    running: false,
    startTime: 0
  });

  // TODO: 아래에 적어놓은것들이 실제로 그렇게 작동하는지 테스트 해봐야함. 당시에 약간 작업기억 후달리는 느낌이였음.
  // 사실 아래의 코드들은 방금 끝난 세션의 종류가 break이면 이렇게 할 필요가 없음.
  // 왜냐하면 - pomo일때만 더러워진거 다시 초기화? 같은거 하기위해 필요한 것임.
  // 그러면 여기서도 pomo인지 뭔지 판단을 해야하는데, sw.js에 의해 종료되는 경우에도 pomo랑 거시기 뭐시기를 우리가 sessionStorage에 update했던가?....
  // 만약 TC가 다시 로드되는 것에 의해 sessionStorage가 update된다면 .. 타이밍상 여기에서는 pomo인지 break인지 판단이 불가능한게 아닌가?
  // TC가 다시 load되면서 update됨. (L1159 useEffect)

  // QQQ: 전반적으로 아래의 코드들의 의도가 뭔말인지 모르겠어.
  //
  // NOTE: 왜 JustFinishedType인지 -> 이 찰나는 아직 TC로 가서 useEffect에 의해 current session type을 판단해서 setItem() 호출하기 전 이다.
  const sessionTypeJustFinished = sessionStorage.getItem(CURRENT_SESSION_TYPE);

  // NOTE: 방금 종료된 세션이 POMO였을 경우에만,
  // changeInfoArray가 여러개의 taskChangeInfo에 의해 더럽혀?졌을 가능성이 있기 때문에 그것을 초기화 해주는 것임.
  if (
    sessionTypeJustFinished !== null &&
    sessionTypeJustFinished.toUpperCase() === "POMO"
  ) {
    const currentTaskId = boundedPomoInfoStore.getState().currentTaskId; // the same value as the one in the sesionStorage.
    const newTaskChangeInfo = {
      id: currentTaskId,
      taskChangeTimestamp: 0
    };
    // NOTE: 3.
    boundedPomoInfoStore.getState().setTaskChangeInfoArray([newTaskChangeInfo]); //? 이게 먼저 실행되고, autoStartCurrentSession의 changeTimestamp할당이 일어나겠지?
    userEmail &&
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY, {
        taskChangeInfoArray: [newTaskChangeInfo]
      });
  }
}
