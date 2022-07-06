import { auth, provider } from "./firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Outlet, Link } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Auth/AuthContext";
import Navbar from "./Components/NavBar/navBar";

function App() {
  // function handleClick() {
  //   signInWithPopup(auth, provider)
  //     .then((result) => {
  //       // This gives you a Google Access Token.
  //       // You can use it to acess the Google API.
  //       const credential = GoogleAuthProvider.credentialFromResult(result);
  //       const token = credential.accessToken;
  //       // The signed-in user info.
  //       const user = result.user;
  //       console.log("credential: ", credential);
  //       console.log("token: ", token);
  //       console.log("user: ", user);
  //     })
  //     .catch((error) => {
  //       // Handle Errors here.
  //       const errorCode = error.code;
  //       const errorMessage = error.message;
  //       // The email of the user's account used.
  //       const email = error.customData.email;
  //       // The AuthCredential type that was used.
  //       const credential = GoogleAuthProvider.credentialFromError(error);
  //       console.log(errorCode);
  //     });
  // }

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
