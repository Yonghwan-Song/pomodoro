import { StyledBox } from "./styles/Box.styled";

export function BoxShadowWrapper({ children, ...props }) {
  return <StyledBox {...props}>{children}</StyledBox>;
}
