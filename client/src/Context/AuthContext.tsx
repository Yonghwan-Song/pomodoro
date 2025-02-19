import React, { useContext, useEffect, useState, createContext } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getAdditionalUserInfo,
  User,
} from "firebase/auth";

import { auth } from "../firebase";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import {
  CURRENT_CATEGORY_NAME,
  RESOURCE,
  SUCCESS_PersistingTimersStatesWithCycleInfoToIDB,
} from "../constants";
import {
  DataFromServer,
  useBoundedPomoInfoStore,
} from "../zustand-stores/pomoInfoStoreUsingSlice";
import {
  dataCombinedFromIDB,
  obtainStatesFromIDB,
  persistCategoryChangeInfoArrayToIDB,
  persistStatesToIDB,
  postMsgToSW,
  setStateStoreToDefault,
} from "..";
import { RequiredStatesToRunTimerType } from "../types/clientStatesType";
import { pubsub } from "../pubsub";

type AuthContextType = {
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
  user: User | null;
  isNewUser: boolean;
  isNewUserRegistered: boolean;
};

// AuthContext is going to be provided by AuthContextProvider,
// thus, AuthContext cannot be null.
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNewUserRegistered, setIsNewUserRegistered] = useState(false);
  const [isUserNewlyRegistered, setIsUserNewlyRegistered] = useState(false);
  const [isUserNew, setIsUserNew] = useState(false);
  const populateExistingUserStates = useBoundedPomoInfoStore(
    (state) => state.populateExistingUserStates
  );
  const populateNonSignInUserStates = useBoundedPomoInfoStore(
    (state) => state.populateNonSignInUserStates
  );
  const updatePomoSetting = useBoundedPomoInfoStore(
    (state) => state.setPomoSetting
  );
  const updateAutoStartSetting = useBoundedPomoInfoStore(
    (state) => state.setAutoStartSetting
  );

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const details = getAdditionalUserInfo(result);

      if (!details) return;

      if (details.isNewUser) {
        setIsNewUser(true);
        setIsUserNew(true);
        await registerUser(result.user);
      } else {
        setIsUserNew(false);
      }
    } catch (error) {
      console.warn(`------------------------googleSignIn in AuthContext.js-------------------------
      ${error}`);
    }
  };

  const logOut = async () => {
    await signOut(auth);
    // 이거.. 해야하나? 어차피 새로고침 하긴 하는데...
    setUser(null);
    setIsUserNew(false);
    setIsNewUser(false);
  };

  /**
   * Purpose: To ensure that the default values for the new user are set before trying to fetch the user data from server.
   *          조금 비효율적이긴 한데...
   *          TODO: 그냥 default값들 여기 클라이언트 사이드에서 주면 되는거 아니야?...
   *
   * @param user there is no possibility of user being null since this is going to be called as soon as a user logs in. Thus, type is User unlike User | null of the state variable.
   * @returns
   */
  async function registerUser(user: User) {
    try {
      let response = await axiosInstance.post(RESOURCE.USERS, {
        firebaseUid: user.uid,
      });
      setIsNewUserRegistered(true);
      setIsUserNewlyRegistered(true);
      return response;
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    async function populateDataFromServer() {
      try {
        const response = await axiosInstance.get(RESOURCE.USERS);
        const states = response.data as DataFromServer;

        //1. persist TimerSliceStates to Indexed DB
        await persistStatesToIDB(states.timersStates);
        postMsgToSW("saveStates", {
          stateArr: [
            { name: "pomoSetting", value: states.pomoSetting },
            { name: "autoStartSetting", value: states.autoStartSetting },
            { name: "currentCycleInfo", value: states.currentCycleInfo },
          ],
        });
        //2.
        localStorage.setItem("user", "authenticated");

        //3. to ensure that categories are uniquely identified on the client side.
        await addUUIDToCategory(states);

        //4. assign states to the zustand store
        populateExistingUserStates(states);

        //
        await persistCategoryChangeInfoArrayToIDB(
          states.categoryChangeInfoArray
        );
        pubsub.publish(SUCCESS_PersistingTimersStatesWithCycleInfoToIDB, {
          timersStates: states.timersStates,
          currentCycleInfo: states.currentCycleInfo,
        });

        //
        const currentCategory = states.categories.find(
          (category) => category.isCurrent
        );
        if (currentCategory) {
          sessionStorage.setItem(CURRENT_CATEGORY_NAME, currentCategory.name);
        } else {
          sessionStorage.removeItem(CURRENT_CATEGORY_NAME);
        }
      } catch (error) {
        console.warn(error);
      }
    }
    function isLoggedInUserExisting() {
      return user !== null && isUserNew === false;
    }
    function isLoggedInUserNew() {
      return (
        user !== null && isUserNew === true && isUserNewlyRegistered === true
      );
    }

    // console.log("user", user);
    // console.log("isUserNew", isUserNew);
    // console.log("isUserNewlyRegistered", isUserNewlyRegistered);

    // 1. user is updated first followed by isUserNew - true && false -> again with isUserNew later
    // 2. isUserNew is updated first followed by user - false && whatever -> again with user later
    // 3. user and isUserNew is updated together becuase of batching states internally(???) - no problem
    if (isLoggedInUserExisting() || isLoggedInUserNew()) {
      populateDataFromServer();
    }
  }, [user, isUserNew, isUserNewlyRegistered]);

  //
  /**
   * Purpose:
   *  1. to sync the pomoSetting and autoStartSetting of an unlogged-in user by updating it with data from IDB
   *  2. if there are no data in IDB, populate the stateStore with default states.
   */
  //#region For non signed-in users
  useEffect(() => {
    /**
     * This function also pushes default values of the states if IDB does not have existing values for them.
     * ! 이렇게 하면 Main에서 statesRelatedToTimer와 currentCycleInfo가 {}값을 가질 수 없다.
     * ! 그래서 TimerController에서 값 initialize할 때 복잡한 init함수들 적용하지 않아도 될 듯. :::...
     */

    async function getAndSetStatesFromIDBForNonSignedInUsers() {
      let states = await obtainStatesFromIDB("withSettings");

      // 1. non-signed-in user가 이전에 사용하던 정보가 Indexed DB에 존재하는 경우.
      if (Object.entries(states).length !== 0) {
        const {
          pomoSetting,
          autoStartSetting,
          currentCycleInfo,
          ...timersStates
        } = states as dataCombinedFromIDB;
        populateNonSignInUserStates({
          pomoSetting,
          autoStartSetting,
          currentCycleInfo,
          timersStates,
        });
      } else {
        //2. non-signed-in user가 app을 처음 사용하는 경우.
        setStateStoreToDefault();
        // globalState은 아래 두 경우를 제외하고는 앱 열때 default값으로 먼저 설정되서 상관 없음.
        updatePomoSetting({
          pomoDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          numOfPomo: 4,
          numOfCycle: 1,
        });
        updateAutoStartSetting({
          doesPomoStartAutomatically: false,
          doesBreakStartAutomatically: false,
          doesCycleStartAutomatically: false,
        });
      }
    }

    function isNonSignInUser() {
      return localStorage.getItem("user") !== "authenticated";
    }

    if (isNonSignInUser()) {
      getAndSetStatesFromIDBForNonSignedInUsers();
    }
  }, []);
  //#endregion

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (incomingUser) => {
      // console.log(`------------Auth State Changed------------`);
      // console.log("currentUser", user);
      // console.log("incomingUser", incomingUser);

      // null -> null does not update AuthContextProvider:::...
      setUser(incomingUser);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        googleSignIn,
        logOut,
        user,
        isNewUser,
        isNewUserRegistered,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  return useContext(AuthContext);
};

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
