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

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const details = getAdditionalUserInfo(result);

      if (details !== null && details.isNewUser) {
        setIsNewUser(true);
        let userRegistered = await registerUser(result.user);
        console.log(userRegistered);
      }
    } catch (error) {
      console.warn(`------------------------googleSignIn in AuthContext.js-------------------------
      ${error}`);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  /**
   *
   * @param user there is no possibility of user being null since this is going to be called as soon as a user logs in. Thus, type is User unlike User | null of the state variable.
   * @returns
   */
  async function registerUser(user: User) {
    try {
      let response = await axiosInstance.post("users", {
        email: user.email,
        firebaseUid: user.uid,
      });
      setIsNewUserRegistered(true);
      return response;
    } catch (err) {
      console.log(err);
    }
  }

  //#region To Observe LifeCycle
  // useEffect(() => {
  //   console.log(
  //     `------------Auth Context Provider Component was Mounted------------`
  //   );

  //   console.log(user);
  //   console.log("mount count", ++mountCount.current);

  //   return () => {
  //     console.log(
  //       `------------Auth Context Provider Component was unMounted------------`
  //     );
  //     console.log(user);
  //   };
  // }, []);

  // useEffect(() => {
  //   console.log(
  //     "------------Auth Context Provider Component was updated------------"
  //   );
  //   console.log(user);
  //   console.log("render count", ++updateCount.current);
  // });
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
