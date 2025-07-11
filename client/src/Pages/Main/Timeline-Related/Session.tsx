import { DurationType } from "../../../types/clientStatesType";
import Duration from "./Duration";
import { SessionStyled } from "../../../ReusableComponents/styles/timeline-related/Session.styled";

type SessionProps = {
  durations: DurationType[];
};

export default function Session({ durations }: SessionProps) {
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  // If this value is 0, it means that this session started at the start of today.
  let seconds = Math.floor(
    (durations[0].startTime - startOfTodayTimestamp) / 1000
  );

  return (
    <SessionStyled seconds={seconds}>
      {durations.map((aDuration) => {
        return <Duration data={aDuration} key={aDuration.startTime} />;
      })}
    </SessionStyled>
  );
}
