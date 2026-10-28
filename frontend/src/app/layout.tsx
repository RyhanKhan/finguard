import type { Metadata } from "next";
import { ApiProvider } from "@/components/api-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FinGuard · Fraud intelligence", template: "%s · FinGuard" },
  description:
    "A transparent fraud research workspace: historical model evaluation, frozen decision economics and genuine single-transaction inference.",
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
