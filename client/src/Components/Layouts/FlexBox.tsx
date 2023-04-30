import { StyledFlexBox } from "../styles/FlexBox.styled";

type FlexBoxProps = {
  children?: React.ReactNode;
  gap?: string;
  flexDirection?: string;
};

export function FlexBox({ children, ...props }: FlexBoxProps) {
  return <StyledFlexBox {...props}>{children}</StyledFlexBox>;
}
