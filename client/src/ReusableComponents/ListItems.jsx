export const ListItems = ({ children }) => {
  return children.map((item, index) => {
    return <li>{item}</li>;
  });
};
