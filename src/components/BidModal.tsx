"use client";

import { useEffect, useRef, useState } from "react";
import type { PanelState } from "@/lib/auction";
import { formatUsd, depositFor } from "@/lib/money";
import { FACE_LABELS } from "@/data/placements";

/**
 * The bid form.
 *
 * The server is the authority on price: this form shows a minimum, but if
 * somebody outbids the panel between opening the modal and submitting, the API
 * answers 409 with the new floor and we surface it inline rather than silently
 * accepting a bid that can no longer win.
 */

interface BidModalProps {
  panel: PanelState;
  onClose: () => void;
  onBidPlaced: () => Promise<void>;
}

interface FormState {
  company: string;
  contactEmail: string;
  websiteUrl: string;
  amountUsd: string;
  message: string;
}

export function BidModal({ panel, onClose, onBidPlaced }: BidModalProps) {
  const [minimum, setMinimum] = useState(panel.minimumBidUsd);
  const [form, setForm] = useState<FormState>({
    company: "",
    contactEmail: "",
    websiteUrl: "",
    amountUsd: String(panel.minimumBidUsd),
    message: "",
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the modal.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const parsedAmount = Number(form.amountUsd.replace(/[^0-9]/g, ""));
  const deposit =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? depositFor(parsedAmount) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFields({});
    setFormError(null);

    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placementId: panel.id,
          company: form.company,
          contactEmail: form.contactEmail,
          websiteUrl: form.websiteUrl || undefined,
          message: form.message || undefined,
          amountUsd: parsedAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFields(data.fields ?? {});
        setFormError(data.error ?? "Something went wrong. Please try again.");
        if (typeof data.minimumBidUsd === "number") setMinimum(data.minimumBidUsd);
        return;
      }

      if (data.mode === "live" && data.redirectUrl) {
        // Hand off to Stripe Checkout; the webhook makes the bid live.
        window.location.href = data.redirectUrl;
        return;
      }

      // Mock mode: the deposit already settled server-side.
      await onBidPlaced();
      setDone(true);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Bid on panel ${panel.id}, ${panel.name}`}
    >
      <div className="bid-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {done ? (
          <div className="success">
            <span className="tick" aria-hidden="true">
              ✓
            </span>
            <h2>Panel {panel.id} is yours.</h2>
            <p>
              Your deposit of {formatUsd(deposit)} is held against a{" "}
              {formatUsd(parsedAmount)} bid on {panel.name}. You&rsquo;ll hear from us
              within one working day about artwork and proofs. If you are outbid before
              the auction closes, the deposit returns in full, automatically.
            </p>
            <button className="pill-dark" onClick={onClose}>
              Back to the case
            </button>
          </div>
        ) : (
          <>
            <p className="modal-kicker">
              Panel {panel.id} · {panel.code} · {FACE_LABELS[panel.face]}
            </p>
            <h2>{panel.name}</h2>
            <p className="modal-desc">{panel.description}</p>

            <div className="modal-meta">
              <div>
                <span>{panel.taken ? "Current bid" : "Opening bid"}</span>
                <b className="tnum">
                  {formatUsd(panel.currentBidUsd ?? panel.openingBidUsd)}
                </b>
              </div>
              <div>
                <span>Minimum next</span>
                <b className="tnum">{formatUsd(minimum)}</b>
              </div>
              <div>
                <span>Print size</span>
                <b>{panel.sizeLabel}</b>
              </div>
            </div>

            <form onSubmit={submit} noValidate>
              <label>
                <span>
                  Company{" "}
                  {fields.company && <em className="field-error">— {fields.company}</em>}
                </span>
                <input
                  ref={firstField}
                  value={form.company}
                  onChange={set("company")}
                  placeholder="Northbeam Labs"
                  autoComplete="organization"
                />
              </label>

              <label>
                <span>
                  Work email{" "}
                  {fields.contactEmail && (
                    <em className="field-error">— {fields.contactEmail}</em>
                  )}
                </span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={set("contactEmail")}
                  placeholder="partnerships@yourcompany.com"
                  autoComplete="email"
                />
              </label>

              <label>
                <span>
                  Website <span className="opt">— optional</span>
                  {fields.websiteUrl && (
                    <em className="field-error"> — {fields.websiteUrl}</em>
                  )}
                </span>
                <input
                  value={form.websiteUrl}
                  onChange={set("websiteUrl")}
                  placeholder="https://yourcompany.com"
                  autoComplete="url"
                />
              </label>

              <label>
                <span>
                  Your bid in USD <span className="opt">— minimum {formatUsd(minimum)}</span>
                  {fields.amountUsd && (
                    <em className="field-error"> — {fields.amountUsd}</em>
                  )}
                </span>
                <input
                  inputMode="numeric"
                  value={form.amountUsd}
                  onChange={set("amountUsd")}
                />
              </label>

              <label>
                <span>
                  Anything we should know <span className="opt">— optional</span>
                </span>
                <textarea rows={2} value={form.message} onChange={set("message")} />
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button className="submit" type="submit" disabled={submitting}>
                {submitting
                  ? "Working…"
                  : deposit > 0
                    ? `Place bid · ${formatUsd(deposit)} deposit`
                    : "Place bid"}
              </button>
            </form>

            <small className="modal-fine">
              A 20% deposit is taken now to hold the bid. If you are outbid, or if we
              decline the brand, it is refunded in full. The balance is only due once
              the auction closes in your favour.
            </small>
          </>
        )}
      </div>
    </div>
  );
}
