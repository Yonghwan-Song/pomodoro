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
import axios from "axios";
import * as C from "../constants/index";

type AuthContextType = {
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
  user: User | null;
  isNewUser: boolean;
  isNewUserRegistered: boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNewUserRegistered, setIsNewUserRegistered] = useState(false);

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
      console.log(`------------------------googleSignIn in AuthContext.js-------------------------
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
      const idToken = await user.getIdToken();
      let response = await axios.post(
        C.URLs.USER,
        {
          email: user.email,
          firebaseUid: user.uid,
        },
        {
          headers: {
            Authorization: "Bearer " + idToken,
          },
        }
      );
      setIsNewUserRegistered(true);
      return response;
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    console.log(`------------Auth Context Provider Component------------`);
    console.log(user);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log(`------------Auth State Changed------------`);
      console.log(currentUser);
      setUser(currentUser);
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

export const UserAuth = () => {
  return useContext(AuthContext);
};
