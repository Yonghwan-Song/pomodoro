/**
 * Next()의 conditional statement의 각 block에서
 * 일어나는 일들은
 * * 매우 비슷하다.
 * 묶어서 함수 하나로 만들어.
 */

import { ActionType } from "../..";
import { RecType } from "../../types/clientStatesType";
import { User } from "firebase/auth";

/**
 * * 그래서 뭔 일들이 일어나는데?
 *
 *   1. recordPomo     (1, 3)
 * ! 2. notify
 * ! 3. setDurationInMinutes
 * ! 4. postMsgToSW("saveStates")
 * ! 5. setRecords
 */

/**
 * notify's argument
 * 1 -> "shortBreak"
 * 2 -> "pomo"
 * 3 -> "longBreak"
 *
 * 4 -> "nextCycle"
 */

/**
 * setDurationInMinutes's argument
 * 1 -> shortBreakDuration
 * 2 -> pomoDuration
 * 3 -> longBreakDuration
 *
 * 4 -> pomoDuration
 */

/**
 * postMsgToSW's argument
 * 1 -> stateArr: [{ name: "duration", value: shortBreakDuration }]
 * 2 -> stateArr: [{ name: "duration", value: pomoDuration }]
 * 3 -> stateArr: [{ name: "duration", value: longBreakDuration }]
 *
 * 4 -> stateArr: [
 *         { name: "duration", value: pomoDuration },
 *         { name: "repetitionCount", value: 0 },
 *      ]
 */

/**
 * setRecords's argument
 * * 가장 추상적 -> 위의 3개의 함수들의 1, 2, 3의 경우를 모두 아우를 수 있음.
 *
 * 1. (prev) => [...prev, { kind: "pomo", ...sessionData }]
 * 2. (prev) => [...prev, { kind: "break", ...sessionData }]
 * 3. (prev) => [...prev, { kind: "pomo", ...sessionData }]
 * 4. (prev) => [...prev, { kind: "break", ...sessionData }]
 */

// * 위의 처음 3개의 함수들의 1, 2, 3 까지의 경우는 pomo, shortBreak, longBreak으로 공통이다.

/**
 * 대략 내가 원하는 improved된? 함수의 모양은
 *
 * processSomeThings(determineNumber());
 *
 * const determineNumber: number = (arg: {howManyCountdown: number, numOfPomo: number}) => {}
 * const processSomeThings = (arg: number) => {}
 */
enum Session {
  Pomo = 1,
  ShortBreak,
  LastPomo,
  LongBreak,
}

function identifySession({
  howManyCountdown,
  numOfPomo,
}: {
  howManyCountdown: number;
  numOfPomo: number;
}): Session {
  if (howManyCountdown < numOfPomo! * 2 - 1 && howManyCountdown % 2 === 1) {
    return Session.Pomo;
  } else if (
    howManyCountdown < numOfPomo! * 2 - 1 &&
    howManyCountdown % 2 === 0
  ) {
    return Session.ShortBreak;
  } else if (howManyCountdown === numOfPomo * 2 - 1) {
    return Session.LastPomo;
  } else {
    return Session.LongBreak;
  }
}

// function wrapUpSession(session: Session) {
// function wrapUpSession({
//   session,
//   tasks,
// }: {
//   session: Session;
//   tasks: {
//     notify: (which: string) => Promise<void>;
//     setDurationInMinutes: React.Dispatch<React.SetStateAction<number>>;
//     postMsgToSW: (action: ActionType, payload: any) => void;
//     setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
//     recordPomo?: (
//       user: User,
//       durationInMinutes: number,
//       startTime: number
//     ) => Promise<void>;
//   };
// })
function wrapUpSession({ session }: { session: Session }) {
  switch (session) {
    case Session.Pomo:
      console.log("This was a pomo, prepare a short break");

      break;
    case Session.ShortBreak:
      console.log("This was a short break, prepare a pomo");
      break;
    case Session.LastPomo:
      console.log("This was the last pomo, prepare a long break");
      break;
    case Session.LongBreak:
      console.log("This was a long break, prepare a new cycle");
      break;
    default:
      break;
  }
}

// // 이렇게 call하면 된다.
// wrapUpSession(
//   identifySession({
//     howManyCountdown: 4,
//     numOfPomo: 4,
//   })
// );
