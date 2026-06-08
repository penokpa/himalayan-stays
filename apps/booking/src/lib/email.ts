const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Himalayan Stays <onboarding@resend.dev>";

interface BookingLeg {
  lodgeName: string;
  lodgeVillage: string;
  roomName: string;
  checkInDate: Date;
  checkOutDate: Date;
  nightCount: number;
  legTotal: number;
}

interface BookingEmailData {
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  legs: BookingLeg[];
  itineraryName?: string | null;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildEmailHtml(data: BookingEmailData): string {
  const isMultiLeg = data.legs.length > 1;
  const legsHtml = data.legs
    .map(
      (leg, i) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;">
        <div style="font-weight:600;color:#1c1917;">
          ${isMultiLeg ? `${i + 1}. ` : ""}${leg.lodgeName}
        </div>
        <div style="font-size:13px;color:#78716c;margin-top:2px;">
          ${leg.lodgeVillage} &middot; ${leg.roomName}
        </div>
        <div style="font-size:13px;color:#57534e;margin-top:4px;">
          ${formatDate(leg.checkInDate)} → ${formatDate(leg.checkOutDate)}
          (${leg.nightCount} ${leg.nightCount === 1 ? "night" : "nights"})
        </div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;text-align:right;font-weight:600;color:#047857;vertical-align:top;">
        NPR ${Number(leg.legTotal).toLocaleString()}
      </td>
    </tr>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>

      <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e7e5e4;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#d1fae5;line-height:56px;font-size:28px;">✓</div>
          <h2 style="font-size:22px;color:#1c1917;margin:16px 0 8px;">Your booking is confirmed!</h2>
          <p style="color:#78716c;margin:0;">${isMultiLeg ? "We've reserved your rooms along the trek." : "We've reserved your room."} Show this confirmation at ${isMultiLeg ? "each lodge" : "the lodge"}.</p>
        </div>

        <div style="text-align:center;padding:20px;background:#f5f5f4;border-radius:8px;margin-bottom:24px;">
          <div style="font-size:13px;color:#78716c;font-weight:500;">Booking Reference</div>
          <div style="font-size:28px;font-weight:bold;color:#047857;letter-spacing:2px;margin-top:4px;font-family:monospace;">${data.bookingRef}</div>
          ${data.itineraryName ? `<div style="font-size:13px;color:#78716c;margin-top:6px;">${data.itineraryName}</div>` : ""}
        </div>

        <h3 style="font-size:16px;color:#1c1917;margin:0 0 12px;">${isMultiLeg ? "Itinerary" : "Stay Details"}</h3>
        <table style="width:100%;border-collapse:collapse;">${legsHtml}</table>

        <div style="margin-top:20px;padding-top:20px;border-top:2px solid #e7e5e4;display:flex;justify-content:space-between;font-size:18px;font-weight:bold;">
          <span style="color:#1c1917;">Total</span>
          <span style="color:#047857;">${data.currency} ${Number(data.totalAmount).toLocaleString()}</span>
        </div>

        <div style="margin-top:24px;padding:16px;background:#d1fae5;border-radius:8px;color:#065f46;font-size:14px;">
          <strong>Payment received:</strong> ${data.currency} ${Number(data.totalAmount).toLocaleString()} via ${data.paymentMethod}
        </div>

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e7e5e4;">
          <h3 style="font-size:14px;color:#1c1917;margin:0 0 8px;">Guest Details</h3>
          <p style="margin:0;font-size:14px;color:#57534e;">
            ${data.guestName}<br>
            ${data.guestEmail}
          </p>
        </div>
      </div>

      <div style="margin-top:24px;text-align:center;font-size:13px;color:#78716c;">
        <p>Save this email for your records. You can also view your booking online:</p>
        <p style="margin-top:8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/booking/${data.bookingRef}/confirmation" style="color:#047857;text-decoration:none;font-weight:600;">View Booking →</a>
        </p>
        <p style="margin-top:24px;color:#a8a29e;">© ${new Date().getFullYear()} Himalayan Stays. Trek safe.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not configured, skipping email");
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `Booking confirmed: ${data.bookingRef} | Himalayan Stays`,
      html: buildEmailHtml(data),
    });

