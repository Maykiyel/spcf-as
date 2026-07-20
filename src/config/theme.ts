import {
  createTheme,
  type MantineColorsTuple,
  type DefaultMantineColor,
} from "@mantine/core";

const primary: MantineColorsTuple = [
  "#ffffff",
  "#e6ebfa",
  "#cdd7f6",
  "#b4c4f1",
  "#9bb0ed",
  "#829ce8",
  "#4e73df",
  "#405eb6",
  "#31498d",
  "#233464",
];

const navy: MantineColorsTuple = [
  "#ffffff",
  "#e6e7ee",
  "#cccfdd",
  "#b2b7cb",
  "#999fba",
  "#8087a9",
  "#667098",
  "#4c5887",
  "#0f1e5d",
  "#070e2a",
];

const danger: MantineColorsTuple = [
  "#ffffff",
  "#fce5e3",
  "#f8ccc7",
  "#f5b2ac",
  "#f19890",
  "#ee7f74",
  "#e74a3b",
  "#bd3c30",
  "#922f25",
  "#68211b",
];

const tertiary: MantineColorsTuple = [
  "#ffffff",
  "#e3f5f8",
  "#c6ebf1",
  "#aae1e9",
  "#8dd7e2",
  "#71cddb",
  "#36b9cc",
  "#2c97a7",
  "#227581",
  "#18535c",
];

const success: MantineColorsTuple = [
  "#ffffff",
  "#dff7ee",
  "#bfefde",
  "#9fe8cd",
  "#7ee0bd",
  "#5ed8ac",
  "#1cc88a",
  "#17a371",
  "#127f57",
  "#0d5a3e",
];

const dark: MantineColorsTuple = [
  "#ffffff",
  "#e3e3e5",
  "#c7c7ca",
  "#abacb0",
  "#8f9096",
  "#73747b",
  "#3a3b45",
  "#2f3038",
  "#25252c",
  "#1a1b1f",
];

export const theme = createTheme({
  primaryColor: "primary",
  primaryShade: 6,

  black: "#3a3b45",

  colors: {
    primary,
    navy,
    danger,
    tertiary,
    success,
    dark,
  },

  defaultRadius: "md",

  fontFamily: "Inter, system-ui, sans-serif",
  headings: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: "600",
  },
  components: {
    Menu: {
      defaultProps: {
        transitionProps: {
          transition: {
            in: { opacity: 1, transform: "translateY(0)" },
            out: { opacity: 0, transform: "translateY(-6px)" },
            transitionProperty: "opacity, transform",
          },
          duration: 300,
          timingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
      },
    },
  },
});

type ExtendedCustomColors =
  | "primary"
  | "navy"
  | "danger"
  | "success"
  | "dark"
  | DefaultMantineColor;

declare module "@mantine/core" {
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, MantineColorsTuple>;
  }
}
