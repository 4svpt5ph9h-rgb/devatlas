import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DevAtlas | Team workspace",
  description: "Company software, shared knowledge, and team coordination.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
