import { StyledFlexBox } from "../styles/FlexBox.styled";

export function FlexBox({ children, ...props }) {
  return <StyledFlexBox {...props}>{children}</StyledFlexBox>;
}
