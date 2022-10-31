import { useContext, useEffect, useState, createContext } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  getAdditionalUserInfo,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";
import * as C from "../constants/index";

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  // const [user, setUser] = useState({}); // user registered to the firebase
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNewUserRegistered, setIsNewUserRegistered] = useState(false);

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const details = getAdditionalUserInfo(result);

      if (details.isNewUser) {
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

  async function registerUser(user) {
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
    if (user === {}) {
      setUser(localStorage.getItem("user"));
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log(`------------Auth State Changed------------`);
      console.log(currentUser);
      setUser(currentUser);
      localStorage.setItem("user", currentUser);
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
