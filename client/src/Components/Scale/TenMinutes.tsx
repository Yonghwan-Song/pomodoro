type TenMinutesProps = {
  n: number;
};

export default function TenMinutes({ n }: TenMinutesProps) {
  const color = {
    opt_1: "#5e81ac",
    opt_2: "#e25353",
    opt_3: "#44475a",
    opt_4: "#363d48",
    opt_5: "#ADB9C5",
  };
  const sideLength = n !== 3 ? 20 : 30;
  return (
    <div
      key={n}
      style={{
        position: "absolute",
        top: "0px",
        left: `${n * 80}px`,
        border: `1.5px solid ${n === 3 ? color.opt_3 : color.opt_3}`,
        borderRadius: "20%",
        backgroundColor: `${n === 3 ? color.opt_2 : color.opt_3}`,
        height: sideLength + "px",
        width: sideLength + "px",
        translate: "-50% -95%",
        rotate: "-45deg",
        zIndex: 1,
      }}
    >
      {" "}
    </div>
  );
}
