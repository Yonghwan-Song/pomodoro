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
    callbacks:
      localStorage.getItem("user") === "unAuthenticated" ||
      localStorage.getItem("user") === null
        ? [persistTimersStatesToIDB]
        : undefined,
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
