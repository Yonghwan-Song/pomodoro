import { useEffect, useState } from "react";
import { Timer } from "../Timer/Timer";
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

  function next(howManyCountdown, startTime, concentrationTime = duration) {
    if (howManyCountdown < numOfPomo * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        //! This is when a pomo, which is not the last one of a cycle, is completed.
        console.log("ONE POMO DURATION IS FINISHED");
        recordPomo(user, concentrationTime, startTime);
        notify("shortBreak");
        setDuration(shortBreakDuration);
      } else {
        //! This is when a short break is done.
        notify("pomo");
        setDuration(pomoDuration);
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      //! This is when the last pomo of a cycle is completed.
      console.log("ONE POMO DURATION IS FINISHED");
      recordPomo(user, concentrationTime, startTime);
      notify("longBreak");
      setDuration(longBreakDuration);
    } else if (howManyCountdown === numOfPomo * 2) {
      //! This is when the long break is done meaning that a cycle of pomos, short break, and long break is done.
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

async function recordPomo(user, duration, startTime) {
  try {
    let LocaleDateString = new Date(startTime).toLocaleDateString();
    const idToken = await user.getIdToken();
    const response = await axios.post(
      CONSTANTS.URLs.POMO,
      {
        userEmail: user.email,
        duration,
        startTime,
        LocaleDateString,
      },
      {
        headers: {
          Authorization: "Bearer " + idToken,
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
