import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InkTrail Admin",
  description: "Bảng quản trị nội dung cho InkTrail",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
