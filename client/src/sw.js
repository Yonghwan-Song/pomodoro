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

self.addEventListener("message", (ev) => {
  if (typeof ev.data === "object" && ev.data !== null) {
    const { action, payload } = ev.data;

    switch (action) {
      case "saveStates":
        saveStates(payload);
        break;

      // not used anymore. Instead, we use countDown() in the index.tsx
      case "countDown":
        countDown(payload, ev.source.id);
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
        goNext(payload);
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
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readwrite")
    .objectStore("stateStore");

  console.log(data);

  Array.from(data.stateArr).forEach(async (obj) => {
    await store.put(obj);
  });
}

// If the timer was running in the timer page, continue to count down the timer.
async function countDown(setIntervalId, clientId) {
  let db = DB || (await openIndexedDB());
  const store = db.transaction("stateStore").objectStore("stateStore");
  let states = (await store.getAll()).reduce((acc, cur) => {
    return { ...acc, [cur.name]: cur.value };
  }, {});
  if (states.running && setIntervalId === null) {
    let client = await self.clients.get(clientId);
    let idOfSetInterval = setInterval(() => {
      let remainingDuration = Math.floor(
        (states.duration * 60 * 1000 -
          (Date.now() - states.startTime - states.pause.totalLength)) /
          1000
      );
      console.log("count down remaining duration", remainingDuration);
      if (remainingDuration <= 0) {
        console.log("idOfSetInterval", idOfSetInterval);
        clearInterval(idOfSetInterval);
        client.postMessage({ timerHasEnded: "clearLocalStorage" });
        console.log("states in countDown() - ", states);
        goNext(states, clientId);
      }
    }, 500);

    client.postMessage({ idOfSetInterval });
  }
}

/**
 * purpose: to make TimerRelatedStates in the index.tsx be assigned an empty object.
 *          why?
 *          if it is {}, states in the PatternTimer and Timer are going to be set using the new pomoSetting
 *          not using the stale states in the indexedDB.
 * @param {*} clientId
 */
async function emptyStateStore(clientId) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readwrite")
    .objectStore("stateStore");
  await store.clear();
  console.log("stateStore has been cleared");

  let client = await self.clients.get(clientId);
  client.postMessage({}); //TODO: 이거 아직도 필요한가?...
}

// Purpose: to decide whether the the following duration is a pomo or break.
async function goNext(states) {
  console.log(
    "states as a parameter in goNext(): Before Destructuring- ",
    states
  );
  let {
    duration,
    repetitionCount,
    running,
    pomoSetting: {
      pomoDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfPomo,
    },
    pause,
    startTime,
  } = states;
  console.log("pomoDuration", pomoDuration);
  console.log("shortBreakDuration", shortBreakDuration);
  console.log("longBreakDuratin", longBreakDuration);
  console.log("numOfPomo", numOfPomo);
  console.log(
    "states as a parameter in goNext(): After Destructuring- ",
    states
  );

  //TODO: why am I deleting these properties?
  delete states.duration;
  delete states.repetitionCount;
  delete states.running;
  delete states.pomoSetting;
  const endTime = startTime + pause.totalLength + duration * 60 * 1000;
  const sessionData = {
    ...states,
    endTime,
    timeCountedDown: duration,
  };
  console.log("sessionData - ", sessionData);

  repetitionCount++;
  running = false;
  pause = { totalLength: 0, record: [] };

  await persistStates([
    {
      name: "running",
      value: running,
    },
    {
      name: "startTime",
      value: 0,
    },
    {
      name: "pause",
      value: pause,
    },
    {
      name: "repetitionCount",
      value: repetitionCount,
    },
  ]);

  // let idTokenAndEmail = await getIdTokenAndEmail();

  if (repetitionCount < numOfPomo * 2 - 1) {
    if (repetitionCount % 2 === 1) {
      console.log("1");
      console.log("SB - ", shortBreakDuration);
      //This is when a pomo, which is not the last one of a cycle, is completed.
      self.registration.showNotification("shortBreak", {
        body: "time to take a short break",
      });
      await recordPomo(duration, startTime);
      await persistStates([
        {
          name: "duration",
          value: shortBreakDuration,
        },
      ]);
      await persistSession("pomo", sessionData);
      updateTimersStates({
        running,
        startTime: 0,
        pause,
        repetitionCount,
        duration: shortBreakDuration,
      });
      persistRecOfTodayToServer({ kind: "pomo", ...sessionData });

      // console.log(await getIdTokenAndEmail());
    } else {
      console.log("2");
      console.log("P - ", pomoDuration);
      //* This is when a short break is done.
      self.registration.showNotification("pomo", {
        body: "time to focus",
      });
      await persistStates([
        {
          name: "duration",
          value: pomoDuration,
        },
      ]);
      await persistSession("break", sessionData);

      updateTimersStates({
        running,
        startTime: 0,
        pause,
        repetitionCount,
        duration: pomoDuration,
      });
      persistRecOfTodayToServer({ kind: "break", ...sessionData });
    }
  } else if (repetitionCount === numOfPomo * 2 - 1) {
    console.log("3");
    console.log("LB - ", longBreakDuration);
    //This is when the last pomo of a cycle is completed.
    self.registration.showNotification("longBreak", {
      body: "time to take a long break",
    });
    await recordPomo(duration, startTime);
    await persistStates([
      {
        name: "duration",
        value: longBreakDuration,
      },
    ]);
    await persistSession("pomo", sessionData);
    updateTimersStates({
      running,
      startTime: 0,
      pause,
      repetitionCount,
      duration: longBreakDuration,
    });
    persistRecOfTodayToServer({ kind: "pomo", ...sessionData });
  } else if (repetitionCount === numOfPomo * 2) {
    console.log("4");
    console.log("P - ", pomoDuration);
    //This is when the long break is done meaning a cycle that consists of pomos, short break, and long break is done.
    self.registration.showNotification("nextCycle", {
      body: "time to do the next cycle of pomos",
    });
    await persistStates([
      {
        name: "duration",
        value: pomoDuration,
      },
      {
        name: "repetitionCount",
        value: 0,
      },
    ]);
    await persistSession("break", sessionData);
    updateTimersStates({
      running,
      startTime: 0,
      pause,
      repetitionCount: 0,
      duration: pomoDuration,
    });
    persistRecOfTodayToServer({ kind: "break", ...sessionData });
  } else {
    console.log("5");
  }
}

// same as the one in the src/index.tsx
async function persistSession(kind, data) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");

  console.log("sessionData", { kind, ...data });
  try {
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

async function persistStates(stateArr) {
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
      let statResponse = await cache.match(URLs.POMO + `/stat/${email}`);
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
        cache.put(
          URLs.POMO + `/stat/${email}`,
          new Response(JSON.stringify(statData))
        );
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
      let pomoSettingAndTimerStatesResponse = await cache.match(
        URLs.USER + `/${email}`
      );
      if (pomoSettingAndTimerStatesResponse !== undefined) {
        let pomoSettingAndTimersStates =
          await pomoSettingAndTimerStatesResponse.json();
        pomoSettingAndTimersStates.timersStates = states;
        await cache.put(
          URLs.USER + `/${email}`,
          new Response(JSON.stringify(pomoSettingAndTimersStates))
        );
      }

      const res = await fetch(URLs.USER + `/updateTimersStates/${email}`, {
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
      let resOfRecordOfToday = await cache.match(
        URLs.RECORD_OF_TODAY + "/" + email
      );
      if (resOfRecordOfToday !== undefined) {
        let recordsOfToday = await resOfRecordOfToday.json();
        recordsOfToday.push({
          record,
        });
        await cache.put(
          URLs.RECORD_OF_TODAY + "/" + email,
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
