import { memo } from "react";
import OneHour from "./OneHour";

// TODO: prop없이 해도 되는지 문서 읽어보기
const Scale = memo(function Scale() {
  let hourScales: number[] = [];
  for (let i = 0; i < 24; i++) {
    hourScales.push(i * 480); // 480px/hr, 8px/min
  }
  return (
    <>
      {hourScales.map((aScale, index) => {
        return <OneHour cssLeft={aScale} index={index} key={index} />;
      })}
    </>
  );
});

export default Scale;
