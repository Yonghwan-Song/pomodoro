import { useEffect, useState } from "react";

type TotalProps = {
  thisTotal: number;
  lastTotal: number;
  target: string;
};

export function TotalComparison({ thisTotal, lastTotal, target }: TotalProps) {
  const [sign, setSign] = useState<"+" | "-">(() => {
    const SIGN = thisTotal - lastTotal >= 0 ? "+" : "-";

    return SIGN;
  });

  useEffect(() => {
    setSign(thisTotal - lastTotal >= 0 ? "+" : "-");
    // console.log("TARGET =>", target);
    // console.log(`thisTotal - ${thisTotal}`);
    // console.log(`lastTotal - ${lastTotal}`);
  }, [thisTotal, lastTotal]);

  const styles = {
    opt1: {
      color: "#6272a4",
      fontWeight: "bold",
      fontSize: "1.2em",
    },
    opt2: {
      fontSize: "1.5em",
      fontWeight: "bold",
    },
    opt3: { color: sign === "+" ? "blue" : "red", fontWeight: "bold" },
    opt4: { color: sign === "+" ? "blue" : "red" },
  };

  const ABSOLUTE_DIFF = `${Math.floor(Math.abs(thisTotal - lastTotal) / 60)}h ${
    Math.abs(thisTotal - lastTotal) % 60
  }m`;

  return (
    <div>
      <h4>{target === "day" ? "To" + target : "This " + target}</h4>
      <h3 style={styles.opt1}>
        {Math.floor(thisTotal / 60)}h {thisTotal % 60}m
      </h3>
      {/* <p style={styles.opt2}>{"="}</p> */}
      last {target} <span style={styles.opt3}>{sign} </span>
      <span style={styles.opt4}>{ABSOLUTE_DIFF}</span>
    </div>
  );
}
