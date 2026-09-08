import { describe, it, expect, afterEach, vi } from "vitest";
import {
  ANALYTICS_EVENTS,
  POSTHOG_INIT_OPTIONS,
  analyticsScript,
  posthogConfig,
  track,
} from "@/lib/analytics";

/**
 * Analytics is optional, so most of what matters here is what happens when it
 * is absent: the page must behave identically and nothing may throw.
 *
 * The exception is POSTHOG_INIT_OPTIONS. Those settings are the reason
 * /privacy can tell a visitor that nothing they type into the sponsorship form
 * reaches PostHog. Flipping one of them silently turns that sentence into a
 * false statement on a public page, so they are pinned here.
 */

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  delete (globalThis as Record<string, unknown>).window;
  vi.restoreAllMocks();
});

describe("PostHog configuration", () => {
  it("keeps autocapture and session recording off", () => {
    // The form on this page carries company names, personal names and work
    // email addresses. Autocapture records form interaction; session recording
    // films the screen. Either one would send a sponsor's details to a third
    // party, and /privacy promises they do not.
    expect(POSTHOG_INIT_OPTIONS.autocapture).toBe(false);
    expect(POSTHOG_INIT_OPTIONS.disable_session_recording).toBe(true);
    expect(POSTHOG_INIT_OPTIONS.person_profiles).toBe("identified_only");
  });

  it("loads nothing without a project key", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(posthogConfig()).toBeNull();

    process.env.NEXT_PUBLIC_POSTHOG_KEY = "   ";
    expect(posthogConfig(), "whitespace is not a key").toBeNull();
  });

  it("defaults to US cloud and honours an explicit host", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_example";
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    expect(posthogConfig()).toEqual({
      key: "phc_example",
      host: "https://us.i.posthog.com",
    });

    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    expect(posthogConfig()?.host).toBe("https://eu.i.posthog.com");
  });
});

describe("the cookieless script tag", () => {
  it("loads only when both variables are set", () => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_SRC;
    delete process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
    expect(analyticsScript()).toBeNull();

    // Half-configured points a script at the wrong site, so it loads nothing.
    process.env.NEXT_PUBLIC_ANALYTICS_SRC = "https://plausible.io/js/script.js";
    expect(analyticsScript()).toBeNull();

    process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN = "case.example";
    expect(analyticsScript()).toEqual({
      src: "https://plausible.io/js/script.js",
      domain: "case.example",
    });
  });
});

describe("track()", () => {
  it("does nothing, loudly or otherwise, on the server", () => {
    expect(() => track("view_campaign")).not.toThrow();
  });

  it("delivers to every provider that is present, not just the first", () => {
    const posthog = vi.fn();
    const plausible = vi.fn();
    (globalThis as Record<string, unknown>).window = {
      posthog: { capture: posthog },
      plausible,
    };

    track("click_sponsor", { source: "hero" });

    expect(posthog).toHaveBeenCalledWith("click_sponsor", { source: "hero" });
    expect(plausible).toHaveBeenCalledWith("click_sponsor", {
      props: { source: "hero" },
    });
  });

  it("survives a provider that throws", () => {
    // A broken or blocked analytics script must not be able to take down the
    // click handler it is attached to — which is a sponsorship button.
    const plausible = vi.fn();
    (globalThis as Record<string, unknown>).window = {
      posthog: {
        capture: () => {
          throw new Error("blocked by an extension");
        },
      },
      plausible,
    };

    expect(() => track("submit_sponsor_interest")).not.toThrow();
    expect(plausible, "a throwing provider stopped the next one").toHaveBeenCalled();
  });

  it("declares every event the interface fires", () => {
    for (const event of [
      "view_campaign",
      "click_sponsor",
      "view_package",
      "select_panel",
      "open_sponsor_form",
      "submit_sponsor_interest",
      "click_email",
      "click_github",
      "click_linkedin",
    ]) {
      expect(ANALYTICS_EVENTS, `${event} is fired but not declared`).toContain(event);
    }
  });
});
