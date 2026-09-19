# Competitive Room에 한해서 자기 자신의 timer를 돌리니까 disconnection의 시점을 조정하는게 좋지 않을까?

## Q

group study url로 타고 들어가면 지금 socket을 연결해서 이 page url 아래엤는
component들에 한해서 context로 공유하잖아? 그런데, socket 연결 자체는 "group-study"
url에 접속했을 때 수립되지만 (useSocket()으로), 받아온 이 socket을 global
state으로 저장할 수는 없나? 만약 이렇게 우선 설정을해놓고 추후 다른 설정들을
조정하면, competitive room (각자의 timer를 돌리는)에서는 명시적으로 leave button을
누르지 않는 이상, 어차피 그냥 화면만 공유하는 방에 있고 각자의 스케쥴대로 움직이는
거니까, 다른 page url들을 자유롭게 움직여도 방에서 disconnect되지 않게 할 수
있지않을까? 좀 어색한 디자인이긴 한데 그래도 뭔가 자유도가 높아지니까 구현 난이도가
어렵지 않다면 시도해보고싶어서.

## A - Gemini

네, **충분히 가능하고, 오히려 현대적인 웹 앱(Discord, Google Meet 등)에서는 매우 권장되는 패턴**입니다! 🚀

==사용자님께서 말씀하신 "어색한 디자인"이라는 우려와 달리, 이는 **"Pip(Picture-in-Picture) 모드"**나 **"미니 플레이어"** 같은 형태로 UX를 잘 풀어내면 사용자에게 아주 강력한 경험을 제공할 수 있습니다.==

### 💡 핵심 아이디어: "Socket과 MediaStream의 전역화"

지금 생각하신 방식이 맞습니다. 현재 특정 페이지(`GroupStudy`)에 종속된 소켓 연결을 **앱 전체(`App` 레벨) 혹은 전역 스토어(Zustand)**로 끌어올리는 것입니다.

이렇게 하면 **"방에 입장한 상태"**가 **"특정 URL에 있는 상태"**와 분리됩니다.

#### 🏗️ 구조적 변화 (Architecture Shift)

**AS-IS (현재 구조)**

1. 유저가 `/group-study`에 들어감.
2. `GroupStudy` 컴포넌트가 마운트됨.
3. `useSocket`이 실행되어 소켓 연결.
4. 유저가 `/timer`로 이동 -> `GroupStudy` 언마운트 -> **소켓 끊김.** ❌

**TO-BE (제안하는 구조)**

1. 유저가 `/group-study`에서 "입장" 버튼을 누름.
2. **전역 스토어(Zustand)**의 `socketStore.connect()` 함수가 실행됨.
3. 소켓이 연결되고, `isConnected: true` 상태가 전역에 저장됨.
4. 유저가 `/timer`로 이동 -> 컴포넌트는 바뀌지만 **전역 스토어는 살아있음.** -> **소켓 유지됨.** ⭕
5. "나가기" 버튼을 명시적으로 눌러야 `socketStore.disconnect()`가 실행됨.

---

### 🛠️ 구현 난이도와 고려사항

구현 난이도는 **"중(Middle)"** 정도입니다. 소켓 자체를 옮기는 건 쉽지만, **UI 처리가 핵심**입니다.

#### 1. Zustand Store에 Socket 저장하기 (가능!)

Socket 객체는 직렬화(JSON.stringify)가 안 되는 복잡한 객체지만, Zustand는 함수나 클래스 인스턴스도 상태로 저장할 수 있습니다.

```typescript
// store/useSocketStore.ts (예시)
import { create } from "zustand";
import { io, Socket } from "socket.io-client";

interface SocketState {
  socket: Socket | null;
  isInRoom: boolean;
  connect: (url: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isInRoom: false,
  connect: (url) => {
    const socket = io(url);
    // 소켓 이벤트 리스너 등록 등...
    set({ socket, isInRoom: true });
  },
  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isInRoom: false });
  },
}));
```

#### 2. "미니 위젯" (Floating Bar) 필수

유저가 `/timer` 페이지로 이동했을 때, 자신이 여전히 방에 연결되어 있다는 것을 알아야 합니다.
따라서 **`App.tsx` 레벨(최상위)**에 조건부 렌더링되는 컴포넌트가 필요합니다.

```tsx
// App.tsx
function App() {
  const { isInRoom } = useSocketStore();

  return (
    <Router>
      <Routes>{/* ... 기존 라우트들 ... */}</Routes>

      {/* 방에 참가 중인데, 현재 화면이 방이 아니라면 하단에 미니 바 표시 */}
      {isInRoom && <FloatingRoomStatus />}
    </Router>
  );
}
```

