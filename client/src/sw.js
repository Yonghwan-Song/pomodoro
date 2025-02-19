/* eslint-disable no-restricted-globals */
import { openDB } from "idb";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../src/firebase";
import { CacheName, BASE_URL, RESOURCE, SUB_SET } from "./constants/index";
import { IDB_VERSION } from "./constants/index";

let DB = null;
let CACHE = null;
const BC = new BroadcastChannel("pomodoro");
const SESSION = {
  POMO: 1,
  SHORT_BREAK: 2,
  LAST_POMO: 3,
  LONG_BREAK: 4,
  VERY_LAST_POMO: 5,
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
  CACHE = await openCache(CacheName);
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
  // console.log("openCache is called with", name);
  let cache = null;
  try {
    cache = await caches.open(name);
  } catch (err) {
    console.warn(err);
  }
  // console.log("cache opened - ", cache);
  return cache;
}

async function getCacheNames() {
  try {
    const cacheNames = await caches.keys();
    console.log("Cache Names:", cacheNames);
    return cacheNames;
  } catch (error) {
    console.error("Error fetching cache names:", error);
  }
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
      if (!db.objectStoreNames.contains("categoryStore")) {
        db.createObjectStore("categoryStore", {
          keyPath: "name",
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

    // console.log(data);

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
  let { pomoSetting, ...timersStatesWithCurrentCycleInfo } = payload; //? autoStartSetting은 왜 빼고 보냈지 payload에..?... -> retrieveAutoStartSettingFromIDB()를 wrapUpSession()에서 call하는데 다 이유가 있을듯.
  let { currentCycleInfo, ...timersStates } = timersStatesWithCurrentCycleInfo;
  let { duration, repetitionCount, pause, startTime } = timersStates; //! info about the session just finished

  const sessionData = {
    pause,
    startTime,
    endTime: startTime + pause.totalLength + duration * 60 * 1000,
    timeCountedDown: duration,
  };

  wrapUpSession({
    session: identifyPrevSession({
      howManyCountdown: repetitionCount + 1,
      numOfPomo: pomoSetting.numOfPomo,
      numOfCycle: pomoSetting.numOfCycle,
    }),
    timersStates,
    currentCycleInfo,
    pomoSetting,
    sessionData,
  });
}

/**
 * Purpose
 * 1. 다음 세션을 진행하기 위해 `정보`를 변환 (TimersStatesType - client/src/types/clientStatesType.ts)
 *    1. F. E - 1) 상태를 변환. 2) Indexed DB에 있는 정보 변환.
 *    2. B. E - API를 통해 DB에 있는 데이터 변환 (sync를 맞춘다).
 * 2. 세션을 마무리하면서 생기는 데이터를 persist
 *    1. records of today ( <=> TodayRecords Collection in DB)
 *      1. Database에
 *      2. Indexed DB에 - unlogged-in user도 Timeline기능을 사용할 수 있게 하기 위해.
 *    2. pomodoro records ( <=> Pomodoros Collection in DB)
 *      1. Database에
 *      2. Cache에 - Statistics component에서 불필요하게 HTTP request를 날리지 않게 하기 위해.
 *
 * @param {Object} param0
 * @param {*} param0.session 방금 끝난 세션의 종류 - 맨 위에 `const SESSION = ...` 참고
 * @param {*} param0.timersStates
 * @param {*} param0.pomoSetting
 * @param {*} param0.sessionData {pause: any; startTime: any; endTime: any; timeCountedDown: any;} - today record 계산하는데 필요함.
 */
async function wrapUpSession({
  session,
  timersStates,
  currentCycleInfo,
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

  const autoStartSetting = await retrieveAutoStartSettingFromIDB();

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

  //? getIdTokenAndEmail -> error -> res(null) is not what I considered here...
  let idTokenAndEmail = await getIdTokenAndEmail();
  let idToken;
  let infoArrayBeforeReset = null;
  if (idTokenAndEmail) {
    idToken = idTokenAndEmail.idToken;
    infoArrayBeforeReset = (await getCategoryChangeInfoArrayFromIDB()).value;

    // console.log("infoArrayBeforeReset", infoArrayBeforeReset);
    // [
    //     {
    //         "categoryName": "Netflix",
    //         "categoryChangeTimestamp": 1724909137377,
    //         "color": "#be37a5",
    //         "progress": 0,
    //         "_id": "66d0064f7387aa24ba4f22ef",
    //         "_uuid": "055e186a-44b1-4b3d-a54b-8545fa3f78d9"
    //     },
    //     {
    //         "categoryName": "ENG",
    //         "categoryChangeTimestamp": 1724909227140,
    //         "_uuid": "73315058-5726-4158-a781-5d60d80af94c",
    //         "color": "#6e95bf",
    //         "progress": 0.5
    //     }
    // ]

    const infoArrAfterReset = [
      {
        ...infoArrayBeforeReset[infoArrayBeforeReset.length - 1],
        categoryChangeTimestamp: 0,
        progress: 0,
      },
    ];

    // console.log("infoArrAfterReset", infoArrAfterReset);
    // [
    //     {
    //         "categoryName": "ENG",
    //         "categoryChangeTimestamp": 0,
    //         "_uuid": "73315058-5726-4158-a781-5d60d80af94c",
    //         "color": "#6e95bf",
    //         "progress": 0
    //     }
    // ]

    infoArrayBeforeReset[0].categoryChangeTimestamp = sessionData.startTime; // It is 0 before this assignment.

    // const infoArr = [
    //   {
    //     categoryName:
    //       currentCategoryName === null ? "uncategorized" : currentCategoryName,
    //     categoryChangeTimestamp: 0,
    //   },
    // ];

    BC.postMessage({
      evName: "sessionEndBySW",
      payload: infoArrAfterReset,
    });
    persistCategoryChangeInfoArrayToIDB(infoArrAfterReset);
    fetchWrapper(
      RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
      "PATCH",
      {
        categoryChangeInfoArray: infoArrAfterReset.map((info) => {
          return {
            categoryName: info.categoryName,
            categoryChangeTimestamp: info.categoryChangeTimestamp,
            color: info.color,
            progress: info.progress,
          };
        }),
      },
      idToken
    );
  }

  const {
    pomoDuration,
    shortBreakDuration,
    longBreakDuration,
    numOfPomo,
    numOfCycle,
  } = pomoSetting;
  const newCurrentCycleInfo = {
    totalFocusDuration: 60 * pomoDuration * numOfPomo,
    cycleDuration:
      60 *
      (pomoDuration * numOfPomo +
        shortBreakDuration * (numOfPomo - 1) +
        longBreakDuration),
  };

  switch (session) {
    case SESSION.POMO:
      self.registration.showNotification("shortBreak", {
        body: "Time to take a short break",
        silent: true,
      });

      // 1. 정보 변환
      timersStatesForNextSession.duration = shortBreakDuration;
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

      // 2. 마무리 하면서 생기는 데이터 persist
      idTokenAndEmail &&
        (await recordPomo(
          timersStates.startTime,
          idTokenAndEmail,
          infoArrayBeforeReset,
          sessionData
        ));
      await persistSessionToIDB("pomo", sessionData);

      if (autoStartSetting !== undefined) {
        if (autoStartSetting.doesBreakStartAutomatically === false) {
          persistTimersStatesToServer(timersStatesForNextSession, idToken);
        } else {
          const payload = {
            timersStates: timersStatesForNextSession,
            currentCycleInfo,
            pomoSetting: pomoSetting,
            endTime: sessionData.endTime,
            prevSessionType: session,
          };
          BC.postMessage({
            evName: "autoStartCurrentSession",
            payload,
          });
        }
      } else {
        console.warn("autoStartSetting is undefined");
      }

      persistRecOfTodayToServer({ kind: "pomo", ...sessionData }, idToken);

      break;

    case SESSION.SHORT_BREAK:
      self.registration.showNotification("pomo", {
        body: "Time to focus",
        silent: true,
      });

      timersStatesForNextSession.duration = pomoDuration;

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

      if (autoStartSetting !== undefined) {
        if (autoStartSetting.doesPomoStartAutomatically === false) {
          persistTimersStatesToServer(timersStatesForNextSession, idToken);
        } else {
          const payload = {
            timersStates: timersStatesForNextSession,
            currentCycleInfo,
            pomoSetting: pomoSetting,
            endTime: sessionData.endTime,
            prevSessionType: session,
          };
          BC.postMessage({
            evName: "autoStartCurrentSession",
            payload,
          });
        }
      } else {
        console.warn("autoStartSetting is undefined");
      }

      persistRecOfTodayToServer({ kind: "break", ...sessionData }, idToken);

      break;

    case SESSION.LAST_POMO:
      self.registration.showNotification("longBreak", {
        body: "Time to take a long break",
        silent: true,
      });

      timersStatesForNextSession.duration = longBreakDuration;
      idTokenAndEmail &&
        (await recordPomo(
          timersStates.startTime,
          idTokenAndEmail,
          infoArrayBeforeReset,
          sessionData
        ));

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

      if (autoStartSetting !== undefined) {
        if (autoStartSetting.doesBreakStartAutomatically === false) {
          persistTimersStatesToServer(timersStatesForNextSession, idToken);
        } else {
          const payload = {
            timersStates: timersStatesForNextSession,
            currentCycleInfo,
            pomoSetting: pomoSetting,
            endTime: sessionData.endTime,
            prevSessionType: session,
          };
          BC.postMessage({
            evName: "autoStartCurrentSession",
            payload,
          });
        }
      } else {
        console.warn("autoStartSetting is undefined");
      }

      persistRecOfTodayToServer({ kind: "pomo", ...sessionData }, idToken);

      break;

    case SESSION.VERY_LAST_POMO:
      self.registration.showNotification("cyclesCompleted", {
        body: "All cycles of focus durations are done",
        silent: true,
      });

      timersStatesForNextSession.repetitionCount = 0;
      timersStatesForNextSession.duration = pomoDuration;
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
        {
          name: "currentCycleInfo",
          value: newCurrentCycleInfo,
        },
      ]);

      await persistSessionToIDB("pomo", sessionData);

      idTokenAndEmail &&
        (await recordPomo(
          timersStates.startTime,
          idTokenAndEmail,
          infoArrayBeforeReset,
          sessionData
        ));

      persistTimersStatesToServer(timersStatesForNextSession, idToken);
      fetchWrapper(
        RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO,
        "PATCH",
        newCurrentCycleInfo,
        idToken
      );
      persistRecOfTodayToServer({ kind: "pomo", ...sessionData }, idToken);

      break;

    case SESSION.LONG_BREAK:
      self.registration.showNotification("nextCycle", {
        body: "time to do the next cycle of pomos",
        silent: true,
      });

      timersStatesForNextSession.duration = pomoDuration;

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
        {
          name: "currentCycleInfo",
          value: newCurrentCycleInfo,
        },
      ]);

      await persistSessionToIDB("break", sessionData);

      if (autoStartSetting !== undefined) {
        if (autoStartSetting.doesCycleStartAutomatically) {
          const payload = {
            timersStates: timersStatesForNextSession,
            currentCycleInfo,
            pomoSetting: pomoSetting,
            endTime: sessionData.endTime,
            prevSessionType: session,
          };
          BC.postMessage({
            evName: "autoStartCurrentSession",
            payload,
          });
        } else {
          persistTimersStatesToServer(timersStatesForNextSession, idToken);
        }
      } else {
        console.warn("autoStartSetting is undefined");
      }

      persistRecOfTodayToServer({ kind: "break", ...sessionData }, idToken);
      fetchWrapper(
        RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO,
        "PATCH",
        newCurrentCycleInfo,
        idToken
      );

      break;

    default:
      break;
  }
}

