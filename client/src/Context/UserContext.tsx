import {
  useContext,
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import { useAuthContext } from "./AuthContext";
import * as C from "../constants/index";
import { useFetch } from "../Custom-Hooks/useFetch";
import {
  dataCombinedFromIDB,
  obtainStatesFromIDB,
  persistStatesToIDB,
  postMsgToSW,
} from "..";
import { RequiredStatesToRunTimerType } from "../types/clientStatesType";
import { pubsub } from "../pubsub";
import { emptyStateStore, emptyRecOfToday } from "..";
import * as CONSTANTS from "../constants/index";

type UserInfoContextType = {
  pomoInfo: RequiredStatesToRunTimerType | null;
  setPomoInfo: Dispatch<SetStateAction<RequiredStatesToRunTimerType | null>>;
};

export const UserInfoContext = createContext<UserInfoContextType | null>(null);

export function UserInfoContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log(
    `localStorage.getItem("user") === ${localStorage.getItem("user")}`
  );
  const { user, isNewUser, isNewUserRegistered } = useAuthContext()!;
  const [pomoInfo, setPomoInfo] = useFetch<RequiredStatesToRunTimerType>({
    urlSegment: C.URLs.USER,

    /**
     * 다시 생각해보니,
     * 1. 로그인하는 경우
     *  1) 아예 처음 앱을 사용하는 경우 이거나 고의로 로컬 스토리지를 삭제한 후 로그인 하는 경우.
     *     localStorage.getItem("user")  === null
     *  2) 앱을 처음 사용하는 것은 아닌 경우
     *     localStorage.getItem("user")  === "unAuthenticated"
     *
     * 2. 앱이 제로에서 마운트 되는 경우(refresh 하거나 닫았던 앱 다시 열 때)
     *  1) 만약 로그인 한 상태였다면
     *     localStorage.getItem("user") === "authenticated"
     *  2) 그게 아니라면
     *     localStorage.getItem("user") === "unAuthenticated" || null
     *
     * 결론: 2-2)의 경우를 제외한 모든 경우에 callbacks 가 필요하다.
     * 이유:
     *      1은 서버에서 데이터 가져와야하고
     *      2는 다른 브라우저에서 앱을 사용한 경우가 존재한다면,
     *      그 앱에서 서버쪽으로 persist한 데이터들을 받아와서 싱크를 맞추어 줘야 하기 때문.
     *
     */
    // callbacks: [persistTimersStatesToIDB],
    callbacks: [persistRequiredStatesToRunTimer],
    additionalDeps: [isNewUser, isNewUserRegistered],
    additionalCondition: isNewUser === false || isNewUserRegistered,
  });

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  //#region UseEffects
  //* pomoInfo ends up receiving null from useFetch hook when a user is an unlogged-in user.
  useEffect(setPomoSettingToDefault, [user]);
  useEffect(setPomoInfoOfUnLoggedInUser, [user, pomoInfo]);
  //#endregion

  //#region Side Effects

  //! Purpose: to allow _unauthenticated(un-logged-in) users_ to continue to run timer from where they left when refreshing the app.

  function setPomoInfoOfUnLoggedInUser() {
    //? isn't this called when a user logs in but not yet gets its data from server?... //씨발 몰라..
    /**
     * What this condition mean? - unauthenticated user is using the app.
     * When
     * 1. reopening the app
     * 2. refreshing the app
     * 3. deleting all history including indexed DB <-- 이렇게 했을 때. when this happens, pomoInfo is not null.
     * Previously, I want this to also run when logging out, but it didn't
     * I guess, the reason was the same, pomoInfo is not null, but is the one that have been used right before logging out.
     */
    //! 주의: pomoInfo는 로그인을 해서 쓰든 아니든 처음에는 무조건 null값을 갖는다.
    //!        왜냐하면, useFetch에서 처음에 data가 null을 init값으로 설정했기 때문.
    if (pomoInfo === null && localStorage.getItem("user") !== "authenticated") {
      // if (pomoInfo === null) {
      console.log(
        "------------------inside pomoInfo===null && localStorage.getItem(user) !== authenticated------------------"
      );
      const getPomoSettingFromIDB = async () => {
        // when deleting all history including indexed DB... it does not work.
        let states = await obtainStatesFromIDB("withSettings");
        console.log("states in the setPomoInfoOfUnLoggedInUser", states);

        let pomoSetting = doesPomoSettingExist()
          ? (states as dataCombinedFromIDB).pomoSetting
          : {
              pomoDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              numOfPomo: 4,
            };

        let autoStartSetting = doesAutoStartSettingExist()
          ? (states as dataCombinedFromIDB).autoStartSetting
          : {
              doesPomoStartAutomatically: false,
              doesBreakStartAutomatically: false,
            };

        setPomoInfo((prev) => {
          return {
            ...(prev as RequiredStatesToRunTimerType),
            pomoSetting: pomoSetting,
            autoStartSetting: autoStartSetting,
          };
        });

        pubsub.publish("updateAutoStartSetting", {
          autoStartSetting,
        });

        postMsgToSW("saveStates", {
          stateArr: [
            { name: "pomoSetting", value: pomoSetting },
            {
              name: "autoStartSetting",
              value: {
                doesPomoStartAutomatically:
                  autoStartSetting.doesPomoStartAutomatically,
                doesBreakStartAutomatically:
                  autoStartSetting.doesBreakStartAutomatically,
              },
            },
          ],
        });

        function doesPomoSettingExist() {
          return (
            Object.entries(states).length !== 0 &&
            (states as dataCombinedFromIDB).pomoSetting
          );
        }
        function doesAutoStartSettingExist() {
          return (
            Object.entries(states).length !== 0 &&
            (states as dataCombinedFromIDB).autoStartSetting
          );
        }
      };
      getPomoSettingFromIDB();
    }
  }

  // I am going to comment the `useEffect(postSaveStatesMessageToServiceWorker, [user, pomoSetting]);` in the Main.tsx
  // Instead, I will post a message to the service worker to save pomoSetting and autoStartSetting here.
  function setPomoSettingToDefault() {
    if (isRightAfterLogOut()) {
      console.log("setting pomoSetting to default");
      setPomoInfo((prev) => {
        return {
          ...(prev as RequiredStatesToRunTimerType),
          pomoSetting: {
            pomoDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            numOfPomo: 4,
          },
          autoStartSetting: {
            doesPomoStartAutomatically: false,
            doesBreakStartAutomatically: false,
          },
        };
      });

      pubsub.publish("updateAutoStartSetting", {
        autoStartSetting: {
          doesPomoStartAutomatically: false,
          doesBreakStartAutomatically: false,
        },
      });

      postMsgToSW("saveStates", {
        stateArr: [
          {
            name: "pomoSetting",
            value: {
              pomoDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              numOfPomo: 4,
            },
          },
          {
            name: "autoStartSetting",
            value: {
              doesPomoStartAutomatically: false,
              doesBreakStartAutomatically: false,
            },
          },
          { name: "duration", value: 25 },
          { name: "repetitionCount", value: 0 },
          { name: "running", value: false },
          { name: "startTime", value: 0 },
          { name: "pause", value: { totalLength: 0, record: [] } },
        ],
      });

      //
      if (localStorage.getItem("user") === null) {
        console.log("setting L_user to unAuthenticated");
        localStorage.setItem("user", "unAuthenticated");
      }

      //#region New
      emptyRecOfToday().then(() => {
        pubsub.publish("clearObjectStores", 1);
      });
      caches.delete(CONSTANTS.CacheName);
      //#endregion

      //#region Original
      // emptyStateStore()
      //   .then(() => {
      //     return emptyRecOfToday();
      //   })
      //   .then(() => {
      //     pubsub.publish("clearObjectStores", 1);
      //   });
      // caches.delete(CONSTANTS.CacheName);
      //#endregion
    }

    function isRightAfterLogOut() {
      return (
        user === null &&
        pomoInfo !== null &&
        // localStorage.getItem("user") === "authenticated"// 로그아웃만 처리 가능

        localStorage.getItem("user") !== "authenticated" //
      );
    }
  }
  //#endregion

  return (
    <>
      <UserInfoContext.Provider
        value={{ pomoInfo: pomoInfo, setPomoInfo: setPomoInfo }}
      >
        {children}
      </UserInfoContext.Provider>
    </>
  );
}

