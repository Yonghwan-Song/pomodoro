import { StyledGridItem } from "../styles/GridItem.styled";

type GridItemProps = {
  children?: React.ReactNode;
  textAlign?: string;
  backgroundColor?: string;
  columnStart?: number;
  columnEnd?: number;
  rowStart?: number;
  rowEnd?: number;
};

export function GridItem({ children, ...props }: GridItemProps) {
  return <StyledGridItem {...props}>{children}</StyledGridItem>;
}
