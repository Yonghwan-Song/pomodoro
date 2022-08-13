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
  const [user, setUser] = useState({});
  const [isNew, setIsNew] = useState(null);

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const { isNewUser } = getAdditionalUserInfo(result);
    setIsNew(isNewUser);
  };

  const logOut = () => {
    signOut(auth);
  };

  async function registerUser(user) {
    try {
      const response = await axios.post(
        C.URLs.USER,
        {
          email: user.email,
          firebaseUid: user.uid,
        },
        {
          headers: {
            Authorization: "Bearer " + user.accessToken,
          },
        }
      );
      console.log("res obj", response);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    if (user === {}) {
      setUser(localStorage.getItem("user"));
    }
    if (isNew === true) {
      registerUser(user);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      localStorage.setItem("user", currentUser);
    });

    return () => {
      unsubscribe();
    };
  }, [isNew]);

  return (
    <AuthContext.Provider value={{ googleSignIn, logOut, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const UserAuth = () => {
  return useContext(AuthContext);
};
