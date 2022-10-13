import { Link } from "react-router-dom";
import styled from "styled-components";

const Linkk = ({ children, className, to, onClick }) => {
  return (
    <Link className={className} to={to} onClick={onClick}>
      {children}
    </Link>
  );
};

export const StyledLink = styled(Linkk)`
  text-decoration: none;
  color: ${({ color, theme }) => color || theme.colors.green};

  &:visited {
    color: ${({ color, theme }) => color || theme.colors.green};
  }

  font-size: ${({ size }) => size || "1.5rem"};
  letter-spacing: ${({ letterSpacing }) => letterSpacing || "normal"};

  &:hover {
    font-weight: ${({ hover }) => (hover ? "bold" : "normal")};
  }
`;
