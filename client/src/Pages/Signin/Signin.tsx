import React, { useEffect } from "react";
import GoogleButton from "react-google-button";
import { UserAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { postMsgToSW } from "../..";

function Signin() {
  const { googleSignIn, user } = UserAuth()!;

  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      // postMsgToSW(
      //   "sendDataToIndexAndCountDown",
      //   localStorage.getItem("idOfSetInterval")
      // );
      // postMsgToSW("countDown", localStorage.getItem("idOfSetInterval"));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user !== null) {
      // postMsgToSW("countDown", localStorage.getItem("idOfSetInterval"));
      navigate("/timer");
      //It seems like I am betting on the 1000ms to guarantee that
      //the sw ends the timer if the remainingDuration is a negative value.
      // setTimeout(() => {
      //   navigate("/timer");
      // }, 1000);
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-center text-3xl font-bold py-8">Sign in</h1>
      <div className="max-w-[240px] m-auto py-4">
        <GoogleButton onClick={handleGoogleSignIn} />
      </div>
    </div>
  );
}

export default Signin;
