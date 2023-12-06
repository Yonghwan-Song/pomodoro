import { DurationType } from "../../types/clientStatesType";
import { DurationStyled } from "../styles/timeline-related/Duration.styled";

type DurationProps = {
  data: DurationType;
};

export default function Duration({ data }: DurationProps) {
  const backgroundColor =
    data.subject === "pomo"
      ? "#D08770"
      : data.subject === "break"
      ? "#A3BE8C"
      : "#EBCB8B";
  const converterToMintues = 1 / (60 * 1000);
  const converterToSecond = 1 / 1000;

  function handleMouseOver(ev: React.MouseEvent<HTMLDivElement>) {
    let endTime = data.startTime + data.duration;
    // console.log(`${data.startTime} ~ ${endTime}`);
  }

  return (
    <DurationStyled
      onMouseOver={handleMouseOver}
      durationInSeconds={data.duration * converterToSecond}
      backgroundColor={backgroundColor}
      subject={data.subject}
    >
      {Math.floor(data.duration * converterToMintues)}
    </DurationStyled>
  );
}
