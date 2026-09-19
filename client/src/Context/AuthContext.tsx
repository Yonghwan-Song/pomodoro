import React, { useContext, useEffect, useState, createContext } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getAdditionalUserInfo,
  User,
} from 'firebase/auth';

import { auth } from '../firebase';
import { axiosInstance } from '../axios-and-error-handling/axios-instances';
import {
  CURRENT_CATEGORY_NAME,
  RESOURCE,
  SUCCESS_PersistingTimersStatesWithCycleInfoToIDB,
} from '../constants';
import {
  DataFromServer,
  useBoundedPomoInfoStore,
} from '../zustand-stores/pomoInfoStoreUsingSlice';
import {
  dataCombinedFromIDB,
  obtainStatesFromIDB,
  persistCategoryChangeInfoArrayToIDB,
  persistStatesToIDB,
  setStateStoreToDefault,
} from '..';
import { Category, CategoryChangeInfo } from '../types/clientStatesType';
import { pubsub } from '../pubsub';
import { deselectCurrentTaskIfRemoved } from '../Pages/Main/Todoist-Related/todoist-utility';

type AuthContextType = {
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
  user: User | null;
  isNewUser: boolean;
  isNewUserRegistered: boolean;
  isNewUserBeingRegistered: boolean;
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
  const [isNewUserBeingRegistered, setIsNewUserBeingRegistered] =
    useState(false);
  const [isUserNewlyRegistered, setIsUserNewlyRegistered] = useState(false);
  const [isUserNew, setIsUserNew] = useState(false);
  const populateExistingUserStates = useBoundedPomoInfoStore(
    (state) => state.populateExistingUserStates,
  );
  const populateNonSignInUserStates = useBoundedPomoInfoStore(
    (state) => state.populateNonSignInUserStates,
  );
  const updatePomoSetting = useBoundedPomoInfoStore(
    (state) => state.setPomoSetting,
  );
  const updateAutoStartSetting = useBoundedPomoInfoStore(
    (state) => state.setAutoStartSetting,
  );

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // TODO: add it.
      // NOTE: signInWithPopup -> authDomain (referer) -> 키 제한에 허용시켜야
      // localhost:3001에서 앱을 열어도, Firebase Google 로그인은 내부적으로 authDomain(지금
      // 은 pomodoro-ef5e0.firebaseapp.com)의 iframe/popup을 통해 통신합니다.
      // 그래서 API 서버 입장에서는 요청 referer가
      // https://pomodoro-ef5e0.firebaseapp.com/...로 보일 수 있어요.
      // 즉:
      // - 앱 시작: http://localhost:3001
      // - 실제 인증 보조 요청: https://pomodoro-ef5e0.firebaseapp.com 쪽에서 발생
      // - 그래서 키 제한에 firebaseapp.com 도메인도 허용 필요
      const result = await signInWithPopup(auth, provider);
      const details = getAdditionalUserInfo(result);

      if (!details) return;

      if (details.isNewUser) {
        setIsNewUserBeingRegistered(true);
        const res = await registerUser(result.user);
        setIsNewUser(true);
        setIsUserNew(true);
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
      const response = await axiosInstance.post(RESOURCE.USERS, {
        firebaseUid: user.uid,
      });
      setIsNewUserRegistered(true); // deprecated
      setIsUserNewlyRegistered(true);
      setIsNewUserBeingRegistered(false);
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
        const pomoSetting = states.cycleSettings.find(
          (setting) => setting.isCurrent,
        )?.pomoSetting;

        // console.log("data from server", states);

        //1. persist TimerSliceStates to Indexed DB
        await persistStatesToIDB(states.timersStates);

        persistStatesToIDB({
          pomoSetting,
          autoStartSetting: states.autoStartSetting,
          currentCycleInfo: states.currentCycleInfo,
        });
        //2.
        localStorage.setItem('user', 'authenticated');

        //3. to ensure that categories are uniquely identified on the client side.
        await addUUIDToCategory(
          states.categories,
          states.categoryChangeInfoArray,
        );

        //4. assign states to the zustand store
        // 이렇게 안하고 그냥 non-null assertion operator 쓰면 되긴 하는데 그냥 쓰기 싫어서 이렇게 했음.
        if (pomoSetting) populateExistingUserStates({ ...states, pomoSetting });
        else
          populateExistingUserStates({
            ...states,
            pomoSetting: {
              pomoDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              numOfPomo: 4,
              numOfCycle: 1,
            },
          });

        // 앱을 닫아둔 사이 Todoist에서 완료/삭제된 태스크가 선택된 채로 남아있을 수 있음.
        await deselectCurrentTaskIfRemoved(
          new Set(states.todoistTasks.map((task) => task.id)),
        );

        //
        await persistCategoryChangeInfoArrayToIDB(
          states.categoryChangeInfoArray,
        );
        pubsub.publish(SUCCESS_PersistingTimersStatesWithCycleInfoToIDB, {
          timersStates: states.timersStates,
          currentCycleInfo: states.currentCycleInfo,
        });

        //
        const currentCategory = states.categories.find(
          (category) => category.isCurrent,
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
    // NOTE: 중요한 것은 이 두개의 boolean함수가 실행되는 시점은 새롭게 가입하는 사람의 post의 response를 제외하고는,
    // server에서 데이터를 가져와서 뭔가 확인하고 그러는게 아니라는것.
    // 제한된 정보를 갖고 다시한번 아래의 두 함수들이 제대로 작동하도록 조건들의 조합을 찾아내야함.
    // 1. user!==null은 당연하고, 혹시 L83에 registerUser() 호출하기 전에 isBeingRegistered라고 boolean local state을 만들고,
    // isBeingRegistered === true이면, 판단 보류시키는 뭐 그런거 만들어야하나
    function isLoggedInUserExisting() {
      // console.log('Inside isLoggedInUserExisting()');
      // console.log('------------------------------>');
      // console.log('user', user);
      // console.log('isNewUserBeingRegistered', isNewUserBeingRegistered);
      // console.log('isUserNew', isUserNew);
      // console.log('<------------------------------');
      return (
        user !== null &&
        isNewUserBeingRegistered !== true &&
        isUserNew === false
      );
      // return user !== null && isUserNew === false; // Original
    }
    function isLoggedInUserNew() {
      // console.log('Inside isLoggedInUserNew()');
      // console.log('------------------------------>');
      // console.log('user', user);
      // console.log('isUserNew', isUserNew);
      // console.log('isUserNewlyRegistered', isUserNewlyRegistered);
      // console.log('<------------------------------');
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
      // NOTE: google쪽에서 user를 만들어 내서 auth의 관점에서 user를 받아냈다는 것이 server에서도 user가 등록 완료되었다는 것을 의미하지 않는다.
      // 그래서... 위의 isLoggedInUserExisting 이게 다른 조건문이 필요함
      // WARNING: 위에서 씨부린말 무슨 말인지 잘 모르겠고, 새로 가입한 사람이라도,
      // db 작업이 다 끝나서 googleSignIn method의 registerUser()작업이 완료되기 전이라도, user가 null이 아니게 되어서
      // 이 setUp함수가 호출될 수 있고, 그렇다면 user는 new이긴 하지만 아직 isUserNew가 false인 상태임.
      // 그래서 isLoggedInUserExisting() evaluates to true. And this leads to populateDataFromServer() call,
      // where `axiosInstance.get(RESOURCE.USERS)` is called that leads to 5000 internal error (due to non-existing user)
      // IMPT: 문제는 전제의 오류: google auth server가 user를 identity인가? 를 만들어내는 타이밍이 "느리거나 같다"
      // with -> Server가 user를 만들어내는 타이밍
      // 그런데 이게 MongoDB Atlas에서는 통했고, Neon PG에서는 안통했음.
      // DESIGN: isLoggedInUserExisting()과 isLoggedInUserNew()가 정확히 작동할 수 있게 global state을 몇개 더 만들거나...
      // 뭔 짓거리를 해야함.
    }
  }, [user, isUserNew, isUserNewlyRegistered, isNewUserBeingRegistered]);

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
      const states = await obtainStatesFromIDB('withSettings');

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
      return localStorage.getItem('user') !== 'authenticated';
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
        isNewUserBeingRegistered,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  return useContext(AuthContext);
};

async function addUUIDToCategory(
  categories: Category[],
  categoryChangeInfoArray: CategoryChangeInfo[],
) {
  categories.forEach((category) => {
    category._uuid = window.crypto.randomUUID();
  });

  for (const info of categoryChangeInfoArray) {
    const matchingCategory = categories.find(
      (category) => category.name === info.categoryName,
    );
    info._uuid = matchingCategory?._uuid;
  }
}
