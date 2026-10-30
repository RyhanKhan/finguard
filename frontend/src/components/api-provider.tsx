"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type ModelInfo } from "@/lib/api";

type Connection = {
  status: "not-enabled" | "checking" | "ready" | "unavailable";
  info: ModelInfo | null;
  error: string | null;
};
const Context = createContext<
  (Connection & { reconnect: () => void; invalidate: (message: string) => void }) | null
>(null);
export function ApiProvider({
  children,
  enableFraudScoring = false,
}: {
  children: ReactNode;
  enableFraudScoring?: boolean;
}) {
  const [connection, setConnection] = useState<Connection>({
    status: enableFraudScoring ? "checking" : "not-enabled",
    info: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enableFraudScoring) return;
    let active = true;
    api.connect().then(
      (info) => {
        if (active) setConnection({ status: "ready", info, error: null });
      },
      (error: unknown) => {
        if (active)
          setConnection({
            status: "unavailable",
            info: null,
            error: error instanceof Error ? error.message : "API connection failed.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, enableFraudScoring]);
  function reconnect() {
    if (!enableFraudScoring) return;
    setConnection({ status: "checking", info: null, error: null });
    setAttempt((n) => n + 1);
  }
  return (
    <Context
      value={{
        ...connection,
        reconnect,
        invalidate: (error) => setConnection({ status: "unavailable", info: null, error }),
      }}
    >
      {children}
    </Context>
  );
}
export function useApi() {
  const context = useContext(Context);
  if (!context) throw new Error("API context is unavailable");
  return context;
}