export function useUserContext() {
  return useContext(UserInfoContext);
}

//! It probably is problematic to persist the states no matter there is already the user's timersStates.
//Idea:
//create a slot regarding whether app is used by auth user or unauth user.
//like this.. {authenticated: boolean; email: string}.
//if authenticated is true and email is the same, do nothing. Just use what already are in the idb.
//if authenticated is false, this is not going to be called... we just might remove authenticated property then...
//if email is different, persist and publish the event.

// TODO: clean code. I can extract some functions from this one. Thus, he can say this function does not do one thing.
async function persistRequiredStatesToRunTimer(
  states: RequiredStatesToRunTimerType
) {
  await persistStatesToIDB(states.timersStates);
  localStorage.setItem("user", "authenticated");
  console.log("persist success - ", states.timersStates);
  pubsub.publish("successOfPersistingTimersStatesToIDB", states.timersStates); // Actually, this event is also indicating that clearing recOfToday objectStore has finished because we put this line after the emptyRecOfToday().

  // This works only for logged-in users.
  // Like the logged-in user, I need to allow unlogged-in users
  // to continue to use the timer with the same setting as the one before they close the app.
  // ->
  postMsgToSW("saveStates", {
    stateArr: [
      { name: "pomoSetting", value: states.pomoSetting },
      { name: "autoStartSetting", value: states.autoStartSetting },
    ],
  });
}
