import { useEffect } from "react";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { SW } from "../..";

export default function Main() {
  useEffect(() => {
    return () => {
      SW?.postMessage("sendDataToIndex");
    };
  });
  return (
    <div>
      <PatternTimer />
    </div>
  );
}
