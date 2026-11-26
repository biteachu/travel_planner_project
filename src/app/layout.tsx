import type { Metadata, Viewport } from "next";
import { InstallApp } from "../components/InstallApp";
import "./globals.css";
export const metadata: Metadata = {
  title: "여행의 결 | 나만의 여행 가이드북",
  description:
    "취향을 따라 계획하고, 한 권으로 간직하는 여행. 나만의 API 키로 만드는 맞춤 여행 가이드북.",
  appleWebApp: { capable: true, title: "여행의 결", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  themeColor: "#0754f8",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <InstallApp />
      </body>
    </html>
  );
}
