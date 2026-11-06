"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** A select that writes one URL parameter (empty value removes it), so the view stays linkable. */
export function UrlSelect({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6c786f", opacity: pending ? 0.6 : 1 }}>
      {label}
      <select
        className="tm-select"
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString());
          if (e.target.value) q.set(name, e.target.value);
          else q.delete(name);
          const s = q.toString();
          start(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
