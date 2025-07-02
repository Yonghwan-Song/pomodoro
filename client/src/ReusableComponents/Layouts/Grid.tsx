import { CSSProperties } from "react";
import { StyledGrid } from "../styles/Grid.styled";

type GridProps = {
  children?: React.ReactNode;
  maxWidth?: string;
  minWidth?: string;
  justifyItems?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  placeItems?: string;
  placeContent?: string;
  column?: number;
  row?: number;
  autoColumn?: number;
  autoRow?: number;
  columnGap?: string;
  rowGap?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
  style?: CSSProperties;
};

export function Grid({ children, style, ...props }: GridProps) {
  return (
    <StyledGrid {...props} style={style}>
      {children}
    </StyledGrid>
  );
}
