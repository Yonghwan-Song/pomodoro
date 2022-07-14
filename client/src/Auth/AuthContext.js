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

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState({});
  const [isNew, setIsNew] = useState(null); //TODO: 이거 null로 해되 되는겨?
  const [idToken, setIdToken] = useState("");
  //TODO:
  //?? 아니 근데 시발 이걸 여기다가 놓는 이유가 뭐야? signin은 signin page에서만
  //?? 하면 되잖아.. 그런데 뭐하러 여기다가 만들어서 Signin에서 또 그걸 받아다가 하는거지? 하..?
  //?? 어떤 특별한 이유라도 있는거시야?
  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const { isNewUser } = getAdditionalUserInfo(result);
    setIsNew(isNewUser);
    //?? 아니 이거 return으로 안해줘서 let result = await googleSignIn()이 안된건가?
    //return signInWithRedirect(auth, provider);
  };

  const logOut = () => {
    signOut(auth);
  };

  const registerUser = async (user, idToken) => {
    try {
      // axios call
      // with token
      const response = await axios.post(
        "http://localhost:4444/users",
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
      console.log("res obj", response);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user === {}) {
      setUser(localStorage.getItem("user"));
    }
    if (idToken === "") {
      setIdToken(localStorage.getItem("idToken"));
    }

    console.log("isNewUser", isNew);
    console.log("user", user);
    console.log("idToken", idToken);
    console.log(localStorage.getItem("idToken"));
    console.log("email", user.email);
    console.log("uid", user.uid);

    if (isNew === true) {
      registerUser(user, idToken);
    }

    //! reloading page does not call the observer
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      localStorage.setItem("user", currentUser);
      const token = await currentUser?.getIdToken();
      setIdToken(token);
      localStorage.setItem("idToken", token);
    });

    return () => {
      unsubscribe();
    };
  }, [isNew]); //TODO: 시발 진짜... []했을 때는 안되더니 [isNew]하니까 line36 print 되었음.

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
