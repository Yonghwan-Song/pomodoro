import { StyledBox, StyledBoxProps } from "./styles/Box.styled";

type BoxShadowWrapperProp = StyledBoxProps & { children: React.ReactNode };

export function BoxShadowWrapper({ children, ...props }: BoxShadowWrapperProp) {
  return <StyledBox {...props}>{children}</StyledBox>;
}
