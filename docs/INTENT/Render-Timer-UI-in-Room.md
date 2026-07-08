# 목표
User가 Timer를 Room에 join한 상태이자 다른 url에 잠시 방문하고 있지 않은 상태에서 (즉, UI의 관점에서 실질적으로 Room에 머무르고 있을 때), Timer를 조작할 수 있게 한다.

- 구체적으로 무엇을 어떻게 조작하게 할지는 아직 생각하지 않았는데, 

- TimerController (@/home/yhs/Repos/integrate-webrtc-by-gemini/pomodoro/client/src/Pages/Main/Timer-Related/TimerController/TimerController.tsx)이하의 component들에 의해 제공되는 모든 기능은 사용할 수 있도록 하는게 좋을 듯.

## 방식
@/home/yhs/Repos/integrate-webrtc-by-gemini/pomodoro/client/src/Pages/GroupStudy/Room.tsx 에서 Timer UI를 Render.

### 고려할 점들

#### 다른 Component들과의 의존성

우선 @/home/yhs/Repos/integrate-webrtc-by-gemini/pomodoro/client/src/Pages/Main/Main.tsx Component를 보면, TimerController는 records와 setRecords를 props로 받아서 사용하고있음. 그래서 당장은 TimerController만 Room에서 import해서 render하는 것에는 무리가 있음.

**그렇다면, Main자체를 옮겨버리면 되지 않느냐?**

- 그렇게 하면 로직 자체에는 문제가 발생하지 않을 것 같은데,
- Line 226의 `<RecOfToday records={records} />`는 Room에 render할 필요가 없어보임.

- 그런데 적다보니까... 그냥 Main을 통째로 옮겨보고 다시 생각해보는게 좋겠음.

      

