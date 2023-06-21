import { useEffect, useState } from "react";
import { Timer } from "../Timer/Timer";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import { UserAuth } from "../../Context/AuthContext";
import { User } from "firebase/auth";
import { StatesType, postMsgToSW } from "../..";

type PatternTimerProps = {
  statesRelatedToTimer: StatesType;
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
};

export function PatternTimer({
  statesRelatedToTimer,
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
}: PatternTimerProps) {
  const [duration, setDuration] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return statesRelatedToTimer.duration;
    } else {
      return pomoDuration;
    }
  }); // How long the timer is going to run next time.
  const [repetitionCount, setRepetitionCount] = useState(() => {
    if (Object.keys(statesRelatedToTimer).length !== 0) {
      return statesRelatedToTimer.repetitionCount;
    } else {
      return 0;
    }
  }); // How many times the timer used by this Pattern timer. Timer 몇번 돌아갔는지 여태까지.
  //Thus, e.g. if repetitionCount is 0 and duration is 20, the timer is going to run for 20 minutes when start buttion is clicked.
  //And also the timer actually has not run yet since repetitionCount is 0.

  const { user } = UserAuth()!;
  const [isOnCycle, setIsOnCycle] = useState<boolean>(false); // If the isOnCycle is true, a cycle of pomos has started and not finished yet.
  const [cycleCount, setCycleCount] = useState(0);
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
        postMsgToSW("saveStates", {
          component: "PatternTimer",
          stateArr: [{ name: "duration", value: shortBreakDuration }],
        });
      } else {
        //! This is when a short break is done.
        notify("pomo");
        setDuration(pomoDuration!);
        postMsgToSW("saveStates", {
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
      postMsgToSW("saveStates", {
        component: "PatternTimer",
        stateArr: [{ name: "duration", value: longBreakDuration }],
      });
    } else if (howManyCountdown === numOfPomo! * 2) {
      //! This is when the long break is done meaning a cycle that consists of pomos, short break, and long break is done.
      console.log("one cycle is done");
      //cycle completion notification
      notify("nextCycle");
      //setCycleCount((prev) => prev + 1);
      setDuration(pomoDuration!); //TODO: non-null assertion....
      setRepetitionCount(0);
      setIsOnCycle(false);
      postMsgToSW("saveStates", {
        component: "PatternTimer",
        stateArr: [
          { name: "duration", value: pomoDuration! },
          { name: "repetitionCount", value: 0 },
        ],
      });
    }
  }

  //! 문제: 어떤 이유로, stat에서 main으로 돌아올 때 마다 effect function이 call된다.
  useEffect(() => {
    // console.log(user);
    // console.log(user!.email);
  }, []);

  useEffect(() => {
    // console.log(pomoDuration);
    // console.log(shortBreakDuration);
    // console.log(longBreakDuration);
    // console.log(numOfPomo);
    // setDuration(pomoDuration);
  }, [pomoDuration, shortBreakDuration, longBreakDuration, numOfPomo]);

  return (
    <>
      <Timer
        //min to seconds
        statesRelatedToTimer={statesRelatedToTimer}
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
    console.log(
      JSON.stringify({
        userEmail: user.email,
        duration,
        startTime,
        LocaleDateString,
      })
    );
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
      body = "time to take a short break";
      break;
    case "longBreak":
      body = "time to take a long break";
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
