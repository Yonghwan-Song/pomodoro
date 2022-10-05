import { StyledGridItem } from "../styles/GridItem.styled";

export function GridItem({ children, ...props }) {
  return <StyledGridItem {...props}>{children}</StyledGridItem>;
}
