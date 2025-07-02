import { CSSProperties } from "react";
import { StyledGridItem } from "../styles/GridItem.styled";

type GridItemProps = {
  children?: React.ReactNode;
  textAlign?: string;
  backgroundColor?: string;
  columnStart?: number;
  columnEnd?: number;
  rowStart?: number;
  rowEnd?: number;
  width?: string;
  minWidth?: number;
  minHeight?: number;
  style?: CSSProperties;
};

export function GridItem({ children, style, ...props }: GridItemProps) {
  return (
    <StyledGridItem {...props} style={style}>
      {children}
    </StyledGridItem>
  );
}
