import { StyledGrid } from "../styles/Grid.styled";

type GridProps = {
  children?: React.ReactNode;
  maxWidth?: string;
  justifyItems?: string;
  column?: number;
  gap?: string;
};

export function Grid({ children, ...props }: GridProps) {
  return <StyledGrid {...props}>{children}</StyledGrid>;
}
