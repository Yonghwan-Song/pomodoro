import { ReactComponent as ArrowToTheLeft } from "../../Icons/chevron-left-icon.svg";
import { ReactComponent as ArrowToTheRight } from "../../Icons/chevron-right-icon.svg";

export function LeftArrow({ handleClick }) {
  return (
    <ArrowToTheLeft
      style={{
        cursor: "pointer",
        width: "1em",
        height: "auto",
        opacity: "0.7",
      }}
      onClick={handleClick}
    />
  );
}

export function RightArrow({ handleClick }) {
  return (
    <ArrowToTheRight
      style={{
        cursor: "pointer",
        width: "1em",
        height: "auto",
        opacity: "0.7",
      }}
      onClick={handleClick}
    />
  );
}
