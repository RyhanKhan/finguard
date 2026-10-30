import type { Metadata } from "next";
import { ApiProvider } from "@/components/api-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FinGuard · ML risk research", template: "%s · FinGuard" },
  description:
    "Live Credit Risk scoring and explanations, alongside frozen Fraud research, historical evaluation and simulated decision economics.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApiProvider>
          <Shell>{children}</Shell>
        </ApiProvider>
      </body>
    </html>
  );
}
