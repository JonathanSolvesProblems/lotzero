"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";

export interface IdentityUser {
  id: string;
  handle: string;
  region: string;
  avatar: string;
  balance_cents: number;
  held_cents: number;
}
export interface RegionOpt {
  id: string;
  label: string;
}

interface Ctx {
  user: IdentityUser | null;
  users: IdentityUser[];
  regions: RegionOpt[];
  region: string;
  loading: boolean;
  setUserId: (id: string) => void;
  setRegion: (r: string) => void;
  reload: () => Promise<void>;
}

const IdentityContext = createContext<Ctx | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [regions, setRegions] = useState<RegionOpt[]>([]);
  const [userId, setUserIdState] = useState<string>("");
  const [region, setRegionState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(data.users);
    setRegions(data.regions);
    setUserIdState((prev) => {
      const stored = prev || (typeof window !== "undefined" ? localStorage.getItem("lz_user") || "" : "");
      const pick = data.users.find((u: IdentityUser) => u.id === stored) ?? data.users[0];
      return pick?.id ?? "";
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const stored = typeof window !== "undefined" ? localStorage.getItem("lz_region") : null;
    if (stored) setRegionState(stored);
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, [reload]);

  const user = users.find((u) => u.id === userId) ?? null;
  const effectiveRegion = region || user?.region || "us-east-1";

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    if (typeof window !== "undefined") localStorage.setItem("lz_user", id);
  }, []);
  const setRegion = useCallback((r: string) => {
    setRegionState(r);
    if (typeof window !== "undefined") localStorage.setItem("lz_region", r);
  }, []);

  return (
    <IdentityContext.Provider
      value={{ user, users, regions, region: effectiveRegion, loading, setUserId, setRegion, reload }}
    >
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): Ctx {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used inside IdentityProvider");
  return ctx;
}
