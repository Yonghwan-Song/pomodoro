<!-- # [Pomodoro Timer Web App](https://pomodoro-iota-three.vercel.app/)

![pomo-timer](https://user-images.githubusercontent.com/72689705/200711638-eabcbf53-c4cf-4712-9c1d-d0a5883ee0fa.png)

## Description

This is a study timer using the idea of [pomodoro technique](https://en.wikipedia.org/wiki/Pomodoro_Technique). Users can set their own pomodoro duration and break durations. One cycle consists of `(pomo + short break) * number of pomos + long break`.

### Stat

![pomo-stat](https://user-images.githubusercontent.com/72689705/200711062-3718ab4d-e360-43ef-a05c-63eda3f28c25.png)

### Demo data is provided

Users can see how they can get stat about their focus duration using demo data.
Users can create and delete the demo data in the setting.
![demo-data](https://user-images.githubusercontent.com/72689705/200711204-247db8a7-825e-4bb9-8451-f33ee215fc7e.gif) -->

# [Pomodoro Timer](https://pomodoro-j7cd41zkf-yhs.vercel.app) - web application

This is a study timer app developed with React and Node js.

## Table of contents

- [Description](#description)
- [Tech stack](#tech-stack)
- [How to run locally](#how-to-run-locally)

## Description

This is a study timer using the idea of [pomodoro technique](https://en.wikipedia.org/wiki/Pomodoro_Technique). Users can set their own pomodoro duration and break durations. One cycle consists of `(pomo + short break) * number of pomos + long break`.

### Stat

![pomo-stat](https://user-images.githubusercontent.com/72689705/200711062-3718ab4d-e360-43ef-a05c-63eda3f28c25.png)

### Demo data is provided

Users can see how they can get stat about their focus duration using demo data.
Users can create and delete the demo data in the setting.

![demo-data](https://user-images.githubusercontent.com/72689705/200711204-247db8a7-825e-4bb9-8451-f33ee215fc7e.gif)

## Tech stack

Project is created with:

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

- **Node js** v18.12.1

## How to run locally

```bash
git clone https://github.com/Yonghwan-Song/pomodoro.git
cd pomodoro
git checkout local
cd server
npm install
npm start
# open a new pane in the terminal
# and then in the server directory
cd ../client
npm install
npm start
```
