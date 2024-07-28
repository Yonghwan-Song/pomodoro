import { memo } from "react";
import OneHour from "./OneHour";

const Scale = memo(function Scale() {
  return (
    <>
      {[
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23,
      ].map((n) => {
        return <OneHour base={n} index={n} key={n} />;
      })}
    </>
  );
});

export default Scale;
