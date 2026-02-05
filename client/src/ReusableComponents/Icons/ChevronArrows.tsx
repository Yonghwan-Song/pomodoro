import ArrowToTheLeft from "../../Icons/chevron-left-icon.svg?react";
import ArrowToTheRight from "../../Icons/chevron-right-icon.svg?react";

type ArrowsProps = {
  handleClick: (event: React.MouseEvent<SVGSVGElement>) => void;
};

export function LeftArrow({ handleClick }: ArrowsProps) {
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

export function RightArrow({ handleClick }: ArrowsProps) {
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
