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

- Configure a cycle consisting of pomodoros and breaks, and measure each session.
- Provide visual feedback through a timeline.
- Automatic start of the next session.
- Weekly statistics available on the Statistics page.
- Create categories to distinguish sessions.
- Track statistics by category.
- Pause tracking and measure the time spent paused.
  - Display pauses in the timeline for feedback.
- Navigate freely between `/timer`, `/statistics`, and `/settings` during a session.

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

The second graph displays only the statistics for the `uncategorized` session.  

![same-week-1](https://github.com/user-attachments/assets/1826ae0c-2dc1-4897-a721-7409f5805aa8)

The second graph shows `Documentation` and `Features & Debugging`.  
![same-week-2](https://github.com/user-attachments/assets/e54e771b-977f-44ba-9961-4f4bfb6ca554)

The second graph shows `uncategorized` and `Job Search and Application`.  
![same-week-3](https://github.com/user-attachments/assets/05acebf2-d924-4546-9ba8-963ed9566a62)

#### Two Graphs Displaying Data from Different Weeks

First graph - `9.9 ~ 9.15`, second graph - `9.2 ~ 9.8`.  
![diff-week-data](https://github.com/user-attachments/assets/53c46e3f-1d5f-4add-be28-107f359eee2c)

First graph - `9.2 ~ 9.8`, second graph - `9.9 ~ 9.15`.  
![diff-week-data-2](https://github.com/user-attachments/assets/49b72959-71d4-49ef-a9bd-da9212b55ad9)

#### Mouse Hover Over Each Graph

![hover-over-first](https://github.com/user-attachments/assets/9bd0a235-ca67-4038-a58e-0a2d5f58ed61)  
![hover-over-second](https://github.com/user-attachments/assets/9c6cd9d6-d0df-4dd8-807e-64c971cf7c90)

### `/settings`

![settings](https://github.com/user-attachments/assets/cdf46e6f-0b21-4480-b531-f0d9b07ec154)  
![small-width-in-settings](https://github.com/user-attachments/assets/649db24e-b76a-4192-b193-4e4204984e7d)

---

## Further Info - [pomodoro-doc](https://pomodoro-doc.vercel.app/)

Short demo videos are available to show how the features work.
