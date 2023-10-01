import {
  useContext,
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import { UserAuth } from "./AuthContext";
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
  const { user, isNewUser, isNewUserRegistered } = UserAuth()!;
  const [pomoInfo, setPomoInfo] = useFetch<RequiredStatesToRunTimerType>({
    urlSegment: C.URLs.USER,
    callbacks:
      localStorage.getItem("user") === "unAuthenticated" || null
        ? [persistTimersStatesToIDB]
        : undefined,
    additionalDeps: [isNewUser, isNewUserRegistered],
    additionalCondition: isNewUser === false || isNewUserRegistered,
  });

  useEffect(() => {
    console.log("user", user === null ? null : "non-null");
    console.log("pomoInfo", pomoInfo);
    console.log("pomoSetting", pomoInfo?.pomoSetting);
    console.log("timersStates", pomoInfo?.timersStates);
    console.log(
      "------------------------------------------------------------------"
    );
  });
  //! 여기이 sideEffect가 사실... 저 useFetch랑 어떻게보면 합쳐진다고 봐야하는 듯.
  //! pomoSetting이 data fetch해오지도 않았는데 어디서 그랬나 보니 여기인듯.
  useEffect(() => {
    // Purpose:
    // To allow _unauthenticated(un-logged-in) users_ to continue to run timer
    // from where they left when refreshing the app.
    if (pomoInfo === null) {
      const getPomoSettingFromIDB = async () => {
        let states = await obtainStatesFromIDB("withPomoSetting");
        if (
          Object.entries(states).length !== 0 &&
          (states as dataCombinedFromIDB).pomoSetting
        ) {
          setPomoInfo((prev) => {
            return {
              ...(prev as RequiredStatesToRunTimerType), // since pomoInfo is not null in this block
              pomoSetting: (states as dataCombinedFromIDB).pomoSetting,
            };
          });
        } else {
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
      };
      getPomoSettingFromIDB();
    }
  }, [user, pomoInfo]);

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

export function UserInfo() {
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
  pubsub.publish("successOfPersistingTimersStatesToIDB", states.timersStates);
}
