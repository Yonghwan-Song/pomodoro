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

    //  1. This line is executed when loading this app.
    //! 2. Problem: What if Main and its decendents are rendered before the TimerRelatedStates variable is assigned the data.
    //* 3. I think this one should be a little bit different
    //*    than the function call in the Main.tsx for the case
    //*    a user closed the app while the timer was running.
    //*    Before the PT and T initialize their states with a wrong TimerRelatedStates,
    //*    It should be checked whether the timer was supposed to end
    //*    while this app was closed. Otherwise, the timer will show minus value
    //*    for the remaining duration.
    postMsgToSW("sendDataToIndex", localStorage.getItem("idOfSetInterval"));
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
