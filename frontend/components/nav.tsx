"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
const items = [
  ["/", "Overview", "◫"],
  ["/funnels", "Funnels", "▽"],
  ["/retention", "Retention", "◷"],
  ["/segments", "Segments", "⊞"],
  ["/experiments", "Experiments", "⚑"],
  ["/methodology", "Methodology", "≡"],
];
export function Navigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = new URLSearchParams();
  for (const key of ["start", "end", "dimension"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return (
    <nav aria-label="Main navigation">
      {items.map(([href, name, icon]) => (
        <Link
          key={href}
          href={`${href}${query.size ? `?${query}` : ""}`}
          prefetch={false}
          aria-current={pathname === href ? "page" : undefined}
        >
          <span aria-hidden="true" className="nav-icon">
            {icon}
          </span>
          {name}
        </Link>
      ))}
    </nav>
  );
}
