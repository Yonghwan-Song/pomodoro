import { StyledTenMinutes } from "../styles/timeline-related/TenMinutes.styled";

type TenMinutesProps = {
  base: number;
};

export default function TenMinutes({ base }: TenMinutesProps) {
  const colors = {
    opt_1: "#5e81ac",
    opt_2: "#e25353",
    opt_3: "#44475a",
    opt_4: "#363d48",
    opt_5: "#ADB9C5",
  };

  return (
    <StyledTenMinutes colorOptions={colors} n={base}>
      {" "}
    </StyledTenMinutes>
  );
}
