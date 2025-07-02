"use client";
import { useLifiWidget } from "../../app/lifiProvider";
import { Button } from "../ui/button";

const LifiWidgetButton = () => {
  const { openWidget } = useLifiWidget();

  return (
    <Button
      onClick={openWidget}
      // style={{
      //   boxShadow: "0 4px #c026d3, 0 2px 8px rgba(0,0,0,0.15)",
      // }}
      className="flex-1 h-14 text-lg rounded-xl border-2 border-black"
      variant="outline"
    >
      li.fi
    </Button>
  );
};

export default LifiWidgetButton;
