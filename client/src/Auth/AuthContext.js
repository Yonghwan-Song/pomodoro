import { useContext, useEffect, useState, createContext } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState({});

  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    // signInWithPopup(auth, provider)
    signInWithRedirect(auth, provider);
  };

  const logOut = () => {
    signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      console.log("User", currentUser); // why is this called twice ?
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    // <AuthContext.Provider value={{ googleSignIn }}> 아래거랑 뭔차이야 대체;
    // In this way, we can use destructuring assignment later
    // <=> value = { { googleSignIn: googleSignIn } } - the syntax above is a shorthand.
    <AuthContext.Provider value={{ googleSignIn, logOut, user }}>
      {children}
    </AuthContext.Provider>
  );
};

// todo: 왜 이렇게 하는거지? custom hook 같은거야?
// 아마도... 이렇게 안하면 대신에 AutContext 를 사용자가 import하고 useContext도 import해야함
// 그런데 이렇게 하면 걍 UserAuth만 import해서
// const userAuth = UserAuth(); 이렇게만 쓰면 간편해보임.
export const UserAuth = () => {
  return useContext(AuthContext);
};
