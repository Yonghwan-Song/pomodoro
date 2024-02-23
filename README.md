# [Pomodoro Timer](https://pomodoro-yhs.vercel.app) - web application

## 목차

- [주요 기능들](#주요-기능들)
- [Tech Stack](#tech-stack)
- [How to run locally](#how-to-run-locally)

## 주요 기능들

- [Firebase Authentication](#firebase-authentication)
- [Settings](#settings)
- [Timer](#timer)
- [타임라인뷰](#타임라인뷰)
- [통계](#통계)
- [특이한 상황에 대비](#특이한-상황에-대비)

### Firebase Authentication

#### Google Sign-in 과 Delete Account

[deleteAndRe-sign-in.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/b6d4618c-f074-4a6a-af72-0809a8725166)

### Settings

한 사이클은 여러개의 pomodoro session들로 구성될 수 있습니다. 각 pomodoro session이 끝나면 맨 마지막 턴을 제외하고 short break이 실행되고 가장 마지막 세션 다음에는 long break이 실행됩니다. long break을 기점으로 한 사이클이 마무리되고 다시 설정한 바와 같은 사이클이 계속 반복 됩니다.
`One cycle == (pomo + short break) * number of pomos + long break`

여기에서 Demo 데이터를 생성 그리고 지울 수 있고, 계정 삭제도 이 페이지에서 할 수 있습니다.

그리고 한 사이클 내에 한해 pomodoro나 break은 자동 시작될 수 있습니다. 다시 말해 다음 사이클은 자동으로 시작될 수는 없습니다.

![settings](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/30b5dc11-8b6a-44f8-9593-c448f200bc81)

### Timer

#### 세션 기록

Pomodoro세션과 Break 세션이 존재하고 두 세션 모두 중간에 일시정지 할 수 있습니다.

pomodoro

[pomo.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/b90f5f98-65bb-4b39-88bc-2776263e7f78)

break

[break.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/c5628fbb-c2d2-43d3-9e28-a5c4cdb61e2e)

#### 자동시작

[auto-start.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/3f7b7d6d-30c6-4539-ad41-8f20006d64ce)

#### Notification and click to focus

![noti](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/e3e670c3-cf39-4d76-a558-eb8aafba42df)

### 타임라인뷰

#### 시각적 피드백

- 기존에 나와있는 [포모도로 웹앱](https://pomofocus.io)을 사용할 때, 현실적으로 중간에 일시 정지하는 경우가 있는데, **얼마나 오랫동안 일시 정지하였는지** 보여 주는 기능이 없었습니다. 그래서 당일 데이터에 한해서 얼마나 세션을 효율적으로 보냈는지를 시각적으로 피드백 해주는 기능을 만들었습니다.
- **선홍색, 녹색, 노란색** 박스들이 각각 pomodoro, break, pause를 나타냅니다.
- 마우스 **스크롤**과 좌클릭 한 상태에서 **drag and relase**하는 방식으로 timeline을 이동시킬 좌우로 이동시킵니다.
- 각 박스들 **아래로 내려와서 좀더 짙은** 색 부분에 마우스 클릭을 하면 디테일한 정보를 확인 할 수 있습니다.

[timeline-main-feature.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/87fa3130-5baf-4e1b-b5c8-3a2a0b09321d)

#### 반응형 디자인

탭의 넓이에 따라 3단계로 눈금의 크기가 달라져서 앱을 작은 화면으로 띄웠을 때 충분히 많은 시간대를 볼 수 있습니다.

[responsive-timeline.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/5d8482f9-8e1e-4393-a766-14ca06c9ce4c)

### 통계

pomodoro session에 대한 통계를 제공합니다.

![show-stat-page](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/eb8e1818-d9f3-4ceb-8a47-839473674a94)

#### 모달 대신 한 페이지에 할당

답답한 느낌이 덜 들도록 modal보다는 한 페이지 자체에서 통계를 확인할 수 있도록 했습니다.

[기존에 제가 가끔씩 사용하던 앱](https://pomodor.app/)[^1]에서도 비슷하게 통계를 따로 한 페이지에 할당 했는데 안타깝게도 타이머를 돌리는 도중에 왔다갔다를 할 수 없도록 설정 되어있었습니다. 1)이부분이 답답해서 이 앱에서는 그 부분을 개선하여 왔다갔다 할 수 있도록 했습니다.

#### 데모 데이터

데모 데이터를 만들어서 통계 그래프가 어떻게 그려지는지 즉각 확인할 수 있습니다.

[demo-data.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/83c3f296-7a43-4cee-9d65-97e2d7612b70)

### 특이한 상황에 대비

1. **실수로 브라우저를 종료하거나 컴퓨터 종료**했을 때, 다시 웹페이지를 열면 데이터가 그대로 보존됩니다[^2].

[authUser-close-app.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/82860477-2ba0-4a40-8f1e-b9ec272ef0e6)

2. Timer가 보이는 **`\timer` 페이지 이외의 page**에서도 타이머는 돌아갑니다.
   e.g) Statistics page에서 pomodoro session의 완료가 그래프에 즉각 반영 그리고 Settings page pomodoro session이 종료되는 경우.

[pomoEnd-in-other-pages.webm](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/21c1765e-e469-4c8c-ac84-fcd89d902ba1)

## Tech stack

- **React** v18.2.0
- **React router dom** v6.3.0
- **Axios** v0.27.2
- **Firebase** v9.8.4
- **Date-fns** v2.29.3
- **Styled components** v5.3.5
- **Recharts** v2.1.14

- **Mongoose** v6.4.3
- **Express** v4.18.1
- **Firebase admin** v11.0.0

- **Node js** v20.10.0

## How to run locally

```bash
git clone https://github.com/Yonghwan-Song/pomodoro.git
cd pomodoro
git checkout local
cd client
npm install
npm start
```

[^1]: Currently the app does not have the statistics feature any more.
[^2]:
    [cache an
    d idb utilization](https://github.com/Yonghwan-Song/pomodoro/wiki/Design#cache-storage%EC%99%80-indexeddb%EB%A5%BC-%EC%95%B1%EC%97%90%EC%84%9C-%EC%96%B4%EB%96%BB%EA%B2%8C-%ED%99%9C%EC%9A%A9%ED%95%98%EA%B3%A0-%EC%9E%88%EB%8A%94%EC%A7%80%EC%97%90-%EB%8C%80%ED%95%B4)
