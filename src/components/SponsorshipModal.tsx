"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlacementState, TierAvailability } from "@/lib/placement-board";
import { FACE_LABELS } from "@/data/placements";
import { formatUsd, type TierId } from "@/data/sponsorship";
import { CONTACT_EMAIL } from "@/data/site";
import { track } from "@/lib/analytics";

/**
 * The sponsorship form.
 *
 * It collects a company's details and nothing else. There is no card field, no
 * amount field and no total, because no money moves on this website — and the
 * confirmation screen says so in the first two lines, because that is the one
 * thing a company must not be able to misread.
 *
 * The tier is the primary choice; the panel is optional and only ever offers
 * panels that are actually available inside that tier. Changing tier clears a
 * panel that no longer belongs to it, so it is not possible to submit a $250
 * sponsorship pointed at the $1,000 placement.
 *
 * ACCESSIBILITY
 * -------------
 * Focus moves into the dialog on open and is trapped there; Escape closes;
 * focus returns to whatever opened it (handled by CampaignProvider). Errors
 * are announced through a live region and each field's message is wired to
 * its input with aria-describedby / aria-invalid, so a screen reader hears
 * which field is wrong rather than that "something" is.
 */

interface SponsorshipModalProps {
  tiers: TierAvailability[];
  placements: PlacementState[];
  initialTier: TierId | null;
  initialPlacement: PlacementState | null;
  onClose: () => void;
}

interface FormState {
  company: string;
  contactName: string;
  contactEmail: string;
  companyUrl: string;
  socialUrl: string;
  message: string;
  acknowledged: boolean;
  /** Honeypot. Hidden from people, irresistible to bots. */
  companyFax: string;
}

