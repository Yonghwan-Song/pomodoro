import { StyledGrid } from "../styles/Grid.styled";

type GridProps = {
  children?: React.ReactNode;
  maxWidth?: string;
  justifyItems?: string;
  alignItems?: string;
  column?: number;
  row?: number;
  autoColumn?: number;
  autoRow?: number;
  columnGap?: string;
  rowGap?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
};

export function Grid({ children, ...props }: GridProps) {
  return <StyledGrid {...props}>{children}</StyledGrid>;
}