// same as the one in the src/index.tsx
async function retrieveAutoStartSettingFromIDB() {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readonly")
    .objectStore("stateStore");
  let result = await store.get("autoStartSetting");
  if (result !== undefined) {
    return result.value;
  } else {
    // By the time the timer is mounted, stateStore in idb is guaranteed to
    // have at least the default autoStartSetting and pomoSetting.
    return undefined;
  }
}

/**
 *
 * @param {*} kind "pomo" | "break"
 * @param {*} sessionData {pause: {totalLength: number; record: {start: number; end: number | undefined;}[]}, startTime: number; endTime: number; timeCountedDown: number}
 */
async function persistSessionToIDB(kind, sessionData) {
  try {
    let db = DB || (await openIndexedDB());
    const store = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");

    await store.add({ kind, ...sessionData });
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

async function persistCategoryChangeInfoArrayToIDB(infoArr) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("categoryStore", "readwrite")
    .objectStore("categoryStore");

  try {
    await store.put({ name: "changeInfoArray", value: infoArr });
  } catch (error) {
    console.warn(error);
  }
}

async function getCategoryChangeInfoArrayFromIDB() {
  let db = DB || (await openIndexedDB());

  const store = db
    .transaction("categoryStore", "readwrite")
    .objectStore("categoryStore");

  try {
    return store.get("changeInfoArray");
  } catch (error) {
    console.warn(error);
  }
}

async function recordPomo(startTime, idTokenAndEmail, infoArray, sessionData) {
  let body = null;
  // console.log("info arr in recordPomo", infoArray);

  try {
    const { idToken, email } = idTokenAndEmail;
    const today = new Date(startTime);
    let LocaleDateString = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;

    //#region PLZ
    //!  Type of the final below.
    // {
    //   userEmail: string;
    //   duration: number;
    //   startTime: number;
    //   date: string;
    //   isDummy: boolean;
    //   category?: {
    //     name: string;
    //   };
    // }[]

    const final = convertMilliSecToMin(
      createDataSortedByTimestamp(
        infoArray,
        sessionData.pause.record,
        sessionData.endTime
      )
        .reduce(calculateDurationForEveryCategory, {
          durationArr: [],
          currentType: "focus",
          currentOwner: "",
          currentStartTime: 0,
        })
        .durationArr.reduce(aggregateFocusDurationOfTheSameCategory, {
          c_duration_array: [],
          currentCategoryName: "",
        }).c_duration_array
    ).map((val) => {
      if (val.categoryName !== "uncategorized") {
        return {
          userEmail: email,
          duration: val.duration,
          startTime: val.startTime,
          date: LocaleDateString,
          isDummy: false,
          category: {
            name: val.categoryName,
          },
        };
      } else {
        return {
          userEmail: email,
          duration: val.duration,
          startTime: val.startTime,
          date: LocaleDateString,
          isDummy: false,
        };
      }
    });
    // console.log("final in sw.js<----------------------------------", final);
    //#endregion

    //#region
    BC.postMessage({
      evName: "pomoAdded",
      payload: final,
    });
    // console.log("pubsub event from sw", pubsub.events);

    //#endregion

    //#region Update cache

    let cache = CACHE || (await openCache(CacheName));
    // console.log("CACHE", CACHE);
    // console.log("cache in recordPomo", cache);

    const cacheUrl = BASE_URL + RESOURCE.POMODOROS;
    // console.log("cache address", cacheUrl);

    let statResponse = await cache.match(cacheUrl); //<------ was a problem. statResponse was undefined. Sol: open cache in the message event handler above.
    // console.log("statResponse", statResponse);

    if (statResponse !== undefined) {
      let statData = await statResponse.json();

      try {
        // Put the updated data back into the cache
        await cache.put(
          cacheUrl,
          new Response(JSON.stringify([...statData, ...final]), {
            headers: { "Content-Type": "application/json" },
          })
        );
        console.log("Data successfully cached.");
      } catch (error) {
        console.error("Failed to put data in cache", error);
      }
    } else {
      console.warn(`No existing cache entry found for ${CacheName}.`); // name I defined.
      // console.log(await getCacheNames()); // real ones.
    }
    //#endregion

    await fetchWrapper(
      RESOURCE.POMODOROS,
      "POST",
      {
        pomodoroRecordArr: final,
      },
      idToken
    );
  } catch (error) {
    console.warn(error);
  }
}

async function persistTimersStatesToServer(states, idToken) {
  try {
    if (idToken) {
      // caching
      let cache = CACHE || (await openCache(CacheName));
      let pomoSettingAndTimerStatesResponse = await cache.match(
        BASE_URL + RESOURCE.USERS
      );
      if (pomoSettingAndTimerStatesResponse !== undefined) {
        let pomoSettingAndTimersStates =
          await pomoSettingAndTimerStatesResponse.json();
        pomoSettingAndTimersStates.timersStates = states;
        await cache.put(
          BASE_URL + RESOURCE.USERS,
          new Response(JSON.stringify(pomoSettingAndTimersStates))
        );
      }

      await fetchWrapper(
        RESOURCE.USERS + SUB_SET.TIMERS_STATES,
        "PATCH",
        { ...states },
        idToken
      );
    }
  } catch (error) {
    console.warn(error);
  }
}

async function persistRecOfTodayToServer(record, idToken) {
  try {
    if (idToken) {
      //#region caching
      let cache = CACHE || (await openCache(CacheName));
      let resOfRecordOfToday = await cache.match(
        BASE_URL + RESOURCE.TODAY_RECORDS
      );
      if (resOfRecordOfToday !== undefined) {
        let recordsOfToday = await resOfRecordOfToday.json();
        recordsOfToday.push({
          record,
        });
        await cache.put(
          BASE_URL + RESOURCE.TODAY_RECORDS,
          new Response(JSON.stringify(recordsOfToday))
        );
      }
      //#endregion

      await fetchWrapper(
        RESOURCE.TODAY_RECORDS,
        "POST",
        {
          ...record,
        },
        idToken
      );
    }
  } catch (error) {
    console.warn(error);
  }
}

function identifyPrevSession({ howManyCountdown, numOfPomo, numOfCycle }) {
  if (howManyCountdown === 0) {
    console.log("1");
    return SESSION.VERY_LAST_POMO;
  }

  if (howManyCountdown === 2 * numOfPomo * numOfCycle - 1) {
    console.log("2");
    return SESSION.VERY_LAST_POMO;
  }

  if (numOfCycle > 1) {
    if (numOfPomo > 1) {
      // (numOfPomo, numOfCycle) = (3, 2) -> PBPBPL|PBPBP
      //                         = (2, 3) -> PBPL|PBPL|PBP
      if (howManyCountdown % 2 === 0) {
        if (howManyCountdown % (2 * numOfPomo) === 0) {
          console.log("3");
          return SESSION.LONG_BREAK;
        }
        console.log("4");
        return SESSION.SHORT_BREAK;
      }
      if (howManyCountdown % 2 === 1) {
        if ((howManyCountdown + 1) % (2 * numOfPomo) === 0) {
          console.log("5");
          return SESSION.LAST_POMO;
        }
        console.log("6");
        return SESSION.POMO;
      }
    } else if (numOfPomo === 1) {
      // numOfCycle = 3, 4 -> PL|PL|P, PL|PL|PL|P
      // Short break does not exist
      if (howManyCountdown % 2 === 0) {
        console.log("7");
        return SESSION.LONG_BREAK;
      }
      if (howManyCountdown % 2 === 1) {
        console.log("8");
        return SESSION.LAST_POMO;
      }
    }
  } else if (numOfCycle === 1) {
    // Long break does not exist
    if (numOfPomo > 1) {
      // numOfPomo = 2, 5 -> PBP, PBPBPBPBP
      if (howManyCountdown % 2 === 1) {
        console.log("9");
        return SESSION.POMO;
      }
      if (howManyCountdown % 2 === 0) {
        console.log("10");
        return SESSION.SHORT_BREAK;
      }
    } else if (numOfPomo === 1) {
      // P
      console.log("11");
      return SESSION.VERY_LAST_POMO; // 여기까지 안오고 두번째 conditional block에 걸리네 그냥..
    }
  }

  console.log("12");
  return SESSION.POMO; //dummy
}

/**
 *
 * @param {*} URL string that comes after BASE_URL
 * @param {*} METHOD "POST" | "GET" | "PATCH" | "DELETE"
 * @param {*} data this is going to be stringified
 * @param {*} idToken string
 * @returns
 */
async function fetchWrapper(URL, METHOD, data, idToken) {
  try {
    const response = await fetch(BASE_URL + URL, {
      method: METHOD,
      body: JSON.stringify(data),
      headers: {
        Authorization: "Bearer " + idToken,
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.toLowerCase() === "failed to fetch" &&
      !navigator.onLine
    ) {
      BC.postMessage({
        evName: "fetchCallFailed_Network_Error",
        payload: {
          url: URL,
          method: METHOD,
          data: JSON.stringify(data),
        },
      });
    } else {
      console.warn(error);
    }
  }
}

//#region utilities for category change
//#region transform 1 - to get data sorted by timestamp.
function createDataSortedByTimestamp(
  categoryChangeInfoArray,
  pauseRecord,
  endTime
) {
  const categoryChanges = transformCategoryChanges(categoryChangeInfoArray);
  const pauseRecords = transformPauseRecords(pauseRecord);
  const data = [...categoryChanges, ...pauseRecords];
  data.sort((a, b) => a.timestamp - b.timestamp);
  data.push({ kind: "endOfSession", timestamp: endTime });
  return data;

  function transformCategoryChanges(categoryChangeInfoArray) {
    return categoryChangeInfoArray.map((val) => ({
      kind: "category",
      name: val.categoryName,
      timestamp: val.categoryChangeTimestamp,
    }));
  }

  function transformPauseRecords(pauseRecords) {
    return pauseRecords.flatMap((val) => [
      { kind: "pause", name: "start", timestamp: val.start },
      { kind: "pause", name: "end", timestamp: val.end },
    ]);
  }
}
//#endregion

//#region transform 2: duration for each category
function calculateDurationForEveryCategory(acc, val, idx, _array) {
  if (idx === 0) {
    acc.currentOwner = val.name;
    acc.currentStartTime = val.timestamp;
    return acc;
  }

  const duration_in_ms = val.timestamp - _array[idx - 1].timestamp;

  switch (val.kind) {
    case "pause":
      if (val.name === "start") {
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "pause";
        acc.currentStartTime = val.timestamp;
      }
      if (val.name === "end") {
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
        acc.currentType = "focus";
        acc.currentStartTime = val.timestamp;
      }
      break;
    case "category":
      acc.durationArr.push({
        owner: acc.currentOwner,
        duration: duration_in_ms,
        type: acc.currentType,
        startTime: acc.currentStartTime,
      });
      acc.currentOwner = val.name;
      acc.currentStartTime = val.timestamp;
      break;
    case "endOfSession":
      if (duration_in_ms !== 0) {
        acc.durationArr.push({
          owner: acc.currentOwner,
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime,
        });
      }
      break;
    default:
      break;
  }

  return acc;
}
//#endregion

//#region transform 3: sum up focus durations of the same category.
function aggregateFocusDurationOfTheSameCategory(prev, val, idx) {
  if (idx === 0) {
    prev.c_duration_array.push({
      categoryName: val.owner,
      duration: val.duration,
      startTime: val.startTime,
    });
    prev.currentCategoryName = val.owner;

    return prev;
  }

  if (val.owner === prev.currentCategoryName) {
    if (val.type === "focus") {
      prev.c_duration_array[prev.c_duration_array.length - 1].duration +=
        val.duration;
    }
  }

  if (val.owner !== prev.currentCategoryName) {
    const newDuration = {
      categoryName: val.owner,
      duration: val.type === "focus" ? val.duration : 0,
      startTime: val.startTime,
    };
    prev.c_duration_array.push(newDuration);
    prev.currentCategoryName = val.owner;
  }

  return prev;
}

function convertMilliSecToMin(durationByCategoryArr) {
  return durationByCategoryArr.map((val) => {
    // console.log(
    //   "<-------------------------------convertMilliSecToMin---------------------------------->"
    // );
    // console.log(val);
    return { ...val, duration: Math.floor(val.duration / (60 * 1000)) };
  });
}
//#endregion
//#endregion
