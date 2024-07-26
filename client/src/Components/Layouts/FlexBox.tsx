import { StyledFlexBox } from "../styles/FlexBox.styled";

type FlexBoxProps = {
  children?: React.ReactNode;
  gap?: string;
  columnGap?: string;
  rowGap?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  flexWrap?: string;
  flexBasis?: string;
  cursor?: string;
};

export function FlexBox({ children, ...props }: FlexBoxProps) {
  return <StyledFlexBox {...props}>{children}</StyledFlexBox>;
}
