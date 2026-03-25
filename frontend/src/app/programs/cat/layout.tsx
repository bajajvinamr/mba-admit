import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Indian MBA Programs (CAT) - IIMs, ISB, XLRI | Admit Compass",
  description: "Browse 60+ Indian MBA programs accepting CAT scores. IIMs, ISB, XLRI, SPJIMR, and more with placement data and admission stats.",
  openGraph: { title: "Indian MBA Programs (CAT)", description: "Find the best Indian business school for your profile." },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
