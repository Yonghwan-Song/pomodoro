import { useEffect, useState, useReducer } from "react";
import { Timer } from "../Timer/Timer";
import { reducerPatternTimer as reducer } from "../reducers";
import { UserAuth } from "../../Auth/AuthContext";
import { UserInfo } from "../UserContext";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";

export function PatternTimer() {
  const { pomoSetting } = UserInfo();
  const [duration, setDuration] = useState(pomoSetting.pomoDuration);
  //const [cycleCount, setCycleCount] = useState(0);
  const [repetitionCount, setRepetitionCount] = useState(0);
  const { user } = UserAuth();

  let { pomoDuration, shortBreakDuration, longBreakDuration, numOfPomo } =
    pomoSetting;

  function next(howManyCountdown, startTime) {
    if (howManyCountdown < numOfPomo * 2 - 1) {
      //! This is when a pomo is completed.
      if (howManyCountdown % 2 === 1) {
        console.log("ONE POMO DURATION IS FINISHED");
        recordPomo(user, duration, startTime);
        notify("shortBreak");
        setDuration(shortBreakDuration);
      } else {
        notify("pomo");
        setDuration(pomoDuration);
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      console.log("ONE POMO DURATION IS FINISHED");
      recordPomo(user, duration, startTime);
      notify("longBreak");
      setDuration(longBreakDuration);
    } else if (howManyCountdown === numOfPomo * 2) {
      console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      //setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration);
      setRepetitionCount(0);
    }
  }

  useEffect(() => {
    setDuration(pomoSetting.pomoDuration);

    if ("Notification" in window) {
      console.log("The Notification property exists in the window namespace");
      if (Notification.permission === "granted") {
        console.log("Permission is granted");
      } else {
        Notification.requestPermission()
          .then(function (result) {
            console.log("result:", result);
            if (Notification.permission === "granted") {
              console.log("Permission is granted");
            }
          })
          .catch((err) => {
            console.log(err);
          });
      }
    } else {
      console.log(
        "The Notification property does not exist in the window namespace"
      );
    }
    console.log(user);
    console.log(user.email);
    console.log("accessToken: ", user.accessToken);
  }, [user, pomoSetting]);
  // TODO?
  // user is fetched after this comp is mounted.
  // But we have the user as a dependency, thus, comp is going to be updated.
  // Is it ideal?..
  // Is there any way to make this comp render after user is fetched?...
  // so that is is rendered once not twice?

  return (
    <>
      <Timer
        //min to seconds
        duration={duration * 60}
        next={next}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
      />
    </>
  );
}

//TODO: Should I place these two functions inside the PatternTimer?
async function recordPomo(user, duration, startTime) {
  try {
    const response = await axios.post(
      CONSTANTS.URLs.POMO,
      {
        userEmail: user.email,
        duration,
        startTime,
      },
      {
        headers: {
          Authorization: "Bearer " + user.accessToken,
        },
      }
    );
    console.log("res obj", response);
  } catch (err) {
    console.log(err);
  }
}

function notify(which) {
  let title = "Pomodoro";
  let body = "";

  // eslint-disable-next-line default-case
  switch (which) {
    case "pomo":
      body = "time to focus";
      break;
    case "shortBreak":
      body = "time to taks a short break";
      break;
    case "longBreak":
      body = "time to taks a long break";
      break;
    case "nextCycle":
      body = "time to do the next cycle of pomos";
      break;
  }

  let options = {
    body,
  };

  let noti = new Notification(title, options);

  setTimeout(() => {
    noti.close();
  }, 4000);
}