const EMPTY: FormState = {
  company: "",
  contactName: "",
  contactEmail: "",
  companyUrl: "",
  socialUrl: "",
  message: "",
  acknowledged: false,
  companyFax: "",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SponsorshipModal({
  tiers,
  placements,
  initialTier,
  initialPlacement,
  onClose,
}: SponsorshipModalProps) {
  const [tier, setTier] = useState<TierId | null>(initialTier);
  const [placement, setPlacement] = useState<PlacementState | null>(initialPlacement);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const dialog = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const confirmHeading = useRef<HTMLHeadingElement>(null);
  const ids = useId();
  const fieldId = (name: string) => `${ids}-${name}`;
  const errorId = (name: string) => `${ids}-${name}-error`;

  const selectedTier = useMemo(
    () => tiers.find((t) => t.id === tier) ?? null,
    [tiers, tier],
  );

  /** Panels a sponsor may actually pick right now, inside the chosen tier. */
  const panelOptions = useMemo(() => {
    if (!tier) return [];
    return placements.filter(
      (p) => p.tier === tier && (p.available || p.id === initialPlacement?.id),
    );
  }, [placements, tier, initialPlacement]);

  const chooseTier = (next: TierId) => {
    setTier(next);
    setPlacement((current) => (current && current.tier === next ? current : null));
  };

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the dialog. Without this the focus ring walks off into
      // the page behind the backdrop, where nothing is clickable.
      const nodes = dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    firstField.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Move the reader to the confirmation rather than leaving it on a form that
  // has just been replaced underneath it.
  useEffect(() => {
    if (done) confirmHeading.current?.focus();
  }, [done]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const target = event.target;
      const value =
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : target.value;
      setForm((f) => ({ ...f, [key]: value }) as FormState);
    };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!tier) {
      setFields({ tier: "Choose a sponsorship tier." });
      setFormError("Choose a sponsorship tier to continue.");
      return;
    }

    setSubmitting(true);
    setFields({});
    setFormError(null);

    try {
      const res = await fetch("/api/sponsorship-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          placementId: placement?.id,
          company: form.company,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          companyUrl: form.companyUrl,
          socialUrl: form.socialUrl || undefined,
          message: form.message || undefined,
          acknowledged: form.acknowledged,
          companyFax: form.companyFax,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok) {
        setFields(data.fields ?? {});
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      track("submit_sponsor_interest", {
        tier,
        ...(placement ? { panel: placement.id } : {}),
      });
      setDone(true);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const describedBy = (name: string) => (fields[name] ? errorId(name) : undefined);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="request-modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={done ? "Inquiry received" : "Sponsor the trip"}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>

        {done ? (
          <div className="success">
            <span className="tick" aria-hidden="true">
              ✓
            </span>
            <h2 tabIndex={-1} ref={confirmHeading}>
              Thanks — that&rsquo;s with me.
            </h2>
            <p>
              I&rsquo;ll personally confirm availability and send the sponsorship
              invoice and details. <b>No payment has been taken</b> and nothing has
              been charged — the placement is held for nobody until we&rsquo;ve
              agreed it.
            </p>
            <p className="success-note">
              You should hear from me within a couple of days.
              {CONTACT_EMAIL ? (
                <>
                  {" "}
                  If it&rsquo;s urgent, email me at{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                </>
              ) : null}
            </p>
            <button className="pill-dark" onClick={onClose}>
              Back to the case
            </button>
          </div>
        ) : (
          <>
            <p className="modal-kicker">Sponsor the trip</p>
            <h2>
              {placement
                ? placement.name
                : selectedTier
                  ? selectedTier.name
                  : "Choose a sponsorship"}
            </h2>

            {placement ? (
              <>
                <p className="modal-desc">{placement.description}</p>
                <div className="modal-meta">
                  <div>
                    <span>Panel</span>
                    <b>
                      {placement.id} · {FACE_LABELS[placement.face]}
                    </b>
                  </div>
                  <div>
                    <span>Print size</span>
                    <b>{placement.sizeLabel}</b>
                  </div>
                  <div>
                    <span>Sponsorship</span>
                    <b>
                      {placement.tierLabel} · {formatUsd(placement.priceUsd)}
                    </b>
                  </div>
                </div>
              </>
            ) : (
              <p className="modal-desc">
                Pick a tier, and a panel if you have a preference. I&rsquo;ll confirm
                what&rsquo;s free before anything is invoiced.
              </p>
            )}

            <form onSubmit={submit} noValidate>
              <fieldset className="tier-choice">
                <legend>Sponsorship tier</legend>
                <div className="tier-options">
                  {tiers.map((option) => (
                    <label
                      key={option.id}
                      className="tier-option"
                      data-selected={option.id === tier}
                    >
                      <input
                        type="radio"
                        name={fieldId("tier")}
                        value={option.id}
                        checked={option.id === tier}
                        onChange={() => chooseTier(option.id)}
                      />
                      <span className="tier-option-name">{option.label}</span>
                      <span className="tier-option-price tnum">
                        {formatUsd(option.priceUsd)}
                      </span>
                      <span className="tier-option-avail">
                        {option.available} of {option.total} open
                      </span>
                    </label>
                  ))}
                </div>
                {fields.tier && (
                  <p className="field-error" id={errorId("tier")}>
                    {fields.tier}
                  </p>
                )}
              </fieldset>

              {tier && (
                <div className="field">
                  <label htmlFor={fieldId("placementId")}>
                    Preferred panel <span className="opt">optional</span>
                  </label>
                  <select
                    id={fieldId("placementId")}
                    value={placement?.id ?? ""}
                    onChange={(event) =>
                      setPlacement(
                        placements.find((p) => p.id === event.target.value) ?? null,
                      )
                    }
                    aria-describedby={
                      fields.placementId ? errorId("placementId") : fieldId("panel-help")
                    }
                  >
                    <option value="">No preference — you choose</option>
                    {panelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.id} · {option.name} · {FACE_LABELS[option.face]} ·{" "}
                        {option.sizeLabel}
                      </option>
                    ))}
                  </select>
                  {fields.placementId ? (
                    <p className="field-error" id={errorId("placementId")}>
                      {fields.placementId}
                    </p>
                  ) : (
                    <p className="field-help" id={fieldId("panel-help")}>
                      Panels are assigned when a sponsorship is confirmed, not when
                      this form is sent.
                    </p>
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor={fieldId("company")}>Company</label>
                <input
                  id={fieldId("company")}
                  ref={firstField}
                  value={form.company}
                  onChange={set("company")}
                  autoComplete="organization"
                  aria-invalid={fields.company ? true : undefined}
                  aria-describedby={describedBy("company")}
                  required
                />
                {fields.company && (
                  <p className="field-error" id={errorId("company")}>
                    {fields.company}
                  </p>
                )}
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor={fieldId("contactName")}>Your name</label>
                  <input
                    id={fieldId("contactName")}
                    value={form.contactName}
                    onChange={set("contactName")}
                    autoComplete="name"
                    aria-invalid={fields.contactName ? true : undefined}
                    aria-describedby={describedBy("contactName")}
                    required
                  />
                  {fields.contactName && (
                    <p className="field-error" id={errorId("contactName")}>
                      {fields.contactName}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor={fieldId("contactEmail")}>Work email</label>
                  <input
                    id={fieldId("contactEmail")}
                    type="email"
                    value={form.contactEmail}
                    onChange={set("contactEmail")}
                    autoComplete="email"
                    aria-invalid={fields.contactEmail ? true : undefined}
                    aria-describedby={describedBy("contactEmail")}
                    required
                  />
                  {fields.contactEmail && (
                    <p className="field-error" id={errorId("contactEmail")}>
                      {fields.contactEmail}
                    </p>
                  )}
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor={fieldId("companyUrl")}>Company website</label>
                  <input
                    id={fieldId("companyUrl")}
                    value={form.companyUrl}
                    onChange={set("companyUrl")}
                    placeholder="yourcompany.com"
                    autoComplete="url"
                    inputMode="url"
                    aria-invalid={fields.companyUrl ? true : undefined}
                    aria-describedby={describedBy("companyUrl")}
                    required
                  />
                  {fields.companyUrl && (
                    <p className="field-error" id={errorId("companyUrl")}>
                      {fields.companyUrl}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor={fieldId("socialUrl")}>
                    X or LinkedIn <span className="opt">optional</span>
                  </label>
                  <input
                    id={fieldId("socialUrl")}
                    value={form.socialUrl}
                    onChange={set("socialUrl")}
                    placeholder="linkedin.com/in/…"
                    inputMode="url"
                    aria-invalid={fields.socialUrl ? true : undefined}
                    aria-describedby={describedBy("socialUrl")}
                  />
                  {fields.socialUrl && (
                    <p className="field-error" id={errorId("socialUrl")}>
                      {fields.socialUrl}
                    </p>
                  )}
                </div>
              </div>

              <div className="field">
                <label htmlFor={fieldId("message")}>
                  Anything I should know? <span className="opt">optional</span>
                </label>
                <textarea
                  id={fieldId("message")}
                  rows={3}
                  value={form.message}
                  onChange={set("message")}
                  placeholder="Timing, artwork questions, or what you'd want out of it."
                  aria-invalid={fields.message ? true : undefined}
                  aria-describedby={describedBy("message")}
                />
                {fields.message && (
                  <p className="field-error" id={errorId("message")}>
                    {fields.message}
                  </p>
                )}
              </div>

              {/* Honeypot: off-screen, not hidden from the DOM, never announced. */}
              <div className="honeypot" aria-hidden="true">
                <label htmlFor={fieldId("companyFax")}>Company fax</label>
                <input
                  id={fieldId("companyFax")}
                  name="company_fax"
                  value={form.companyFax}
                  onChange={set("companyFax")}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="field check">
                <input
                  id={fieldId("acknowledged")}
                  type="checkbox"
                  checked={form.acknowledged}
                  onChange={set("acknowledged")}
                  aria-invalid={fields.acknowledged ? true : undefined}
                  aria-describedby={describedBy("acknowledged")}
                />
                <label htmlFor={fieldId("acknowledged")}>
                  I understand this is an independent project by Haseeb Arshad and not
                  an official OpenAI or DevDay sponsorship, and that sending this form
                  does not reserve a placement or charge anything.
                </label>
              </div>
              {fields.acknowledged && (
                <p className="field-error" id={errorId("acknowledged")}>
                  {fields.acknowledged}
                </p>
              )}

              <div aria-live="assertive" role="status">
                {formError && <p className="form-error">{formError}</p>}
              </div>

              <button className="submit" type="submit" disabled={submitting}>
                {submitting
                  ? "Sending…"
                  : selectedTier
                    ? `Sponsor at ${formatUsd(selectedTier.priceUsd)}`
                    : "Send sponsorship inquiry"}
              </button>
            </form>

            <small className="modal-fine">
              No payment is taken on this site and no card details are collected. I
              confirm availability and send an invoice afterwards. Independent
              project — not affiliated with OpenAI.
            </small>
          </>
        )}
      </div>
    </div>
  );
}
