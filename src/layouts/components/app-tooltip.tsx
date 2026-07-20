import { Tooltip, type TooltipProps } from "@mantine/core";

const createPopTransition = (position: string) => {
  let shiftX = "0px";
  let shiftY = "0px";

  if (position.includes("top")) shiftY = "-4px";
  if (position.includes("bottom")) shiftY = "4px";
  if (position.includes("left")) shiftX = "4px";
  if (position.includes("right")) shiftX = "-4px";

  return {
    in: { opacity: 1, transform: "scale(1) translate(0px, 0px)" },
    out: {
      opacity: 0,
      transform: `scale(0.97) translate(${shiftX}, ${shiftY})`,
    },
    transitionProperty: "transform, opacity",
  };
};

const AppTooltip = ({ ...props }: TooltipProps) => {
  const defaultPosition = props.position ?? "top";

  return (
    <Tooltip
      {...props}
      fw={500}
      transitionProps={{
        transition: createPopTransition(defaultPosition),
        duration: 150,
        timingFunction: "ease-out",
      }}
      style={{
        fontSize: "13px",
      }}
      px={10}
      py={4}
      styles={{
        tooltip: {
          border: "1px solid #070e2a",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1), 0 10px 24px rgba(0, 0, 0, 0.1)",
        },
      }}
      // color="rgba(17, 16, 23, 0.7)"
      color="navy.9"
    />
  );
};

export default AppTooltip;
