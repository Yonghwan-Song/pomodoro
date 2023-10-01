import { useRef } from "react";
import { DurationType } from "../../types/clientStatesType";

type DurationProps = {
  data: DurationType;
};
export default function Duration({ data }: DurationProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const backgroundColor =
    data.subject === "pomo"
      ? "#D08770"
      : data.subject === "break"
      ? "#A3BE8C"
      : "#EBCB8B";
  // 8px/min <-> 480px/h <-> 1920px/4h
  const pixelPerSecond = 8 / 60;
  const converterToMintues = 1 / (60 * 1000);
  const converterToSecond = 1 / 1000;

  let widthBasedOnSeconds = data.duration * converterToSecond * pixelPerSecond;

  function handleMouseOver(ev: React.MouseEvent<HTMLDivElement>) {
    let endTime = data.startTime + data.duration;
    console.log(`${data.startTime} ~ ${endTime}`);
  }

  return (
    <div
      onMouseOver={handleMouseOver}
      ref={divRef}
      style={{
        display: "inline-block",
        height: "60px",
        width: widthBasedOnSeconds + "px",
        backgroundColor: backgroundColor,
        overflow: "hidden",
        border: `${data.subject === "pause" ? "0.5px solid #e25353" : ""}`,
        borderRadius: "7px",
        fontSize: "0.8em",
        fontWeight: "bold",
        textAlign: "center",
        lineHeight: "60px", //to vertically center text
      }}
    >
      {Math.floor(data.duration * converterToMintues)}
    </div>
  );
}
