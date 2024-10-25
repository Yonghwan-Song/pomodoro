# Overview of [Pomodoro Timer](https://www.pomodoroaid.online)

## 개념

[pomodoro technique](https://ko.wikipedia.org/wiki/%ED%8F%AC%EB%AA%A8%EB%8F%84%EB%A1%9C_%EA%B8%B0%EB%B2%95)을 기반으로 하는 공부 & 작업 시간 측정 App입니다. 한 사이클의 작업 시간을 여러 개의 작업 세션들과 그에 뒤따르는 짧은 휴식 그리고 다음 사이클 시작 전의 마지막 긴 휴식으로 나누어 높은 집중력을 유지하는 데 도움을 줍니다.
(작업 시간을 pomodoro 또는 pomo라고 부릅니다).

`One cycle == (pomo + short break) * number of pomos + long break`

## 만들게 된 계기

원래 사용하던 앱이 있었는데, 일시 정지를 한 번 했을 때 얼마 동안 했는지 기록이 안 되어서, 그것을 계기로 내가 원하는 기능들을 추가하면서 배워보자는 생각으로 만들기 시작했습니다.

## 기술 스택

### 프론트엔드

- React(with TypeScript), React Router DOM, Axios, Firebase Authentication, Styled Components

### 백엔드

- NestJS, Express (구 서버), Firebase Admin, MongoDB Atlas, Mongoose

### 호스팅

- Vercel - React app
- Render.com - API server

## 기능 요약

- 포모도로와 휴식으로 구성된 한 사이클에 대한 설정 및 각 세션의 측정
- 타임라인을 통해 시각적 피드백 제공
- 자동 시작
- Statistics 페이지에서 주간 통계 제공
- 세션을 구분하기 위한 카테고리 생성
- 카테고리별 통계
- 일시 정지 및 정지한 시간 측정
  - 한 세션에서 한 일시 정지들을 타임라인에 그려서 피드백 제공
- 세션 진행 도중 `/timer`, `/statistics`, 그리고 `/settings` 페이지 간 자유롭게 이동 가능

## 아키텍처

[![architecture](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/fc6c8cdf-9dc0-47a4-9b18-9d2ab1bd819a)](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/fc6c8cdf-9dc0-47a4-9b18-9d2ab1bd819a)

## Page Screenshots

아래는 각 페이지의 간단한 스크린샷이며, 구체적인 기능 설명은 다음 섹션인 'Features'에서 다루겠습니다.

### `/timer`

![timer-one-cate](https://github.com/user-attachments/assets/1207ac21-0d78-4b97-ae19-5c983a3410f4)

세션 진행 도중에 카테고리 바꾼 경우.

![timer-two-cate](https://github.com/user-attachments/assets/188b083f-3549-4791-8996-4d5cb84254ae)


타임라인  
<img width="1984" alt="timeline" src="https://github.com/user-attachments/assets/036e495b-039e-4a1d-a7c9-c0c3b0278ab4">


### `/statistics`

#### Total Graph and Category graph

두번째 그래프에 `uncategorized`만 그려짐.  

![same-week-1](https://github.com/user-attachments/assets/1826ae0c-2dc1-4897-a721-7409f5805aa8)

두번째 그래프에 `Documentation` 와 `Features & Debugging`.  
![same-week-2](https://github.com/user-attachments/assets/e54e771b-977f-44ba-9961-4f4bfb6ca554)

두번째 그래프에 `uncategorized` 와 `Job Search and Application`.  
![same-week-3](https://github.com/user-attachments/assets/05acebf2-d924-4546-9ba8-963ed9566a62)

#### Two graphs show different week data

첫번째 - `9.9 ~ 9.15`, 두번째 - `9.2 ~ 9.8`.  
![diff-week-data](https://github.com/user-attachments/assets/53c46e3f-1d5f-4add-be28-107f359eee2c)

첫번째 - `9.2 ~ 9.8`, 두번째 - `9.9 ~ 9.15`.  
![diff-week-data-2](https://github.com/user-attachments/assets/49b72959-71d4-49ef-a9bd-da9212b55ad9)

#### Mouse hover over each graph

![hover-over-first](https://github.com/user-attachments/assets/9bd0a235-ca67-4038-a58e-0a2d5f58ed61)  
![hover-over-second](https://github.com/user-attachments/assets/9c6cd9d6-d0df-4dd8-807e-64c971cf7c90)



### `/settings`

![settings](https://github.com/user-attachments/assets/cdf46e6f-0b21-4480-b531-f0d9b07ec154)  
![small-width-in-settings](https://github.com/user-attachments/assets/649db24e-b76a-4192-b193-4e4204984e7d)

---

## Futher Info - [pomodoro-doc](https://pomodoro-doc.vercel.app/)
기능들이 실제로 어떻게 작동하는지 짧은 동영상을 만들어 놓았습니다.
