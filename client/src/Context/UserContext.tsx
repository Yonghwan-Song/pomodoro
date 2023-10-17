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
} from "..";
import { RequiredStatesToRunTimerType } from "../types/clientStatesType";
import { pubsub } from "../pubsub";

type UserInfoContextType = {
  pomoInfo: RequiredStatesToRunTimerType | null;
  setPomoInfo: Dispatch<SetStateAction<RequiredStatesToRunTimerType | null>>;
};

export const UserContext = createContext<UserInfoContextType | null>(null);

export function UserContextProvider({
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
    callbacks: [persistTimersStatesToIDB],
    additionalDeps: [isNewUser, isNewUserRegistered],
    additionalCondition: isNewUser === false || isNewUserRegistered,
  });

  //#region UseEffects
  //* pomoInfo ends up receiving null from useFetch hook when a user is an unlogged-in user.
  // TODO: better way is, I guess, not calling http api request inside useFetch when user is null. check it out.
  // useEffect(setPomoInfoOfUnLoggedInUser, [pomoInfo]); // Previously, the dep was [user, pomoInfo].
  useEffect(setPomoInfoOfUnLoggedInUser, [user, pomoInfo]); // Previously, the dep was [user, pomoInfo].
  //#endregion

  //#region Side Effects
  // Purpose: to allow _unauthenticated(un-logged-in) users_ to continue to run timer from where they left when refreshing the app.
  function setPomoInfoOfUnLoggedInUser() {
    if (pomoInfo === null) {
      // What this condition mean? - unauthenticated user is using the app.
      // How?
      // 1.close and reopen 2.after refreshing app 3.when deleting all history including indexed DB
      // TODO: write codes for the third case.
      const getPomoSettingFromIDB = async () => {
        // when deleting all history including indexed DB... it does not work.
        //TODO: 1. What's a bit weird in this code below is that I considered only the pomoSetting.
        //TODO: 2. At the same time, I did updated the pomoSetting in the NavBar.tsx when it comes to signing out.
        let states = await obtainStatesFromIDB("withPomoSetting");
        console.log("states in the setPomoInfoOfUnLoggedInUser", states);

        if (doesPomoSettingExist()) {
          setPomoInfo((prev) => {
            return {
              ...(prev as RequiredStatesToRunTimerType), // since pomoInfo is not null in this block
              pomoSetting: (states as dataCombinedFromIDB).pomoSetting,
            };
          });
        }
        if (!doesPomoSettingExist()) {
          setPomoInfo((prev) => {
            return {
              ...(prev as RequiredStatesToRunTimerType),
              pomoSetting: {
                pomoDuration: 25,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                numOfPomo: 4,
              },
            };
          });
        }

        function doesPomoSettingExist() {
          return (
            Object.entries(states).length !== 0 &&
            (states as dataCombinedFromIDB).pomoSetting
          );
        }
      };
      getPomoSettingFromIDB();
    }
  }
  //#endregion

  return (
    <>
      <UserContext.Provider
        value={{ pomoInfo: pomoInfo, setPomoInfo: setPomoInfo }}
      >
        {children}
      </UserContext.Provider>
    </>
  );
}

export function useUserContext() {
  return useContext(UserContext);
}

//! It probably is problematic to persist the states no matter there is already the user's timersStates.
//Idea:
//create a slot regarding whether app is used by auth user or unauth user.
//like this.. {authenticated: boolean; email: string}.
//if authenticated is true and email is the same, do nothing. Just use what already are in the idb.
//if authenticated is false, this is not going to be called... we just might remove authenticated property then...
//if email is different, persist and publish the event.
async function persistTimersStatesToIDB(states: RequiredStatesToRunTimerType) {
  await persistStatesToIDB(states.timersStates);
  localStorage.setItem("user", "authenticated");
  console.log("persist success - ", states.timersStates);
  pubsub.publish("successOfPersistingTimersStatesToIDB", states.timersStates); // Actually, this event is also indicating that clearing recOfToday objectStore has finished because we put this line after the emptyRecOfToday().
}
