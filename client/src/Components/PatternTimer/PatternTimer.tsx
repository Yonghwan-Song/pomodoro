import { useEffect, useRef, useState } from "react";
import { Timer } from "../Timer/Timer";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import { UserAuth } from "../../Context/AuthContext";
import { UserInfo } from "../../Context/UserContext";
import { User } from "firebase/auth";
import { SW, retrieveState } from "../..";

export function PatternTimer() {
  const [duration, setDuration] = useState(0); // How long the timer is going to run next time.
  const [repetitionCount, setRepetitionCount] = useState(0); // How many times the timer used by this Pattern timer. Timer 몇번 돌아갔는지 여태까지.
  //Thus, e.g. if repetitionCount is 0 and duration is 20, the timer is going to run for 20 minutes when start buttion is clicked.
  //And also the timer actually has not run yet since repetitionCount is 0.
  const { pomoSetting } = UserInfo()!;
  const { user } = UserAuth()!;
  const [isOnCycle, setIsOnCycle] = useState<boolean>(false); // If the isOnCycle is true, a cycle of pomos has started and not finished yet.
  const [cycleCount, setCycleCount] = useState(0);
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
        SW?.postMessage({
          component: "PatternTimer",
          stateArr: [{ name: "duration", value: shortBreakDuration }],
        });
      } else {
        //! This is when a short break is done.
        notify("pomo");
        setDuration(pomoDuration!);
        SW?.postMessage({
          component: "PatternTimer",
          stateArr: [{ name: "duration", value: pomoDuration }],
        });
      }
    } else if (howManyCountdown === numOfPomo! * 2 - 1) {
      //! This is when the last pomo of a cycle is completed.
      console.log("ONE POMO DURATION IS FINISHED");
      recordPomo(user!, concentrationTime, startTime);
      notify("longBreak");
      setDuration(longBreakDuration!);
      SW?.postMessage({
        component: "PatternTimer",
        stateArr: [{ name: "duration", value: longBreakDuration }],
      });
    } else if (howManyCountdown === numOfPomo! * 2) {
      //! This is when the long break is done meaning that a cycle of pomos, short break, and long break is done.
      console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      //setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration!); //TODO: non-null assertion....
      setRepetitionCount(0);
      setIsOnCycle(false);
      SW?.postMessage({
        component: "PatternTimer",
        stateArr: [
          { name: "duration", value: pomoDuration! },
          { name: "repetitionCount", value: 0 },
        ],
      });
    }
  }

  useEffect(() => {
    async function getStatesFromIndexedDB() {
      let duration = await retrieveState<number>(0, "duration", "PatternTimer");
      let repetitionCount = await retrieveState<number>(
        0,
        "repetitionCount",
        "PatternTimer"
      );
      console.log(
        `getting values from indexed db -> ${duration},  ${repetitionCount}`
      );
      setDuration(duration);
      setRepetitionCount(repetitionCount);
    }
    getStatesFromIndexedDB();
  }, []);

  useEffect(() => {
    if (Object.entries(pomoSetting).length === 0) {
      setDuration(0);
    } else {
      setDuration(pomoSetting.pomoDuration);
      SW?.postMessage({
        component: "PatternTimer",
        stateArr: [{ name: "pomoSetting", value: pomoSetting }],
      });
    }

    //#region notification
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
    //#endregion

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
        // duration={duration * 60}
        duration={duration * 60}
        next={next}
        repetitionCount={repetitionCount}
        setRepetitionCount={setRepetitionCount}
        isOnCycle={isOnCycle}
        setIsOnCycle={setIsOnCycle}
      />
      <h3 style={{ textAlign: "center" }}>
        Remaining Pomo Sessions -{" "}
        {numOfPomo -
          (repetitionCount === 0
            ? 0
            : repetitionCount % 2 === 0
            ? repetitionCount / 2
            : (repetitionCount + 1) / 2)}
      </h3>
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
