import { useEffect } from "react";
import { UserAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { postMsgToSW } from "../..";

export function Vacant() {
  const { user } = UserAuth()!;
  const navigate = useNavigate();

  useEffect(() => {
    if (user !== null) {
      navigate("/timer");
    }
  }, [user]);

  return <div></div>;
}
