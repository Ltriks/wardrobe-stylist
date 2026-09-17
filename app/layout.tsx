import type { Metadata } from "next";
import "./globals.css";
import ProfileSwitcher from './components/ProfileSwitcher';

export const metadata: Metadata = {
  title: "衣柜计划 · 家庭穿搭作战室",
  description: "整理全家的衣柜，组合搭配，预览今天的出场造型。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="rebel" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('wardrobe-theme');if(t==='paper'||t==='rebel')document.documentElement.dataset.theme=t}catch(e){}" }} /></head>
      <body><ProfileSwitcher />{children}</body>
    </html>
  );
}
