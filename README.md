# [Pomodoro Timer](https://pomodoro-yhs.vercel.app) - web application

## 목차

- [**Intro**](#intro)

- [**Tech Stack**](#tech-stack)
- [**Architecture**](#architecture)
- [**주요 기능들**](#주요-기능들)
- [**어려웠던 점들**](#어려웠던-점들)
- [**How to run locally**](#how-to-run-locally)

<br>

## Intro

[pomodoro technique](https://en.wikipedia.org/wiki/Pomodoro_Technique)을 기반으로 하는 공부 & 작업 시간 측정 App입니다. 인터벌 트레이닝과 비슷한 개념으로, 한 사이클의 작업 시간을 여러 개의 작업 세션들과 그에 뒤따르는 짧은 휴식 그리고 다음 사이클 시작 전의 마지막 긴 휴식으로 나누어 높은 집중력을 유지하는 데 도움을 줍니다.

(작업시간을 보통 pomodoro or pomo라고 부릅니다).

`One cycle == (pomo + short break) * number of pomos + long break`

### Pages
**`/timer`**
![image](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/d3d27254-f413-46aa-9bca-8f9b2e7bd0d9)  

**`/statistics`**
![image](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/5cd50e83-e2ac-456d-97b6-9f907775f599)  

**`/settings`**
![image](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/7cac16cc-805c-407a-9044-530c268bc6d9)

<br>

## Tech stack

- **React** v18.2.0
- **[React Router Dom](https://www.npmjs.com/package/react-router-dom?activeTab=readme)** v6.3.0
- **[Axios](https://www.npmjs.com/package/axios)** v0.27.2
- **[Firebase](https://www.npmjs.com/package/firebase)** v9.8.4
- **[Date-fns](https://www.npmjs.com/package/date-fns)** v2.29.3
- **[Styled Components](https://www.npmjs.com/package/styled-components)** v5.3.5
- **[Recharts](https://www.npmjs.com/package/recharts)** v2.1.14

- **[Firebase Admin](https://www.npmjs.com/package/firebase-admin)** v11.0.0
- **[Express](https://www.npmjs.com/package/express)** v4.18.1
- **[Mongoose](https://www.npmjs.com/package/mongoose)** v6.4.3
- **[MongoDB Atlas](https://www.mongodb.com/atlas/database)**
- **Node js** v20.10.0

<br>

## Architecture

![architecture](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/fc6c8cdf-9dc0-47a4-9b18-9d2ab1bd819a)


<br>

## 주요 기능들

- [Firebase Authentication](#firebase-authentication)

- [Settings](#settings)
- [Timer](#timer)
- [타임라인뷰](#타임라인뷰)
- [통계](#통계)
- [예외적인 상황에 대비](#예외적인-상황에-대비)

<br>

### [Firebase Authentication](https://firebase.google.com/docs/auth)

#### Google Sign-in 과 Delete Account

[deleteAndRe-sign-in.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/b6d4618c-f074-4a6a-af72-0809a8725166)

---

<br>


### Settings

다음과 같은 (반복되는) 한 사이클을 구성하는 값들을 설정할 수 있습니다 - pomo(doro) duration, short break and long break duration, number of pomos.
Pomodoro와 break 각각에 대해 자동 시작 설정을 할 수 있습니다.
Demo 데이터를 생성 그리고 지울 수 있고, 계정 삭제도 이 페이지에서 할 수 있습니다.

![settings](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/30b5dc11-8b6a-44f8-9593-c448f200bc81)

---

<br>

### Timer

#### 시간 카운트 다운과 일시 정지

Pomodoro와 Break 세션 모두 중간에 일시 정지할 수 있습니다.

pomodoro

[pomo.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/b90f5f98-65bb-4b39-88bc-2776263e7f78)

break

[break.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/c5628fbb-c2d2-43d3-9e28-a5c4cdb61e2e)

<br>

#### 자동시작

한 사이클 내의 첫 pomodoro session을 제외한 모든 세션들은 자동 시작될 수 있습니다. 즉, 한 사이클이 끝났을 때, 다음 사이클이 자동 시작되지는 않습니다.

[auto-start-re.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/efd245af-0eb5-4d8c-bea4-652064b44800)

<br>

#### Notification and click to focus

![noti](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/e3e670c3-cf39-4d76-a558-eb8aafba42df)

---

<br>

### 타임라인뷰

#### 시각적 피드백

- 기존에 나와있는 [포모도로 웹앱](https://pomofocus.io)을 사용할 때, 현실적으로 중간에 일시 정지하는 경우가 있는데, **얼마나 오랫동안 일시 정지하였는지** 보여 주는 기능이 없었습니다. 그래서 당일 데이터에 한해서 얼마나 세션을 효율적으로 보냈는지를 시각적으로 피드백해주는 기능을 만들었습니다.
- **선홍색, 녹색, 노란색** 박스들이 각각 pomodoro, break, pause를 나타냅니다.
- 마우스 **스크롤**과 좌 클릭 한 상태에서 **drag and relase**하는 방식으로 timeline을 이동시킬 좌우로 이동시킵니다.
- 각 박스들 **아래로 내려와서 좀더 짙은** 색 부분에 마우스 클릭을 하면 디테일한 정보를 확인 할 수 있습니다.

[timeline-main-feature.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/87fa3130-5baf-4e1b-b5c8-3a2a0b09321d)

<br>

#### 반응형 디자인

탭의 너비 변화에 따라 3단계로 시간 눈금의 크기가 조정됩니다. 그 효과로, 앱을 작은 화면으로 띄웠을 때 충분히 많은 시간대를 timeline에서 눈으로 확인할 수 있습니다.

[responsive-timeline.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/5d8482f9-8e1e-4393-a766-14ca06c9ce4c)

---

<br>

### 통계

pomodoro session에 대한 통계를 제공합니다.

![show-stat-page](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/eb8e1818-d9f3-4ceb-8a47-839473674a94)

#### Modal대신 한 페이지에 배치

답답한 느낌이 덜 들도록 modal보다는 한 페이지 자체에서 통계를 확인할 수 있도록 했습니다.

[기존에 제가 가끔씩 사용하던 앱](https://pomodor.app/) [^1]에서도 통계를 따로 한 페이지에 배치했지만 세션 진행 중에 다른 페이지로 이동이 불가능하게 설정되어 있었습니다. 이 부분이 답답해서 이 앱에서는 세션 진행 중에도 페이지간 이동이 가능하도록 구현하였습니다.

Timer가 보이는 **`\timer` 페이지 이외의 page**에서도 타이머는 돌아갑니다.
e.g) Statistics page에서 pomodoro session의 완료가 그래프에 즉각 반영되는 경우 그리고 Settings page에서 pomodoro session이 종료되는 경우.

[pomoEnd-in-other-pages.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/21c1765e-e469-4c8c-ac84-fcd89d902ba1)

<br>

#### 데모 데이터

이 앱을 처음 사용하는 유저는 데모 데이터를 만들어서 통계 그래프가 어떻게 그려지는지 즉각 확인할 수 있습니다.

[demo-data.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/83c3f296-7a43-4cee-9d65-97e2d7612b70)

---

<br>

### 예외적인 상황에 대비

**실수로 브라우저를 종료하거나 컴퓨터가 종료되어도**, 다시 앱을 열면 데이터 누락 없이 세션을 이어서 진행할 수 있습니다.

[authUser-close-app.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/82860477-2ba0-4a40-8f1e-b9ec272ef0e6)

**인터넷이 불안정하여 끊기는 경우** 데이터 누락 없이 계속 이어서 타이머를 진행시킬 수 있습니다. [^2]

[disconnection-while-timer-is-running.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/c53516ab-1a16-4a25-9922-e4ea758bec4d)


<br>

## 어려웠던 점들

### 1. **Session이 `/timer` 이외의 다른 페이지들 즉, `/stat`과 `/settings`에서도 진행 그리고 종료될 수 있도록 하는 것**

**A**. Timer를 돌리는 데 관여하는 states들을 indexed DB에 저장하고, 다른 페이지로 넘어가면 index.tsx파일에서 그 값들을 받아와서 count down 합니다.
다시 `/timer`로 돌아올 때, indexed DB에 있는 값들을 Timer와 PatternTimer의 states들의 초깃값으로 설정하여, 남아 있는 시간이 즉각 UI에 반영되게 하였습니다.

**B**. `/statistics`에서 pomo session이 종료될 때, 그 값을 통계 그래프에 곧바로 반영하기 위해 pusub pattern을 사용했습니다.

**A**.
![스탯으로 이동후 다시 타이머로 무브백](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/435773c7-a742-4c71-b6c6-fcedcac5544e)

**B**.
![스탯으로 이동후 세션 종료](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/c146532e-f4c5-45c5-a16f-c74333aeb3f3)

<br>

### 2. **로그아웃할 때, 새로고침 하지 않기**

사용자가 로그아웃하면, 타이머를 리셋하여 로그인하지 않은 사용자가 default setting[^3]에서부터 시작할 수 있게 해야 합니다. 이전에 제가 자주 사용하던 앱에서는 [다음처럼](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/8e2d60ff-7b92-4645-a6b4-9a87d67fa812) 로그아웃 시 app이 reload 되면서 HTTP Request를 발생시켰습니다. 제 앱에서는 reload 하지 않고 타이머를 reset 하는 방법을 시도해 봤습니다. 

[PatternTimer](https://github.com/Yonghwan-Song/pomodoro/blob/37af9673594052b7960bfbaf23c4d54f2463953a/client/src/Components/PatternTimer/PatternTimer.tsx#L39-L54)와 [Timer](https://github.com/Yonghwan-Song/pomodoro/blob/37af9673594052b7960bfbaf23c4d54f2463953a/client/src/Components/Timer/Timer.tsx#L75-L82)의 state들이 Timer UI에 어떤 값들을 보여줄지를 결정합니다. 그래서 로그아웃 시 이 component들의 side effect를 이용해 state들을 default 값으로 재설정하려 했습니다. 그런데 기존에 이 component들에 존재하던 useEffect()들이 많았다는 점과 테스트 자동화가 이루어지지 않았던 점 때문에 useEffect를 이용해서 기능 구현하는 데에는 한계가 있었습니다.

그래서 PatternTimer와 Timer는 그대로 두고, 이름은 다르지만, 내용은 같은 [PatternTimerVVV](https://github.com/Yonghwan-Song/pomodoro/blob/37af9673594052b7960bfbaf23c4d54f2463953a/client/src/Components/PatternTimer/PatternTimer_v.tsx#L39-L54)와 [TimerVVV](https://github.com/Yonghwan-Song/pomodoro/blob/37af9673594052b7960bfbaf23c4d54f2463953a/client/src/Components/Timer/Timer_v.tsx#L75-L82)를 만들어서 로그아웃 했을 때, [toggle state](https://github.com/Yonghwan-Song/pomodoro/blob/37af9673594052b7960bfbaf23c4d54f2463953a/client/src/Pages/Main/Main.tsx#L30) 을 이용해서 아예 타이머를 돌리는 데 필요한 데이터 자체를 완전히 교체할 수 있도록 했습니다. Toggle을 하면 현재 올라와 있는 타이머 component들은 unmount되고 새 데이터를 prop을 받는 타이머 component들을 마운트됩니다. 아래의 코드는 `toggle` state를 prop으로 받는 `TogglingTimer` component의 정의입니다.
```tsx
type TogglingTimerProps = {
  toggle: boolean; //<--------------
  statesRelatedToTimer: TimersStatesType | {};
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
};
export default function TogglingTimer({
  toggle, //<--------------
  statesRelatedToTimer,
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
  setRecords,
}: TogglingTimerProps) {
  return (
    <>
      {toggle ? (  //<-----------------
        <PatternTimer
          statesRelatedToTimer={statesRelatedToTimer}
          pomoDuration={pomoDuration}
          shortBreakDuration={shortBreakDuration}
          longBreakDuration={longBreakDuration}
          numOfPomo={numOfPomo}
          setRecords={setRecords}
        />
      ) : (
        <PatternTimerVVV
          statesRelatedToTimer={statesRelatedToTimer}
          pomoDuration={pomoDuration}
          shortBreakDuration={shortBreakDuration}
          longBreakDuration={longBreakDuration}
          numOfPomo={numOfPomo}
          setRecords={setRecords}
        />
      )}
    </>
  );
}
```

결과적으로, 로그아웃 후 HTTP request를 발생시키지 않고 로그인하지 않은 사용자가 앱을 사용할 수 있도록 [default setting을 이용한 타이머 UI를 render할 수 있었습니다](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/b6f5b4b9-698c-4ed6-8bd4-58af13ae9712).

<br>

## How to run locally

```bash
git clone https://github.com/Yonghwan-Song/pomodoro.git
cd pomodoro
git checkout local
cd client
npm install
npm start
```



[^1]: Currently the app does not have the statistics feature anymore.
[^2]: [관련 issue](https://github.com/Yonghwan-Song/pomodoro/issues/37)
[^3]: `(25min + 5min) * 4 + 15min <= (pomo + shortBreak) * numberOfPomos + longBreak`
