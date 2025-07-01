'use client';
import { LiFiWidget, WidgetConfig, WidgetDrawer } from '@lifi/widget';
import { useRef } from 'react';

const widgetConfig: WidgetConfig = {
  integrator: 'drawer-example',
  subvariant: 'split',
  theme: {
    colorSchemes: {
      light: {
        palette: {
          primary: {
            main: "#5C67FF"
          },
          secondary: {
            main: "#F5B5FF"
          }
        }
      },
      dark: {
        palette: {
          primary: {
            main: "#5C67FF"
          },
          secondary: {
            main: "#F5B5FF"
          },
          background: {
            default: "#F2A6DA",
            paper: "#FFECB8"
          },
          text: {
            primary: "#180C0C",
            secondary: "#371F1F"
          },
        }
      }
    },
    typography: {
      fontFamily: "Inter, sans-serif"
    },
    container: {
      boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.08)",
      borderRadius: "16px",
      height: "400px",
      width: "100%",
    }
  },
  toChain: 59144,
  toToken: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
};

const WidgetPage = () => {
  const drawerRef = useRef<WidgetDrawer>(null);

  const toggleWidget = () => {
    drawerRef.current?.toggleDrawer();
  };

  return (
    <div>
    <button
      className="w-14 h-14 bg-pink-500 text-white rounded-full shadow-lg border-b-4 border-pink-700 active:translate-y-1 transition-all flex items-center justify-center"
      onClick={toggleWidget}
      style={{
        boxShadow: '0 4px #c026d3, 0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      🔻
    </button>
      <LiFiWidget
        ref={drawerRef}
        config={{
          variant: 'drawer',
          ...widgetConfig,
        }}
        integrator="drawer-example"
      />
    </div>
  );
};

export default WidgetPage;
