import type { Metadata } from "next";
import { CreditWorkspace } from "@/components/credit-workspace";
export const metadata: Metadata = { title: "Credit risk research" };
export default function CreditPage() {
  return <CreditWorkspace />;
}