- **FloatingRoomStatus:** "현재 OOO 방에 접속 중 [음소거] [나가기] [방으로 돌아가기]" 버튼이 있는 하단 바.

---

### ⚖️ 장단점 분석

**장점:**

1.  **자유도 급상승:** 유저가 타이머 설정을 바꾸러 가거나, 통계를 확인하러 가도 공부방 연결이 끊기지 않습니다. (실제 도서관에서 화장실 다녀오는 느낌)
2.  **멀티태스킹:** 다른 유저들의 공부하는 소음(ASMR)을 들으면서 내 할 일 관리(Todo)를 할 수 있습니다.

**단점 (및 해결책):**

1.  **카메라 처리:** `/timer` 페이지로 가면 내 비디오를 보여주는 `<video>` 태그가 사라집니다.
    - _해결:_ `MediaStream`(내 캠 화면 데이터)도 전역 스토어에 저장해둬야 합니다. 그래야 페이지를 이동해도 송출이 멈추지 않습니다.
    - _주의:_ 안 쓰는 비디오 트랙을 끄지 않도록 `useEffect`의 cleanup 함수(`return () => track.stop()`) 관리를 잘해야 합니다. (컴포넌트가 사라져도 트랙은 끄지 말아야 함)

### 🚀 결론

**"어색한 디자인"이 아니라 "고급 기능"입니다.**
구현 난이도가 아주 높지 않으니, 지금 단계에서 **Socket과 MediaStream 관리를 Zustand(전역)로 빼는 방향**으로 설계하시는 것을 강력 추천합니다.

지금 바로 `useSocket.ts` 훅을 **Zustand Store**로 변환하는 것부터 시작해볼까요?

## A - Sonnet 4.6

### 현재 구조 파악

`useSocket()`의 `useEffect` cleanup (`return () => { socketInstance.disconnect() }`)이 `GroupStudy` 컴포넌트 unmount 시 실행되면서 socket을 끊음. React Router에서 `/group-study` 경로를 벗어나면 `GroupStudy`가 unmount → socket disconnect 발생하는 구조.

추가로 `Room.tsx`에도 unmount 시 자동으로 `LEAVE_ROOM`을 emit하는 cleanup이 있음:

```ts
return () => {
  if (socketRef.current && isRoomJoinedRef.current && !hasLeftRoomRef.current) {
    socketRef.current.emit(EventNames.LEAVE_ROOM); // Room URL을 벗어나면 자동 퇴장
  }
};
```

### 두 가지 옵션

#### Option A: Socket만 global로 올리기 (권장)

socket을 `App.tsx` 레벨의 React Context로 올림.

- `/timer`, `/statistics` 어디를 가든 socket 연결 유지
- 서버의 socket.io room membership 유지 (방에 "존재"는 함)
- **단, `/group-study/room/:roomId`에서 벗어나면 Room 컴포넌트가 unmount → mediasoup 트랜스포트가 닫힘 → 화면 공유는 끊김**

이 trade-off는 competitive room 용도로는 수용 가능. "방에 presence는 있지만 화면 공유는 잠깐 꺼진" 상태. 채팅은 socket 이벤트 기반이라 계속 동작함.

#### Option B: WebRTC 상태 전체를 global로 (난이도 높음)

socket + device + 트랜스포트 + producer/consumer 모두 global Context로 올림. 화면 공유도 유지됨. 구현 복잡도가 크게 올라감.

### Option A 구현 시 수정해야 할 것

**1. `Room.tsx` 자동 LEAVE_ROOM cleanup 제거**

Room URL을 벗어나도 방을 나가지 않게 하려면 위의 자동 emit 코드를 제거해야 함. `leaveRoom()` 버튼 클릭만이 유일한 퇴장 경로가 됨.

**2. 전역 `isInRoom`, `currentRoomId` 상태 필요**

Room으로 돌아왔을 때 컴포넌트가 다시 mount됨. 현재 코드는 mount 시 무조건 `JOIN_ROOM`을 emit하는데, 이미 서버에서 join된 상태라면 중복 join 발생. "이미 join됨" 여부를 global state로 추적해야 함.

**3. `GroupStudy.tsx`의 device 로딩도 같이 올려야 함**

`/group-study`를 벗어나면 `GroupStudy`도 unmount되어 device가 사라짐. device와 `isDeviceLoaded`도 global로 올려야 함.

### 전역으로 올릴 상태 목록

```
global Context (또는 Zustand):
  socket, connected         ← 핵심
  isInRoom, currentRoomId   ← 재진입 처리용
  device, isDeviceLoaded    ← GroupStudy unmount 대응
```

