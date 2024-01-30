import { useEffect } from "react";
import GoogleButton from "react-google-button";
import { useAuthContext } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { emptyRecOfToday } from "../..";
import { errController } from "../../APIs-Related/errorController";

function Signin() {
  const { googleSignIn, user } = useAuthContext()!;

  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      await emptyRecOfToday();
      await errController.getFailedReqsFromIDB();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user !== null) {
      navigate("/timer");
    }
  }, [user]);

  return (
    <main>
      <h1 className="text-center text-3xl font-bold py-8">Sign in</h1>
      <div className="max-w-[240px] m-auto py-4">
        <GoogleButton onClick={handleGoogleSignIn} />
      </div>
    </main>
  );
}

export default Signin;