    if (result.error) {
      console.error("[email] Send failed:", result.error);
    } else {
      console.log("[email] Sent to", data.guestEmail, "id:", result.data?.id);
    }
  } catch (err) {
    console.error("[email] Error:", err);
  }
}

interface BookingReminderData {
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  daysUntilCheckIn: number;
  firstCheckIn: Date;
  legs: BookingLeg[];
  totalAmount: number;
  itineraryName?: string | null;
}

function buildReminderHtml(data: BookingReminderData): string {
  const isMultiLeg = data.legs.length > 1;
  const dayLabel =
    data.daysUntilCheckIn === 1
      ? "tomorrow"
      : `in ${data.daysUntilCheckIn} days`;
  const legsHtml = data.legs
    .map(
      (leg, i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;">
        <div style="font-weight:600;color:#1c1917;">
          ${isMultiLeg ? `${i + 1}. ` : ""}${leg.lodgeName}
        </div>
        <div style="font-size:13px;color:#78716c;margin-top:2px;">
          ${leg.lodgeVillage} &middot; ${formatDate(leg.checkInDate)} → ${formatDate(leg.checkOutDate)}
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>
      <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e7e5e4;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#fef3c7;line-height:56px;font-size:28px;">⛰️</div>
          <h2 style="font-size:22px;color:#1c1917;margin:14px 0 6px;">
            Your trek starts ${dayLabel}!
          </h2>
          <p style="color:#78716c;margin:0;">${data.guestName}, here's your reminder.</p>
        </div>

        <div style="text-align:center;padding:16px;background:#f5f5f4;border-radius:8px;margin-bottom:20px;">
          <div style="font-size:13px;color:#78716c;font-weight:500;">Booking Reference</div>
          <div style="font-size:24px;font-weight:bold;color:#047857;letter-spacing:2px;margin-top:4px;font-family:monospace;">${data.bookingRef}</div>
          ${data.itineraryName ? `<div style="font-size:13px;color:#78716c;margin-top:6px;">${data.itineraryName}</div>` : ""}
          <div style="font-size:13px;color:#78716c;margin-top:6px;">First check-in: <strong>${formatDate(data.firstCheckIn)}</strong></div>
        </div>

        <h3 style="font-size:15px;color:#1c1917;margin:0 0 8px;">${isMultiLeg ? "Itinerary" : "Where you're going"}</h3>
        <table style="width:100%;border-collapse:collapse;">${legsHtml}</table>

        <div style="margin-top:20px;padding:14px;background:#fffbeb;border-radius:8px;color:#92400e;font-size:13px;line-height:1.5;">
          <strong>Before you go:</strong>
          <ul style="margin:6px 0 0 18px;padding:0;">
            <li>Save or print your booking confirmation — connectivity is patchy past Namche.</li>
            <li>Carry enough Nepali rupees from Kathmandu — no ATMs above Namche.</li>
            <li>Show this booking ref at each lodge on arrival.</li>
          </ul>
        </div>

        <div style="margin-top:24px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/booking/${data.bookingRef}/confirmation" style="display:inline-block;padding:10px 24px;background:#047857;color:white;text-decoration:none;font-weight:600;border-radius:8px;">View Booking →</a>
        </div>
      </div>

      <div style="margin-top:20px;text-align:center;font-size:12px;color:#a8a29e;">
        <p>© ${new Date().getFullYear()} Himalayan Stays. Trek safe.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

interface MessageNotificationData {
  to: string;
  recipientName: string;
  fromName: string;
  lodgeName: string;
  subject: string;
  body: string;
  threadUrl: string;
  forOwner: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMessageHtml(d: MessageNotificationData): string {
  const heading = d.forOwner
    ? `New question about ${escapeHtml(d.lodgeName)}`
    : `${escapeHtml(d.fromName)} replied about ${escapeHtml(d.lodgeName)}`;
  const ctaLabel = d.forOwner ? "Reply to trekker →" : "View conversation →";
  const intro = d.forOwner
    ? `<strong>${escapeHtml(d.fromName)}</strong> sent you a message:`
    : `Reply from <strong>${escapeHtml(d.fromName)}</strong> at ${escapeHtml(d.lodgeName)}:`;
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>
      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
        <h2 style="font-size:18px;color:#1c1917;margin:0 0 4px;">${heading}</h2>
        <div style="font-size:13px;color:#78716c;margin-bottom:18px;">Subject: ${escapeHtml(d.subject)}</div>
        <p style="font-size:14px;color:#57534e;margin:0 0 14px;">${intro}</p>
        <div style="background:#f5f5f4;border-left:3px solid #047857;padding:14px 16px;border-radius:6px;font-size:14px;color:#292524;white-space:pre-wrap;">${escapeHtml(d.body)}</div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${d.threadUrl}" style="display:inline-block;padding:11px 24px;background:#047857;color:white;text-decoration:none;font-weight:600;border-radius:8px;font-size:14px;">${ctaLabel}</a>
        </div>
      </div>
      <div style="margin-top:18px;text-align:center;font-size:12px;color:#a8a29e;">
        <p>© ${new Date().getFullYear()} Himalayan Stays.</p>
      </div>
    </div>
  </body></html>`;
}

interface OwnerBookingLeg {
  roomName: string;
  checkInDate: Date;
  checkOutDate: Date;
  nightCount: number;
  legTotal: number;
}

interface OwnerBookingEmailData {
  to: string;
  ownerName: string;
  lodgeName: string;
  bookingRef: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestNationality: string | null;
  groupSize: number;
  paymentMethod: string;
  willPayAtLodge: boolean;
  legs: OwnerBookingLeg[];
  ownerTotalNpr: number;
}

function buildOwnerBookingHtml(d: OwnerBookingEmailData): string {
  const legsHtml = d.legs
    .map(
      (l) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;">
        <div style="font-weight:600;color:#1c1917;">${l.roomName}</div>
        <div style="font-size:13px;color:#57534e;margin-top:2px;">
          ${formatDate(l.checkInDate)} → ${formatDate(l.checkOutDate)}
          (${l.nightCount} ${l.nightCount === 1 ? "night" : "nights"})
        </div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;text-align:right;font-weight:600;color:#047857;vertical-align:top;">
        NPR ${Number(l.legTotal).toLocaleString()}
      </td>
    </tr>`
    )
    .join("");

  const paymentNote = d.willPayAtLodge
    ? `<div style="margin-top:18px;padding:14px;background:#fffbeb;border-radius:8px;color:#92400e;font-size:14px;">
         <strong>Pay at lodge:</strong> Collect <strong>NPR ${d.ownerTotalNpr.toLocaleString()}</strong> in cash on arrival.
       </div>`
    : `<div style="margin-top:18px;padding:14px;background:#d1fae5;border-radius:8px;color:#065f46;font-size:14px;">
         <strong>Paid in advance</strong> via ${d.paymentMethod}. Your payout for this stay will be processed after checkout.
       </div>`;

  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>
      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
        <h2 style="font-size:20px;color:#1c1917;margin:0 0 6px;">New booking at ${escapeHtml(d.lodgeName)}</h2>
        <p style="margin:0 0 18px;color:#57534e;font-size:14px;">
          ${escapeHtml(d.guestName)} just confirmed a stay. Booking ref:
          <strong style="color:#047857;font-family:monospace;">${escapeHtml(d.bookingRef)}</strong>
        </p>

        <h3 style="font-size:14px;color:#1c1917;margin:0 0 6px;">Stay details</h3>
        <table style="width:100%;border-collapse:collapse;">${legsHtml}</table>

        <div style="margin-top:14px;padding-top:14px;border-top:2px solid #e7e5e4;display:flex;justify-content:space-between;font-size:16px;font-weight:bold;">
          <span style="color:#1c1917;">Your portion</span>
          <span style="color:#047857;">NPR ${d.ownerTotalNpr.toLocaleString()}</span>
        </div>

        ${paymentNote}

        <h3 style="font-size:14px;color:#1c1917;margin:22px 0 6px;">Guest details</h3>
        <table style="width:100%;font-size:14px;color:#57534e;">
          <tr><td style="padding:2px 0;">Name</td><td style="padding:2px 0;text-align:right;color:#1c1917;font-weight:500;">${escapeHtml(d.guestName)}</td></tr>
          <tr><td style="padding:2px 0;">Group size</td><td style="padding:2px 0;text-align:right;color:#1c1917;font-weight:500;">${d.groupSize}</td></tr>
          ${d.guestEmail ? `<tr><td style="padding:2px 0;">Email</td><td style="padding:2px 0;text-align:right;color:#1c1917;font-weight:500;">${escapeHtml(d.guestEmail)}</td></tr>` : ""}
          ${d.guestPhone ? `<tr><td style="padding:2px 0;">Phone</td><td style="padding:2px 0;text-align:right;color:#1c1917;font-weight:500;">${escapeHtml(d.guestPhone)}</td></tr>` : ""}
          ${d.guestNationality ? `<tr><td style="padding:2px 0;">Nationality</td><td style="padding:2px 0;text-align:right;color:#1c1917;font-weight:500;">${escapeHtml(d.guestNationality)}</td></tr>` : ""}
        </table>

        <div style="margin-top:24px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/owner/bookings" style="display:inline-block;padding:11px 24px;background:#047857;color:white;text-decoration:none;font-weight:600;border-radius:8px;font-size:14px;">Open bookings →</a>
        </div>
      </div>
      <div style="margin-top:18px;text-align:center;font-size:12px;color:#a8a29e;">
        <p>© ${new Date().getFullYear()} Himalayan Stays.</p>
      </div>
    </div>
  </body></html>`;
}

export async function sendOwnerBookingNotificationEmail(
  data: OwnerBookingEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set, skipping owner notification");
    return { ok: false, error: "no-key" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `New booking · ${data.bookingRef} · ${data.lodgeName}`,
      html: buildOwnerBookingHtml(data),
    });
    if (result.error) {
      console.error("[email] Owner booking send failed:", result.error);
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Owner booking error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendMessageNotificationEmail(
  data: MessageNotificationData
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set, skipping message email");
    return { ok: false, error: "no-key" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subj = data.forOwner
      ? `New message about ${data.lodgeName}: ${data.subject}`
      : `Reply from ${data.lodgeName}: ${data.subject}`;
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: subj,
      html: buildMessageHtml(data),
    });
    if (result.error) {
      console.error("[email] Message send failed:", result.error);
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Message error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface VerifyEmailData {
  to: string;
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}

function buildVerifyEmailHtml(d: VerifyEmailData): string {
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>
      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
        <h2 style="font-size:20px;color:#1c1917;margin:0 0 6px;">Confirm your email</h2>
        <p style="margin:0 0 18px;color:#57534e;font-size:14px;">
          Hi ${escapeHtml(d.name)}, please confirm this is your email so you can sign in and start booking treks. This link expires in ${d.expiresInHours} hours.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${d.verifyUrl}" style="display:inline-block;padding:12px 28px;background:#047857;color:white;text-decoration:none;font-weight:600;border-radius:8px;font-size:14px;">Confirm email →</a>
        </div>
        <p style="margin:18px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Didn&apos;t create this account? You can safely ignore this email — the account won&apos;t be usable until the email is verified.
        </p>
        <p style="margin:12px 0 0;font-size:11px;color:#a8a29e;word-break:break-all;">
          Or paste this link in your browser:<br>${d.verifyUrl}
        </p>
      </div>
      <div style="margin-top:18px;text-align:center;font-size:12px;color:#a8a29e;">
        <p>© ${new Date().getFullYear()} Himalayan Stays.</p>
      </div>
    </div>
  </body></html>`;
}

export async function sendVerificationEmail(
  data: VerifyEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set, skipping verify email");
    return { ok: false, error: "no-key" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: "Confirm your Himalayan Stays email",
      html: buildVerifyEmailHtml(data),
    });
    if (result.error) {
      console.error("[email] Verify send failed:", result.error);
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Verify error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface PasswordResetEmailData {
  to: string;
  name: string;
  resetUrl: string;
  expiresInHours: number;
}

function buildPasswordResetHtml(d: PasswordResetEmailData): string {
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>
      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
        <h2 style="font-size:20px;color:#1c1917;margin:0 0 6px;">Reset your password</h2>
        <p style="margin:0 0 18px;color:#57534e;font-size:14px;">
          Hi ${escapeHtml(d.name)}, we got a request to reset your password. Click the button to choose a new one. This link expires in ${d.expiresInHours} hour${d.expiresInHours === 1 ? "" : "s"}.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${d.resetUrl}" style="display:inline-block;padding:12px 28px;background:#047857;color:white;text-decoration:none;font-weight:600;border-radius:8px;font-size:14px;">Reset password →</a>
        </div>
        <p style="margin:18px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Didn&apos;t request this? You can safely ignore this email — your password won&apos;t change unless you click the link above.
        </p>
        <p style="margin:12px 0 0;font-size:11px;color:#a8a29e;word-break:break-all;">
          Or paste this link in your browser: <br>${d.resetUrl}
        </p>
      </div>
      <div style="margin-top:18px;text-align:center;font-size:12px;color:#a8a29e;">
        <p>© ${new Date().getFullYear()} Himalayan Stays.</p>
      </div>
    </div>
  </body></html>`;
}

export async function sendPasswordResetEmail(
  data: PasswordResetEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set, skipping reset email");
    return { ok: false, error: "no-key" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: "Reset your Himalayan Stays password",
      html: buildPasswordResetHtml(data),
    });
    if (result.error) {
      console.error("[email] Reset send failed:", result.error);
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Reset error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface NewReviewEmailData {
  to: string;
  ownerName: string;
  lodgeName: string;
  reviewerName: string;
  reviewerNationality: string | null;
  rating: number;
  comment: string | null;
  reviewUrl: string;
}

function stars(n: number): string {
  return "★".repeat(Math.max(0, Math.min(5, n))) +
    "☆".repeat(Math.max(0, 5 - n));
}

function buildNewReviewHtml(d: NewReviewEmailData): string {
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0;">
          Himalayan <span style="color:#047857;">Stays</span>
        </h1>
      </div>
      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
        <h2 style="font-size:18px;color:#1c1917;margin:0 0 6px;">
          New ${d.rating}-star review for ${escapeHtml(d.lodgeName)}
        </h2>
        <p style="margin:0 0 18px;color:#57534e;font-size:14px;">
          ${escapeHtml(d.reviewerName)}${d.reviewerNationality ? ` (${escapeHtml(d.reviewerNationality)})` : ""} just posted a review.
        </p>
        <div style="background:#f5f5f4;border-left:3px solid #f59e0b;padding:14px 16px;border-radius:6px;">
          <div style="font-size:18px;color:#d97706;letter-spacing:2px;">${stars(d.rating)}</div>
          ${d.comment ? `<p style="margin:8px 0 0;font-size:14px;color:#292524;line-height:1.5;white-space:pre-wrap;">${escapeHtml(d.comment)}</p>` : `<p style="margin:8px 0 0;font-size:13px;color:#a8a29e;font-style:italic;">No written comment.</p>`}
        </div>
        <p style="margin:18px 0 0;font-size:13px;color:#57534e;">
          You can post a public response — it appears under the review on your lodge page.
        </p>
        <div style="margin-top:20px;text-align:center;">
          <a href="${d.reviewUrl}" style="display:inline-block;padding:11px 24px;background:#047857;color:white;text-decoration:none;font-weight:600;border-radius:8px;font-size:14px;">Reply to review →</a>
        </div>
      </div>
      <div style="margin-top:18px;text-align:center;font-size:12px;color:#a8a29e;">
        <p>© ${new Date().getFullYear()} Himalayan Stays.</p>
      </div>
    </div>
  </body></html>`;
}

export async function sendNewReviewEmail(
  data: NewReviewEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set, skipping new-review email");
    return { ok: false, error: "no-key" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `New ${data.rating}-star review for ${data.lodgeName}`,
      html: buildNewReviewHtml(data),
    });
    if (result.error) {
      console.error("[email] New-review send failed:", result.error);
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] New-review error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendBookingReminderEmail(data: BookingReminderData): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `Trek reminder · ${data.bookingRef} starts in ${data.daysUntilCheckIn === 1 ? "1 day" : `${data.daysUntilCheckIn} days`} | Himalayan Stays`,
      html: buildReminderHtml(data),
    });

    const err = (result as { error?: unknown }).error;
    if (err) {
      console.error("[email] Reminder send failed:", err);
      return { ok: false, error: typeof err === "string" ? err : JSON.stringify(err) };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error("[email] Reminder error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
