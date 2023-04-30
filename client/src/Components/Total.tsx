import { useEffect, useState } from "react";

type TotalProps = {
  thisTotal: number;
  lastTotal: number;
  message: string;
  target: string;
};

export function Total({ thisTotal, lastTotal, message, target }: TotalProps) {
  /*const [differenceAbsolute, setDifferenceAbsolute] = useState(
    Math.abs(thisTotal - lastTotal)
  );
  const [sign, setSign] = useState(thisTotal - lastTotal >= 0 ? "+" : "-");*/

  const [differenceAbsolute, setDifferenceAbsolute] = useState<number | null>(
    null
  );
  const [sign, setSign] = useState<"+" | "-" | null>(null);

  useEffect(() => {
    if (!differenceAbsolute || !sign) {
      setDifferenceAbsolute(Math.abs(thisTotal - lastTotal));
      setSign(thisTotal - lastTotal >= 0 ? "+" : "-");
    }
    /*
    console.log(`differenceAbsolute - ${differenceAbsolute}`);
    console.log(`sign - ${sign}`);
    console.log(`thisTotal - ${thisTotal}`);
    console.log(`lastTotal - ${lastTotal}`);*/
  });

  return (
    <div>
      <h4>{message}</h4>
      {/* <h4>This {target}</h4> */}
      <h3
        style={{
          color: "#6272a4",
          fontWeight: "bold",
          fontSize: "1.2em",
        }}
      >
        {Math.floor(thisTotal / 60)}h {thisTotal % 60}m
      </h3>
      <p style={{ fontSize: "1.5em", fontWeight: "bold" }}>{"="}</p>
      last {target}{" "}
      <span
        style={{ color: sign === "+" ? "blue" : "red", fontWeight: "bold" }}
      >
        {sign}{" "}
      </span>
      <span style={{ color: sign === "+" ? "blue" : "red" }}>
        {/* {Math.floor(differenceAbsolute / 60)}h {differenceAbsolute % 60}m */}
        {differenceAbsolute !== null
          ? `${Math.floor(differenceAbsolute / 60)}h ${
              differenceAbsolute % 60
            }m`
          : ""}
      </span>{" "}
      {/* <span style={{ fontWeight: "bold" }}>+ </span>last {target} */}
    </div>
  );
}
