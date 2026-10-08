import type { Metadata } from "next";
import "./shell.css";
import "../history/history.css";

export const metadata: Metadata = {
  title: "Our Story | Aquinas College",
  description: "The people, places and moments that have shaped Aquinas College.",
  robots: { index: false, follow: false },
  icons: { icon: "/figma/crest.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-AU"><body>{children}</body></html>;
}
