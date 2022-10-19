import { useContext, useEffect, useState, createContext } from "react";
import { UserAuth } from "../Auth/AuthContext";
import axios from "axios";
import * as C from "../constants/index";

const UserContext = createContext();

export function UserContextProvider({ children }) {
  const { user } = UserAuth();
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
    if (user !== null && Object.entries(user).length !== 0) {
      getPomoSetting(user);
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ pomoSetting, setPomoSetting }}>
      {children}
    </UserContext.Provider>
  );
}

export function UserInfo() {
  return useContext(UserContext);
}
