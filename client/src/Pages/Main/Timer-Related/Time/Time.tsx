import Second from "./Second";
import Mintue from "./Mintue";

type TimeProps = {
  seconds: number;
};

export default function Time({ seconds }: TimeProps) {
  let min = Math.floor(seconds / 60);
  let sec = seconds % 60;

  return (
    <>
      <Mintue minutes={min} />:<Second seconds={sec} />
    </>
  );
}
