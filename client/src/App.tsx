import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Context/AuthContext";
import { UserContextProvider } from "./Context/UserContext";
import Navbar from "./Components/NavBar/NavBar";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { postMsgToSW } from ".";

export interface ThemeCustomized extends DefaultTheme {
  colors: {
    navBar: string;
    green: string;
    text: string;
  };
  tablet: string;
  mobile: string;
}

const theme = {
  colors: {
    navBar: "#44475a",
    green: "#50fa7b",
    text: "#181313",
  },
  tablet: "1024px",
  mobile: "768px",
};

function App() {
  useEffect(() => {
    console.log("App is updated");
  });

  useEffect(() => {
    console.log("APP is being mounted");

    //#region notification
    if ("Notification" in window) {
      console.log("The Notification property exists in the window namespace");
      if (Notification.permission === "granted") {
        console.log("Permission is granted");
      } else {
        Notification.requestPermission()
          .then(function (result) {
            console.log("result:", result);
            if (Notification.permission === "granted") {
              console.log("Permission is granted");
            }
          })
          .catch((err) => {
            console.log(err);
          });
      }
    } else {
      console.log(
        "The Notification property does not exist in the window namespace"
      );
    }
    //#endregion

    // postMsgToSW("countDown", localStorage.getItem("idOfSetInterval"));
  }, []);

  return (
    <AuthContextProvider>
      <UserContextProvider>
        <ThemeProvider theme={theme}>
          <Navbar />
          <Outlet />
        </ThemeProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}

export default App;
