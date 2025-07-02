"use client";
import { createContext, useRef, useContext } from "react";
import { LiFiWidget, WidgetDrawer, WidgetConfig } from "@lifi/widget";

const widgetConfig: WidgetConfig = {
  integrator: "drawer-example",
  subvariant: "split",
  appearance: "light",
  hiddenUI: ["appearance"],
  theme: {
    colorSchemes: {
      light: {
        palette: {
          primary: { main: "#5C67FF" },
          secondary: { main: "#F5B5FF" },
          background: {
            default: "#F2A6DA",
            paper: "#FFECB8",
          },
          text: {
            primary: "#180C0C",
            secondary: "#371F1F",
          },
        },
      },
      dark: {
        palette: {
          primary: { main: "#5C67FF" },
          secondary: { main: "#F5B5FF" },
        },
      },
    },
    typography: { fontFamily: "Inter, sans-serif" },
    container: {
      boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.08)",
      borderRadius: "16px",
      height: "400px",
      width: "100%",
    },
  },
  toChain: 59144,
  toToken: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
};

const LifiWidgetContext = createContext<{ openWidget: () => void } | null>(
  null
);

export function LifiWidgetDrawerProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const drawerRef = useRef<WidgetDrawer>(null);
  const openWidget = () => drawerRef.current?.toggleDrawer();

  return (
    <LifiWidgetContext.Provider value={{ openWidget }}>
      {children}
      <LiFiWidget
        ref={drawerRef}
        config={{ variant: "drawer", ...widgetConfig }}
        integrator="drawer-example"
      />
    </LifiWidgetContext.Provider>
  );
}

export const useLifiWidget = () => {
  const ctx = useContext(LifiWidgetContext);
  if (!ctx)
    throw new Error(
      "useLifiWidget must be used within LifiWidgetDrawerProvider"
    );
  return ctx;
};
