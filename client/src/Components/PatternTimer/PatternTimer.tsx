import { useEffect, useState } from "react";
import { Timer } from "../Timer/Timer";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import { UserAuth } from "../../Context/AuthContext";
import { UserInfo } from "../../Context/UserContext";
import { User } from "firebase/auth";

export function PatternTimer() {
  const [duration, setDuration] = useState(0);
  //const [cycleCount, setCycleCount] = useState(0);
  const [repetitionCount, setRepetitionCount] = useState(0); // How many times the timer used by this Pattern timer.
  const { pomoSetting } = UserInfo()!;
  const { user } = UserAuth()!;

  let { pomoDuration, shortBreakDuration, longBreakDuration, numOfPomo } =
    pomoSetting;

  /**
   * Decide this time rendering is whether a pomo duration or a break
   * and decide how many pomo durations or breaks are left.
   * Based on that decision, update states of this PatternTimer component.
   *
   * @param {number} howManyCountdown The total number of times the timer is used whether it is for pomo duration or break.
   * @param {*} startTime
   * @param {*} concentrationTime
   */
  function next(
    howManyCountdown: number,
    startTime: number,
    concentrationTime: number = duration
  ) {
    if (howManyCountdown < numOfPomo! * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        //! This is when a pomo, which is not the last one of a cycle, is completed.
        console.log("ONE POMO DURATION IS FINISHED");
        recordPomo(user!, concentrationTime, startTime); // Non null assertion is correct because a user is already signed in at this point.
        notify("shortBreak");
        setDuration(shortBreakDuration!);
      } else {
        //! This is when a short break is done.
        notify("pomo");
        setDuration(pomoDuration!);
      }
    } else if (howManyCountdown === numOfPomo! * 2 - 1) {
      //! This is when the last pomo of a cycle is completed.
      console.log("ONE POMO DURATION IS FINISHED");
      recordPomo(user!, concentrationTime, startTime);
      notify("longBreak");
      setDuration(longBreakDuration!);
    } else if (howManyCountdown === numOfPomo! * 2) {
      //! This is when the long break is done meaning that a cycle of pomos, short break, and long break is done.
      console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      //setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration!);
      setRepetitionCount(0);
    }
  }

  useEffect(() => {
    // setDuration(pomoSetting.pomoDuration || 0);
    if (Object.entries(pomoSetting).length === 0) {
      setDuration(0);
    } else {
      setDuration(pomoSetting.pomoDuration);
    }

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
    //* user is not supposed to be a null
    //* because of user authentication (the Main component is wrapped by the Protected Component).
    console.log(user!.email);
    // console.log("accessToken: ", user!.accessToken);
    // console.log("accessToken: ", user!.getIdToken()); //Actually, this line is not necessary and I already replaced user.accessToken with user.getIdToken() in the API calls.
  }, [user, pomoSetting]);

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

async function recordPomo(user: User, duration: number, startTime: number) {
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

function notify(which: string) {
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
