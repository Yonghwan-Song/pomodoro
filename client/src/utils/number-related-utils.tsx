export function roundTo_X_DecimalPoints(num: number, X: number) {
  return Math.round(num * 10 ** X) / 10 ** X;
}

export function getHHmm(duration: number | undefined) {
  if (duration) {
    return `${Math.trunc(duration / 60)}h ${duration % 60}m`;
  } else {
    return "0m";
  }
}

export function getMessageForRemainingDuration(
  remainingUntilMinimum: number,
  remainingUntilIdeal: number
) {
  if (remainingUntilMinimum > 0)
    return (
      <span>
        {/* <span style={{ color: "#F04005" }}> */}
        <span style={{ color: "#4081e9" }}>
          {getHHmm(remainingUntilMinimum)}
        </span>{" "}
        left until minimum
      </span>
    );
  else if (remainingUntilMinimum <= 0 && remainingUntilIdeal > 0)
    return (
      <>
        <span>
          <span style={{ color: "#4081e9" }}>
            {getHHmm(Math.abs(remainingUntilMinimum))}
          </span>{" "}
          beyond minimum
        </span>
        <br />
        <span>
          <span style={{ color: "#5cca90" }}>
            {getHHmm(remainingUntilIdeal)}
          </span>{" "}
          left until ideal
        </span>
      </>
    );
  else
    return (
      <span>
        <span style={{ color: "#5cca90" }}>
          {getHHmm(Math.abs(remainingUntilIdeal))}
        </span>{" "}
        beyond ideal
      </span>
    );
}