### Gemini 답변에 대한 보충

Zustand를 쓰는 방향은 좋음. 다만 "MediaStream도 전역으로" 부분은 Option A 범위에서는 불필요함. 화면 공유 트랙은 `Room` 컴포넌트 안에서만 의미가 있고, Room을 벗어나면 어차피 UI가 없어서 굳이 유지할 이유가 없음. Option B(트랜스포트 전체 global)를 선택할 때 비로소 필요한 고려사항.

**FloatingRoomStatus 위젯** 아이디어는 UX상 반드시 필요한 부분. `isInRoom === true`인데 현재 URL이 `/group-study/room/:roomId`가 아닐 때 하단에 "OOO 방 접속 중 | 돌아가기 | 나가기" 바를 보여주면 됨.

### 구현 난이도

Option A 기준 **중간**. 상태를 위로 올리는 refactoring이 주된 작업이고, 새로운 로직을 짜는 것보다는 기존 코드를 재배치하는 작업에 가까움.

## A - Opus 4.6

### 현재 상태

- `useSocket()` 훅이 `GroupStudy` 컴포넌트 안에서 호출됨
- `GroupStudy`는 `/group-study/*` 라우트에만 마운트됨
- `/timer`나 `/settings`로 이동하면 `GroupStudy`가 언마운트 → `useEffect` cleanup으로 **소켓 disconnect**
- 소켓은 React Router의 `Outlet context`로만 하위 컴포넌트에 공유됨

**결론:** `/group-study`를 벗어나면 무조건 소켓이 끊김

### 핵심: 소켓 lifecycle을 React 컴포넌트 트리에서 분리

- 이미 **Zustand**을 글로벌 상태 관리로 쓰고 있으므로, 소켓도 Zustand store에 넣으면 자연스럽게 글로벌화 가능
- `useEffect` cleanup에 의존하지 않고, 명시적 `leave` 액션에서만 disconnect
- Zustand store는 React 바깥에서도 `getState()`/`setState()`로 접근 가능하므로 소켓 인스턴스를 담기에 적합

### 접근 방식

1. **`socketStore` (Zustand)** 새로 만들기 — `socket`, `connected`, `currentRoomId` 상태 + `connect()`, `disconnect()`, `leaveRoom()` 액션
2. **소켓 연결 시점**을 `GroupStudy` 컴포넌트가 아닌, **방에 join할 때** (또는 group-study 진입 시) store 액션으로 수행
3. **소켓 해제 시점**을 컴포넌트 언마운트가 아닌, **명시적 leave 버튼** 클릭 시에만 수행
4. 기존 `useConnectionInfoContext()`를 쓰는 컴포넌트들은 점진적으로 store에서 읽도록 전환

### 고려할 점

- **MediaStream/Device도 같이 글로벌화해야 할 수 있음** — 현재 `GroupStudy`에서 함께 관리 중
- **브라우저 탭 닫기/새로고침** 시에는 어차피 소켓이 끊기므로 서버 쪽에서 graceful disconnect 처리 필요
- **competitive room에서 타이머 페이지로 이동** 시, 화면 공유 stream은 유지할지 중단할지 결정 필요 (카메라를 계속 켜둘 건지)

### 구현 난이도

**중간**. Sonnet 답변과 동일한 판단 — 기존 코드의 상태 끌어올리기(lifting state up) 리팩토링이 주된 작업.

## Q - 확장성?... 업계에서 자주 사용되는 패턴 비스무리하게 뻗어나갈 수 있을까?

▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

> 이렇게 하면 pip인가 뭔가도 가능한거야?... 아무튼... socket만 옮기면 안되지만 mediasoup에서
> 제공하는 것들 즉 webRTC web api interface instances에 대한 wrapper들 많잖아, 예를 들면,
> transport이나 producer, consumer같은 것들... 이런것들을 옮겼을때에 한해서 네가 아까 말한 요즘
> 권장되는 패턴에 맞는거야? pip나 뭐 이런거 사용할 수 있는? discord나 google meet에서도 비슷하게
> 하는거야?

## A - Gemini

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Responding with gemini-3-pro-preview
✦ 네, 정확합니다! 사용자님의 직관이 100% 맞습니다.

단순히 socket 객체 하나만 옮기는 것으로는 부족하고, 말씀하신 대로 WebRTC와 관련된 핵심
인스턴스들(Mediasoup Device, Transports, Producers, Consumers, MediaStream)이 전부 컴포넌트의
생명주기(Lifecycle)에서 벗어나 전역으로 관리되어야 진정한 "끊김 없는 경험"과
PiP(Picture-in-Picture) 같은 기능이 가능해집니다.

