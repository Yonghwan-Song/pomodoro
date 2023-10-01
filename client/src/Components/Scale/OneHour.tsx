import { useEffect } from "react";
import TenMinutes from "./TenMinutes";

type OneHourProps = {
  cssLeft: number;
  index: number;
};

export default function OneHour({ cssLeft, index }: OneHourProps) {
  const borderColor = "#9ca0bb";

  // useEffect(() => {
  //   console.log(`OneHourScale(${index}) is updated!`);
  // });

  return (
    <>
      <p
        style={{
          position: "absolute",
          height: " 20px",
          top: "-23px",
          left: cssLeft + "px",
          color: "#d9d8e2",
          zIndex: 1000,
        }}
      >
        {index}
      </p>
      <div
        style={{
          height: "80px",
          width: "480px",
          position: "absolute",
          top: "0px",
          left: cssLeft + "px",
          borderLeft: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div
          style={{
            height: "79px",
            width: "480px",
            position: "absolute",
          }}
        >
          {[0, 1, 2, 3, 4].map((num) => {
            return <TenMinutes n={num + 1} key={num} />;
          })}
        </div>
      </div>
    </>
  );
}
