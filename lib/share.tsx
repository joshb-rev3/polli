import React, { createContext, useContext, useState } from "react";
import { ShareSheet } from "../components/ShareSheet";
import { SITE_HOST } from "./seo";

interface ShareTarget {
  name?: string;
  slug?: string;
}

interface Ctx {
  openShare: (target: ShareTarget) => void;
}

const ShareContext = createContext<Ctx>({ openShare: () => {} });

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [open, setOpen] = useState(false);

  const openShare = (t: ShareTarget) => {
    setTarget(t);
    setOpen(true);
  };

  const url = target
    ? `${SITE_HOST}/${target.slug || slugify(target.name || "someone")}`
    : `${SITE_HOST}/share`;

  return (
    <ShareContext.Provider value={{ openShare }}>
      {children}
      <ShareSheet open={open} onClose={() => setOpen(false)} url={url} name={target?.name} />
    </ShareContext.Provider>
  );
}

export function useShare() {
  return useContext(ShareContext);
}
