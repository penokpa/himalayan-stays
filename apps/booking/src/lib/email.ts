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
