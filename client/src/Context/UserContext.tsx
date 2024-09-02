import {
  useContext,
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import { useAuthContext } from "./AuthContext";
import { CURRENT_CATEGORY_NAME, RESOURCE } from "../constants/index";
import { useFetch } from "../Custom-Hooks/useFetch";
import {
  dataCombinedFromIDB,
  obtainStatesFromIDB,
  persistCategoryChangeInfoArrayToIDB,
  persistStatesToIDB,
  postMsgToSW,
} from "..";
import { RequiredStatesToRunTimerType } from "../types/clientStatesType";
import { pubsub } from "../pubsub";

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
    urlSegment: RESOURCE.USERS,

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
    callbacks: [persistRequiredStatesToRunTimer],
    additionalDeps: [isNewUser, isNewUserRegistered],
    additionalCondition: isNewUser === false || isNewUserRegistered,
  });

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  //#region UseEffect Calls
  useEffect(setPomoInfoToDefaultAfterLogOut, [user]); //1.
  useEffect(setPomoInfoOfUnLoggedInUser, [user, pomoInfo]); //2.
  // 1. The code in this callback actually runs only right after a user logs out. (`isRightAfterLogOut() returns true`)
  // 2. The code in this callback actually runs
  //    only when (1)`pomoInfo` is/is changed to null. AND (2)localStorage.getItem("user") !== "authenticated".
  //!   Further use cases are described inside the function definition.
  //*참고  pomoInfo ends up receiving null from useFetch hook when a user is an unlogged-in user.
  //#endregion

  //#region Side Effects

  //! Purpose: to allow _unauthenticated(un-logged-in) users_ to continue to run timer from where they left when refreshing the app.
  function setPomoInfoOfUnLoggedInUser() {
    //? isn't this called when a user logs in but not yet gets its data from server?...
    /**
     * What this condition mean? - unauthenticated user is using the app.
     * When
     ** 1. reopening the app
     ** 2. refreshing the app
     ** 3. deleting all history including indexed DB <-- 이렇게 했을 때. when this happens, pomoInfo is not null.
     * Previously, I want this to also run when logging out, but it didn't
     * I guess, the reason was the same, pomoInfo is not null, but is the one that have been used right before logging out.
     */
    //! 주의: pomoInfo는 로그인을 해서 쓰든 아니든 처음에는 무조건 null값을 갖는다.
    //!        왜냐하면, useFetch에서 처음에 data가 null을 init값으로 설정했기 때문.
    if (pomoInfo === null && localStorage.getItem("user") !== "authenticated") {
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
  function setPomoInfoToDefaultAfterLogOut() {
    console.log("setPomoSettingToDefault is called");
    if (isRightAfterLogOut()) {
      console.log("inside if condition: setting pomoSetting to default");
      // setPomoInfo({
      //   timersStates: {
      //     duration: 25,
      //     repetitionCount: 0,
      //     running: false,
      //     startTime: 0,
      //     pause: { totalLength: 0, record: [] },
      //   },
      //   pomoSetting: {
      //     pomoDuration: 25,
      //     shortBreakDuration: 5,
      //     longBreakDuration: 15,
      //     numOfPomo: 4,
      //   },
      //   autoStartSetting: {
      //     doesPomoStartAutomatically: false,
      //     doesBreakStartAutomatically: false,
      //   },
      // });

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

      if (localStorage.getItem("user") === null) {
        console.log("setting L_user to unAuthenticated");
        localStorage.setItem("user", "unAuthenticated");
      }
    }

    function isRightAfterLogOut() {
      return (
        user === null && //1.
        pomoInfo !== null && //2.
        localStorage.getItem("user") !== "authenticated" //3.

        //1. This means that this function actually runs its code only when a user changes from a meaningful user to null
        //2. PomoInfo is not null but it is the pomoInfo of a user who just logged out. I never call setPomoInfo(null).
        //3. localStorage.setItem("user", "unAuthenticated") in the `Components/NavBar/NavBar.tsx/NavBar/handleSignOut`.
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

async function persistRequiredStatesToRunTimer(
  states: RequiredStatesToRunTimerType
) {
  await persistStatesToIDB(states.timersStates);
  localStorage.setItem("user", "authenticated");

  postMsgToSW("saveStates", {
    stateArr: [
      { name: "pomoSetting", value: states.pomoSetting },
      { name: "autoStartSetting", value: states.autoStartSetting },
    ],
  });

  // Ensure the UUIDs are added before proceeding
  await addUUIDToCategory(states);

  await persistCategoryChangeInfoArrayToIDB(states.categoryChangeInfoArray);

  pubsub.publish("successOfPersistingTimersStatesToIDB", states.timersStates);

  const currentCategory = states.categories.find(
    (category) => category.isCurrent
  );

  if (currentCategory) {
    sessionStorage.setItem(CURRENT_CATEGORY_NAME, currentCategory.name);
  } else {
    sessionStorage.removeItem(CURRENT_CATEGORY_NAME);
  }
}

async function addUUIDToCategory(states: RequiredStatesToRunTimerType) {
  states.categories.forEach((category) => {
    category._uuid = window.crypto.randomUUID();
  });

  for (const info of states.categoryChangeInfoArray) {
    const matchingCategory = states.categories.find(
      (category) => category.name === info.categoryName
    );
    info._uuid = matchingCategory?._uuid;
  }
}
