import { useContext, useEffect, useState, createContext } from "react";
import { UserAuth } from "../Auth/AuthContext";
import axios from "axios";
import * as C from "../constants/index";

const UserContext = createContext();

export function UserContextProvider({ children }) {
  const { user, isNewUser, isNewUserRegistered } = UserAuth();
  const [pomoSetting, setPomoSetting] = useState({});

  async function getPomoSetting(user) {
    try {
      const idToken = await user.getIdToken();
      const res = await axios.get(C.URLs.USER + `/${user.email}`, {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      });
      console.log("res obj.data", res.data);
      setPomoSetting(res.data);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    console.log("------------User Context Provider Component------------");
    console.log(user);

    //* Assumption: setUser and setIsNewUser in the AuthContext.js are batched together.
    //* This UserContext Provider component should always be aware if a user is a new user or not
    //* For example, if getPomoSetting is called with a new user passed in as an argument and if the user is not registered in the mongoDB,
    //* API cannot find the PomoSetting data yet.
    //* In other words, user object is obtained from the firebase and the pomoSetting is obtained from mongoDB and we just need the user object's data
    //* when obtaining the pomoSetting. Thus, there might be a synching? issue if the mongoDB database is slower than firebase when registering a new user.
    //* Therefore, to gaurantee a new user registration in mongodb is completed, I created a isNewUserRegistered state in the AuthContext.js
    if (user !== null && !isNewUser) {
      getPomoSetting(user);
    } else if (user && isNewUser) {
      if (isNewUserRegistered) {
        getPomoSetting(user);
      }
    }
  }, [user, isNewUser, isNewUserRegistered]);

  return (
    <UserContext.Provider value={{ pomoSetting, setPomoSetting }}>
      {children}
    </UserContext.Provider>
  );
}

export function UserInfo() {
  return useContext(UserContext);
}
