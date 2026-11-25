import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.TRAVEL_LOCAL_CHATGPT === "1" ? ".next/local" : ".next",
  logging: { incomingRequests: { ignore: [/\/auth\/callback/] } },
};
export default config;
