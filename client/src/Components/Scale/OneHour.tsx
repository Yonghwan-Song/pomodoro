import { StyledNumberForTime } from "../styles/timeline-related/NumberForTime.styled";
import { StyledOneHour } from "../styles/timeline-related/OneHour.styled";
import TenMinutes from "./TenMinutes";

type OneHourProps = {
  base: number;
  index: number;
};

export default function OneHour({ base, index }: OneHourProps) {
  const borderColor = "#9ca0bb";

  return (
    <>
      <StyledNumberForTime base={base}>{index}</StyledNumberForTime>
      <StyledOneHour base={base} borderColor={borderColor}>
        {[0, 1, 2, 3, 4].map((n) => {
          return <TenMinutes base={n + 1} key={n} />;
        })}
      </StyledOneHour>
    </>
  );
}
