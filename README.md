# Overview of the [Pomodoro Timer](https://www.pomodoroaid.online)

## Concept

The app is based on the [Pomodoro technique](https://en.wikipedia.org/wiki/Pomodoro_Technique), designed to help users measure their study or work time. It divides one work cycle into multiple work sessions (called "pomodoros" or "pomos"), followed by short breaks, and concludes with a long break before the next cycle begins. This structure helps maintain high levels of focus.

`One cycle = (pomo + short break) * number of pomos + long break`

## Motivation

I initially used another app, but it didn’t record the elapsed time when I paused the timer. This limitation inspired me to create my own app, adding not only this feature but also other functionalities I wanted, while learning new skills.

## Tech Stack

### Frontend

- React, React Router DOM, Axios, Firebase Authentication
- React Inline Style, Styled Components
- TypeScript, Rechart, idb, date-fns

### Backend

- NestJS, Express
- Firebase Admin
- MongoDB Atlas, Mongoose, @nest/mongoose

### Hosting

- Vercel for the React app
- Render.com for the API server

## Features

- [Configure a cycle consisting of pomodoros and breaks, and measure each session.](https://pomodoro-doc.vercel.app/features#settings)
- [Provide visual feedback through a timeline.](https://pomodoro-doc.vercel.app/features#timeline)
- [Automatic start of the next session.](https://pomodoro-doc.vercel.app/features#autostart)
- [Weekly statistics available on the Statistics page.](https://pomodoro-doc.vercel.app/features#statistics)
- [Create categories to distinguish sessions.](https://pomodoro-doc.vercel.app/features#settings)
- [A single session can encompass work from multiple categories.](https://pomodoro-doc.vercel.app/features#categorized-sessions)
- [Track statistics by category.](https://pomodoro-doc.vercel.app/features#total-graph)
- [Pause tracking and measure the time spent paused.](https://pomodoro-doc.vercel.app/features#time-countdown-and-pause)
  - Display pauses in the timeline for feedback.
- [Navigate freely between `/timer`, `/statistics`, and `/settings` during a session.](https://pomodoro-doc.vercel.app/problem-solving#%ED%95%9C-%EC%84%B8%EC%85%98%EC%9D%B4-%EC%A7%84%ED%96%89-%EC%A4%91%EC%9D%BC-%EB%95%8Cpomo-or-break-%EA%B4%80%EA%B3%84%EC%97%86%EC%9D%B4-%EB%8B%A4%EB%A5%B8-%ED%8E%98%EC%9D%B4%EC%A7%80%EB%93%A4%EC%9D%84-%EC%9E%90%EC%9C%A0%EB%A1%AD%EA%B2%8C-%EB%B0%A9%EB%AC%B8%ED%95%A0-%EC%88%98-%EC%9E%88%EB%8F%84%EB%A1%9D-%ED%95%98%EB%8A%94-%EA%B2%83)

## Architecture

[![architecture](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/fc6c8cdf-9dc0-47a4-9b18-9d2ab1bd819a)](https://github.com/Yonghwan-Song/pomodoro/assets/72689705/fc6c8cdf-9dc0-47a4-9b18-9d2ab1bd819a)

## Page Screenshots

Below are simple screenshots of each page. For more detailed explanations of features, please refer to the link under the "Further Info" section.

### `/timer`

![timer-one-cate](https://github.com/user-attachments/assets/1207ac21-0d78-4b97-ae19-5c983a3410f4)

Changing categories during a session.

![timer-two-cate](https://github.com/user-attachments/assets/188b083f-3549-4791-8996-4d5cb84254ae)

Timeline view  
<img width="1984" alt="timeline" src="https://github.com/user-attachments/assets/036e495b-039e-4a1d-a7c9-c0c3b0278ab4">

### `/statistics`

#### Total Graph and Category Graph

The second graph displays only the statistics for the `Uncategorized` session.  
![same-w-1](https://github.com/user-attachments/assets/52449d64-4167-410c-b847-4e0b77940364)

The second graph shows `Documentation` and `Development`.  
![same-w-2](https://github.com/user-attachments/assets/4ea4546c-7e31-4013-a265-b363d3cf6dcd)


The second graph shows `Uncategorized` and `Job Search and Application`.  
![same-w-3](https://github.com/user-attachments/assets/76d276d9-872a-4f64-923c-bb9adc03aa2b)


#### Two Graphs Displaying Data from Different Weeks

First graph - `11.4 ~ 11.10`, second graph - `10.28 ~ 11.3`.  
![diff-w-1](https://github.com/user-attachments/assets/765d41a2-c553-49d6-bc5f-6e139050f366)

First graph - `10.28 ~ 11.3`, second graph - `11.4 ~ 11.10`.  
![diff-w-2](https://github.com/user-attachments/assets/1e853b36-ec59-49eb-8ffe-5e0dc8252451)


#### Mouse Hover Over Each Graph
![hover-1](https://github.com/user-attachments/assets/e4b2ff05-e107-43a9-a000-37d16cb1e615)  
![hover-2](https://github.com/user-attachments/assets/29de1b00-9b23-4882-8454-da11996c1c48)

### `/settings`

![settings](https://github.com/user-attachments/assets/cdf46e6f-0b21-4480-b531-f0d9b07ec154)  
![small-width-in-settings](https://github.com/user-attachments/assets/649db24e-b76a-4192-b193-4e4204984e7d)

---

## Further Info - [pomodoro-doc](https://pomodoro-doc.vercel.app/features)

Short demo videos are available to show how the features work.
