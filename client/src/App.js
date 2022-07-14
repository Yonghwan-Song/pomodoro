import { auth, provider } from "./firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Outlet, Link } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Auth/AuthContext";
import Navbar from "./Components/NavBar/navBar";

function App() {
  //todo: Programatically navigate to <Main /> page.
  // suppoising that this App component is going to be re-rendered after finishing signing in,
  // I think I can utilize useEffect hook to accomplish the re-direction.

  // useEffect(() => {});

  return (
    <div>
      <AuthContextProvider>
        <Navbar />
        <Outlet />
      </AuthContextProvider>
    </div>
  );
}

export default App;
