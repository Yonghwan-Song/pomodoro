import { StyledGrid } from "../styles/Grid.styled";

export function Grid({ children, ...props }) {
  return <StyledGrid {...props}>{children}</StyledGrid>;
}
