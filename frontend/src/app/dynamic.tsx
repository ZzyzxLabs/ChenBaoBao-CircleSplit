"use client";
import dynamic from "next/dynamic";
export const LifiWidgetDrawerProvider = dynamic(
  () => import("./lifiProvider").then((m) => m.LifiWidgetDrawerProviderInner),
  { ssr: false }
);