Discord나 Google Meet, Zoom 웹 버전이 바로 이 방식을 사용합니다.

### 1. 왜 Socket만으로는 안 되나요?

React 컴포넌트(Room.tsx) 안에서 useEffect로 스트림을 얻거나 Transport를 생성했다고 가정해 봅시다.

- 상황: 사용자가 /group-study에서 /timer로 페이지를 이동합니다.
- 결과: Room.tsx 컴포넌트가 Unmount(파괴)됩니다.
  - 이때 컴포넌트 내부의 변수들이 사라집니다.
  - 보통 useEffect의 cleanup 함수(return () => { ... })에서 transport.close(),
    stream.getTracks().forEach(t => t.stop()) 등을 실행하게 짜여 있기 때문에, 소켓이 살아있어도
    미디어 연결은 다 끊겨버립니다.

### 2. Discord/Google Meet의 아키텍처 (Headless Service 패턴)

이들은 "UI(보이는 것)"와 "Logic(통신하는 것)"을 완벽하게 분리합니다.

- UI Layer (React Component):
  - 단순히 데이터를 가져와서 화면에 뿌려주는 껍데기입니다.
  - 페이지가 바뀌면 없어졌다가 다시 생깁니다.
- Service Layer (Global Store / Singleton Class):
  - 여기에 Socket, Mediasoup Device, SendTransport, RecvTransport, Producer(내 마이크/캠),
    Consumer(상대방 스트림)가 모두 살고 있습니다.
  - 이 레이어는 앱이 켜질 때 생성되고, 앱이 꺼질 때까지 절대 죽지 않습니다.

### 이렇게 구현했을 때 가능한 시나리오:

1.  페이지 이동 간 통화 유지:
    - /group-study에서 /timer로 이동해도 Service Layer는 살아있으므로, 오디오/비디오 패킷은 계속
      주고받습니다.
2.  In-App PiP (내부 미니 플레이어):
    - /timer 페이지 하단에 작은 <MiniPlayer /> 컴포넌트를 띄웁니다.
    - 이 컴포넌트는 Service Layer(전역 스토어)에서 remoteStream을 가져와서 <video> 태그에 연결만
      하면 됩니다.
    - 결과: 타이머를 설정하면서 친구들 공부하는 모습을 작은 화면으로 볼 수 있습니다.
3.  Browser Native PiP:
    - Chrome 등 브라우저 자체에서 지원하는 "항상 위에 고정" 기능입니다.
    - 이것도 전역 스토어에 비디오 엘리먼트(ref)나 스트림이 살아있어야,
      명령(video.requestPictureInPicture())을 내릴 수 있습니다.

4.  정리: 옮겨야 할 핵심 객체들

**Zustand Store(혹은 별도의 Class)에 담아야 할 것들은 다음과 같습니다.**

┌───────────────┬────────────────────────────────────┬───────────────────────────────────────┐
│ 객체 │ 설명 │ 이동 필수 여부 │
├───────────────┼────────────────────────────────────┼───────────────────────────────────────┤
│ Socket │ 신호 주고받기 │ ✅ 필수 │
│ Device │ Mediasoup 클라이언트 기기 정보 │ ✅ 필수 │
│ SendTransport │ 내 영상/소리를 보내는 통로 │ ✅ 필수 │
│ RecvTransport │ 남의 영상/소리를 받는 통로 │ ✅ 필수 │
│ Producer │ 내 마이크/카메라 트랙 제어자 │ ✅ 필수 (그래야 음소거 유지됨) │
│ Consumers │ 상대방들 트랙 (Map 형태) │ ✅ 필수 (그래야 화면이 안 끊김) │
│ LocalStream │ getUserMedia로 얻은 내 원본 스트림 │ ✅ 필수 (페이지 이동 시 캠 꺼짐 방지) │
└───────────────┴────────────────────────────────────┴───────────────────────────────────────┘

🚀 결론 및 추천

사용자님께서 구상하신 "경쟁방(각자 타이머)과 자유방의 공존"을 위해서라면, 이 전역 상태 관리 패턴이
가장 확실한 해결책입니다.

구현 난이도는 조금 올라가지만(상태 관리가 복잡해짐), 한 번 구조를 잡아두면:

1.  어떤 페이지를 가도 통화가 유지되고,
2.  원하는 곳 어디에나 비디오를 띄울 수 있고,
3.  Discord처럼 매끄러운 UX를 만들 수 있습니다.

지금 바로 이 구조로 리팩토링/설계를 시작하는 것이, 나중에 코드가 꼬이는 것을 방지하는 최고의
선택입니다.

---
