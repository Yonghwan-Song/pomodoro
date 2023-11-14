/* eslint-disable no-restricted-globals */
import { openDB } from "idb";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../src/firebase";
import { URLs, CacheName } from "./constants/index";
import { IDB_VERSION } from "./constants/index";
import { pubsub } from "./pubsub";

let DB = null;
let CACHE = null;
const BC = new BroadcastChannel("pomodoro");
const SESSION = {
  POMO: 1,
  SHORT_BREAK: 2,
  LAST_POMO: 3,
  LONG_BREAK: 4,
};

const getIdTokenAndEmail = () => {
  return new Promise((res, rej) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            res({ idToken, email: user.email });
          },
          (error) => {
            res(null);
          }
        );
      } else {
        res(null);
      }
    });
  });
};

self.addEventListener("install", (ev) => {
  console.log("sw - installed");
  ev.waitUntil(
    Promise.resolve().then(async () => {
      CACHE = await openCache(CacheName);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (ev) => {
  console.log("sw - activated");
  ev.waitUntil(
    Promise.resolve().then(async () => {
      DB = await openIndexedDB();
    })
  );
});

self.addEventListener("message", async (ev) => {
  if (typeof ev.data === "object" && ev.data !== null) {
    const { action, payload } = ev.data;

    switch (action) {
      case "saveStates":
        saveStates(payload);
        break;

      // not used anymore. Instead, we use countDown() in the index.tsx
      case "countDown":
        // countDown(payload, ev.source.id);
        break;

      case "emptyStateStore":
        emptyStateStore(ev.source.id);
        break;

      case "stopCountdown":
        //number로 바꿔야하 하는거 아니야?
        console.log(payload.idOfSetInterval);
        clearInterval(payload.idOfSetInterval);
        break;

      case "endTimer":
        await goNext(payload);
        break;

      default:
        break;
    }
  }
});

self.addEventListener("notificationclick", async (ev) => {
  console.log("notification from sw is clicked");
  ev.notification.close();

  let pm = Promise.resolve()
    .then(async () => {
      return await self.clients.matchAll();
    })
    .then(async (matchingClients) => {
      // console.log("matchingClients", matchingClients);
      await matchingClients[0].focus();
    });
  ev.waitUntil(pm);
});

async function openCache(name) {
  let cache = null;
  try {
    cache = await caches.open(name);
  } catch (err) {
    console.warn(err);
  }
  // console.log("cache opened - ", cache);
  return cache;
}

async function openIndexedDB() {
  let db = await openDB("timerRelatedDB", IDB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      console.log("DB updated from version", oldVersion, "to", newVersion);

      if (!db.objectStoreNames.contains("stateStore")) {
        db.createObjectStore("stateStore", {
          keyPath: "name",
        });
      }
      if (!db.objectStoreNames.contains("recOfToday")) {
        db.createObjectStore("recOfToday", {
          keyPath: ["kind", "startTime"],
        });
      }
    },
    blocking(currentVersion, blockedVersion, event) {
      // db.close();
      console.log("blocking", event);
      //TODO: test prompt
      // prompt("Please refresh the current webpage");
    },
  });

  db.onclose = async (ev) => {
    console.log("The database connection was unexpectedly closed", ev);
    DB = null;
    DB = await openIndexedDB();
  };

  return db;
}

//data is like below.
//{
//   component: "Timer",
//   stateArr: [
//     { name: "startTime", value: action.payload },
//     { name: "running", value: true },
//   ],
// };
async function saveStates(data) {
  try {
    let db = DB || (await openIndexedDB());
    const store = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");

    console.log(data);

    Array.from(data.stateArr).forEach(async (obj) => {
      await store.put(obj);
    });
  } catch (error) {
    console.warn(error);
  }
}

// If the timer was running in the timer page, continue to count down the timer.
// async function countDown(setIntervalId, clientId) {
//   try {
//     let db = DB || (await openIndexedDB());
//     const store = db.transaction("stateStore").objectStore("stateStore");
//     let states = (await store.getAll()).reduce((acc, cur) => {
//       return { ...acc, [cur.name]: cur.value };
//     }, {});
//     if (states.running && setIntervalId === null) {
//       let client = await self.clients.get(clientId);
//       let idOfSetInterval = setInterval(() => {
//         let remainingDuration = Math.floor(
//           (states.duration * 60 * 1000 -
//             (Date.now() - states.startTime - states.pause.totalLength)) /
//             1000
//         );
//         console.log("count down remaining duration", remainingDuration);
//         if (remainingDuration <= 0) {
//           console.log("idOfSetInterval", idOfSetInterval);
//           clearInterval(idOfSetInterval);
//           client.postMessage({ timerHasEnded: "clearLocalStorage" });
//           console.log("states in countDown() - ", states);
//           goNext(states, clientId);
//         }
//       }, 500);

//       client.postMessage({ idOfSetInterval });
//     }
//   } catch (error) {
//     console.warn(error);
//   }
// }

/**
 * purpose: to make TimerRelatedStates in the index.tsx be assigned an empty object.
 *          why?
 *          if it is {}, states in the PatternTimer and Timer are going to be set using the new pomoSetting
 *          not using the stale states in the indexedDB.
 * @param {*} clientId
 */
async function emptyStateStore(clientId) {
  try {
    let db = DB || (await openIndexedDB());
    const store = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");
    await store.clear();
    console.log("stateStore has been cleared");

    let client = await self.clients.get(clientId);
    client.postMessage({}); //TODO: 이거 아직도 필요한가?... -> 딱히 이거 받아다가 뭘 하지를 않는데 그냥 지우지는 말자. (navigator.serviceWorker.addEventListener "message"에서 else)
  } catch (error) {
    console.warn(error);
  }
}

//
/**
 * Purpose: 1. states를 가공 2. 가공된 states를 가지고 wrapUpSession을 호출.
 * @param {*} payload timersStates and pomoSetting of the session that was just finished.
 */
async function goNext(payload) {
  console.log("payload", payload);
  let { pomoSetting, ...timersStates } = payload;
  console.log("pomoSetting", pomoSetting);
  console.log("timersStates", timersStates);
  let { duration, repetitionCount, pause, startTime } = timersStates;

  const sessionData = {
    pause,
    startTime,
    endTime: startTime + pause.totalLength + duration * 60 * 1000,
    timeCountedDown: duration,
  };

  wrapUpSession({
    session: identifySession({
      howManyCountdown: repetitionCount + 1,
      numOfPomo: pomoSetting.numOfPomo,
    }),
    timersStates,
    pomoSetting,
    sessionData,
  });
}

// Purpose: 방금 종료된 세션의 종류에 따라 호출하는 함수와 그 함수의 argument들이 약간 다르다.
async function wrapUpSession({
  session,
  timersStates,
  pomoSetting,
  sessionData,
}) {
  let timersStatesForNextSession = { ...timersStates };
  // reset TimerState
  timersStatesForNextSession.running = false;
  timersStatesForNextSession.startTime = 0;
  timersStatesForNextSession.pause = { totalLength: 0, record: [] };
  // PatternTimerStates - 1. repetitionCount: new cycle의 경우를 제외하고는 모두 1 더하면 되기 때문에 여기에서 미리 처리.
  //                      2. duration: 방금 끝난 세션의 종류에 따라 달라지기 때문에 각 case에서 처리.
  timersStatesForNextSession.repetitionCount++;

  const arrOfStatesOfTimerReset = [
    {
      name: "running",
      value: false,
    },
    {
      name: "startTime",
      value: 0,
    },
    {
      name: "pause",
      value: { totalLength: 0, record: [] },
    },
  ];
  BC.postMessage({ evName: "makeSound", payload: null });

  switch (session) {
    case SESSION.POMO:
      self.registration.showNotification("shortBreak", {
        body: "time to take a short break",
        silent: true,
      });

      timersStatesForNextSession.duration = pomoSetting.shortBreakDuration;

      await recordPomo(timersStates.duration, timersStates.startTime);

      await persistStatesToIDB([
        ...arrOfStatesOfTimerReset,
        {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount,
        },
        {
          name: "duration",
          value: timersStatesForNextSession.duration,
        },
      ]);

      await persistSessionToIDB("pomo", sessionData);

      updateTimersStates(timersStatesForNextSession);

      persistRecOfTodayToServer({ kind: "pomo", ...sessionData });

      BC.postMessage({
        evName: "autoStartNextSession",
        payload: {
          timersStates: timersStatesForNextSession,
          pomoSetting: pomoSetting,
          kind: "break",
          endTime: sessionData.endTime,
        },
      });

      break;

    case SESSION.SHORT_BREAK:
      self.registration.showNotification("pomo", {
        body: "time to focus",
        silent: true,
      });

      timersStatesForNextSession.duration = pomoSetting.pomoDuration;

      await persistStatesToIDB([
        ...arrOfStatesOfTimerReset,
        {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount,
        },
        {
          name: "duration",
          value: timersStatesForNextSession.duration,
        },
      ]);

      await persistSessionToIDB("break", sessionData);

      updateTimersStates(timersStatesForNextSession);

      persistRecOfTodayToServer({ kind: "break", ...sessionData });

      BC.postMessage({
        evName: "autoStartNextSession",
        payload: {
          timersStates: timersStatesForNextSession,
          pomoSetting: pomoSetting,
          kind: "pomo",
          endTime: sessionData.endTime,
        },
      });

      break;

    case SESSION.LAST_POMO:
      self.registration.showNotification("longBreak", {
        body: "time to take a long break",
        silent: true,
      });

      timersStatesForNextSession.duration = pomoSetting.longBreakDuration;

      await recordPomo(timersStates.duration, timersStates.startTime);

      await persistStatesToIDB([
        ...arrOfStatesOfTimerReset,
        {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount,
        },
        {
          name: "duration",
          value: timersStatesForNextSession.duration,
        },
      ]);

      await persistSessionToIDB("pomo", sessionData);

      updateTimersStates(timersStatesForNextSession);

      persistRecOfTodayToServer({ kind: "pomo", ...sessionData });

      // 이거의 위치를 어떻게 놔야할지 잘 모르겠네...
      BC.postMessage({
        evName: "autoStartNextSession",
        payload: {
          timersStates: timersStatesForNextSession,
          pomoSetting: pomoSetting,
          kind: "break",
          endTime: sessionData.endTime,
        },
      });

      break;

    case SESSION.LONG_BREAK:
      self.registration.showNotification("nextCycle", {
        body: "time to do the next cycle of pomos",
        silent: true,
      });

      timersStatesForNextSession.repetitionCount = 0;
      timersStatesForNextSession.duration = pomoSetting.pomoDuration;

      await persistStatesToIDB([
        ...arrOfStatesOfTimerReset,
        {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount,
        },
        {
          name: "duration",
          value: timersStatesForNextSession.duration,
        },
      ]);

      await persistSessionToIDB("break", sessionData);

      updateTimersStates(timersStatesForNextSession);

      persistRecOfTodayToServer({ kind: "break", ...sessionData });

      BC.postMessage({
        evName: "autoStartNextSession",
        payload: {
          timersStates: timersStatesForNextSession,
          pomoSetting: pomoSetting,
          kind: "pomo",
          endTime: sessionData.endTime,
        },
      });

      break;

    default:
      break;
  }
}

// same as the one in the src/index.tsx
async function persistSessionToIDB(kind, data) {
  try {
    let db = DB || (await openIndexedDB());
    const store = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");

    console.log("sessionData", { kind, ...data });
    await store.add({ kind, ...data });
    if (kind === "pomo") {
      console.log("trying to add pomo", { kind, ...data });
      BC.postMessage({ evName: "pomoAdded", payload: data });
      console.log("pubsub event from sw", pubsub.events);
    }
  } catch (error) {
    console.warn(error);
  }
}

async function persistStatesToIDB(stateArr) {
  try {
    let db = DB || (await openIndexedDB());
    const store = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");

    Array.from(stateArr).forEach(async (obj) => {
      await store.put(obj);
    });
  } catch (error) {
    console.warn(error);
  }
}

async function recordPomo(duration, startTime) {
  try {
    let idTokenAndEmail = await getIdTokenAndEmail();
    if (idTokenAndEmail) {
      const { idToken, email } = idTokenAndEmail;
      const today = new Date(startTime);
      let LocaleDateString = `${
        today.getMonth() + 1
      }/${today.getDate()}/${today.getFullYear()}`;
      const record = {
        userEmail: email,
        duration,
        startTime,
        LocaleDateString,
      };
      let body = JSON.stringify(record);
      console.log("body", body);

      // update
      let cache = CACHE || (await openCache(CacheName));
      console.log("cache in recordPomo", cache);
      let statResponse = await cache.match(URLs.POMO + `/stat`);
      if (statResponse !== undefined) {
        let statData = await statResponse.json();
        console.log("statData before push", statData);
        statData.push({
          userEmail: email,
          duration,
          startTime,
          date: LocaleDateString,
          isDummy: false,
        });
        console.log("statData after push", statData);
        cache.put(URLs.POMO + `/stat`, new Response(JSON.stringify(statData)));
      }

      const res = await fetch(URLs.POMO, {
        method: "POST",
        body,
        headers: {
          Authorization: "Bearer " + idToken,
          "Content-Type": "application/json",
        },
      });
      console.log("res of recordPomo in sw: ", res);
    }
  } catch (err) {
    console.warn(err);
  }
}

async function updateTimersStates(states) {
  try {
    let idTokenAndEmail = await getIdTokenAndEmail();
    if (idTokenAndEmail) {
      const { idToken, email } = idTokenAndEmail;
      // caching
      let cache = CACHE || (await openCache(CacheName));
      let pomoSettingAndTimerStatesResponse = await cache.match(URLs.USER);
      if (pomoSettingAndTimerStatesResponse !== undefined) {
        let pomoSettingAndTimersStates =
          await pomoSettingAndTimerStatesResponse.json();
        pomoSettingAndTimersStates.timersStates = states;
        await cache.put(
          URLs.USER,
          new Response(JSON.stringify(pomoSettingAndTimersStates))
        );
      }

      const res = await fetch(URLs.USER + `/updateTimersStates`, {
        method: "PUT",
        body: JSON.stringify({ states }),
        headers: {
          Authorization: "Bearer " + idToken,
          "Content-Type": "application/json",
        },
      });
      console.log("res of updateTimersStates in sw: ", res);
    }
  } catch (error) {
    console.warn(error);
  }
}

async function persistRecOfTodayToServer(record) {
  try {
    let idTokenAndEmail = await getIdTokenAndEmail();
    if (idTokenAndEmail) {
      console.log("in the if block");
      const { idToken, email } = idTokenAndEmail;
      // caching
      let cache = CACHE || (await openCache(CacheName));
      let resOfRecordOfToday = await cache.match(URLs.RECORD_OF_TODAY);
      if (resOfRecordOfToday !== undefined) {
        let recordsOfToday = await resOfRecordOfToday.json();
        recordsOfToday.push({
          record,
        });
        await cache.put(
          URLs.RECORD_OF_TODAY,
          new Response(JSON.stringify(recordsOfToday))
        );
      }

      // http requeset
      const res = await fetch(URLs.RECORD_OF_TODAY, {
        method: "POST",
        body: JSON.stringify({
          userEmail: email,
          ...record,
        }),
        headers: {
          Authorization: "Bearer " + idToken,
          "Content-Type": "application/json",
        },
      });
      console.log("res of persistRecOfTodayToSever", res);
    }
  } catch (error) {
    console.warn(error);
  }
}

function identifySession({ howManyCountdown, numOfPomo }) {
  if (howManyCountdown < numOfPomo * 2 - 1 && howManyCountdown % 2 === 1) {
    return SESSION.POMO;
  } else if (
    howManyCountdown < numOfPomo * 2 - 1 &&
    howManyCountdown % 2 === 0
  ) {
    return SESSION.SHORT_BREAK;
  } else if (howManyCountdown === numOfPomo * 2 - 1) {
    return SESSION.LAST_POMO;
  } else {
    return SESSION.LONG_BREAK;
  }
}
