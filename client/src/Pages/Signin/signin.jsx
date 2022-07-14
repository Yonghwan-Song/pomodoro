import React, { useEffect } from "react";
import GoogleButton from "react-google-button";
import { UserAuth } from "../../Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { getAdditionalUserInfo } from "firebase/auth";
import { useState } from "react";

const Signin = () => {
  const { googleSignIn, user } = UserAuth();

  const navigate = useNavigate();

  // const handleGoogleSignIn = async () => {
  //   try {
  //     let result = await googleSignIn();
  //     const { isNewUser } = getAdditionalUserInfo(result);
  //     setTimeout(() => console.log(isNewUser), 2500);
  //     //?? reloading은 어느시점에서 되는거냐 대체? 하..
  //     //!
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  const handleGoogleSignIn = () => {
    try {
      googleSignIn();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user != null) {
      navigate("/timer");
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
};

export default Signin;
