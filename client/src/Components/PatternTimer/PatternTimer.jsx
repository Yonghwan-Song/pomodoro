import { useEffect, useState } from "react";
import { Timer } from "../Timer/Timer";
import { reducerPatternTimer as reducer } from "../reducers";

// Purpose:
// the PatternTimer controls the Timer component,
// using the four props passed in like below.
export function PatternTimer({
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
}) {
  const [duration, setDuration] = useState(pomoDuration);
  const [cycleCount, setCycleCount] = useState(0);
  const [repetitionCount, setRepetitionCount] = useState(0);

  function next(howManyCountdown) {
    if (howManyCountdown < numOfPomo * 2 - 1) {
      if (howManyCountdown % 2 === 1) {
        //shortBreak notification
        notify("shortBreak");
        setDuration(shortBreakDuration);
      } else {
        //pomo notification
        notify("pomo");
        setDuration(pomoDuration);
      }
    } else if (howManyCountdown === numOfPomo * 2 - 1) {
      //longBreak notification
      notify("longBreak");
      setDuration(longBreakDuration);
    } else if (howManyCountdown === numOfPomo * 2) {
      console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration);
      setRepetitionCount(0);
    }
  }

  useEffect(() => {
    if ("Notification" in window) {
      console.log("The Notification property exists in the window namespace");
      if (Notification.permission === "granted") {
        alert("Permission is granted");
      } else {
        Notification.requestPermission()
          .then(function (result) {
            console.log("result:", result);
            if (Notification.permission === "granted") {
              alert("Permission is granted");
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
  }, []);

  return (
    <>
      <Timer
        duration={duration * 60}
        next={next}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
      />
    </>
  );
}

function notify(which) {
  let title = "Pomodoro";
  let body = "";

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
