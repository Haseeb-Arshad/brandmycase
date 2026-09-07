"use client";

import type { AnalyticsEvent, AnalyticsProps } from "@/lib/analytics";
import { track } from "@/lib/analytics";

/**
 * An external link that reports a conversion event.
 *
 * It exists so the editorial sections can stay server components: they render
 * one of these instead of becoming client components purely to attach an
 * onClick. It is an ordinary anchor — the navigation happens whether or not
 * anything is listening.
 */
export function TrackedLink({
  href,
  event,
  props,
  external,
  children,
  className,
}: {
  href: string;
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  external?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => track(event, props)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
