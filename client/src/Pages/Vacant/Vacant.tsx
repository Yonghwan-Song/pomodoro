import { useEffect } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";

export function Vacant() {
  const { user } = useAuthContext()!;
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/timer");
  }, [user]);

  return <div></div>;
}
