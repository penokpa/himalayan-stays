/**
 * Build an RFC 5545 iCalendar file for a booking.
 * Emits one all-day VEVENT per leg.
 */

export interface IcsLeg {
  lodgeName: string;
  lodgeVillage: string;
  roomName: string;
  altitudeMeters: number | null;
  checkInDate: Date;
  checkOutDate: Date;
  nightCount: number;
}

export interface IcsBooking {
  bookingRef: string;
  itineraryName: string | null;
  guestName: string;
  groupSize: number;
  legs: IcsLeg[];
  appUrl?: string;
}

const PRODID = "-//Himalayan Stays//Booking//EN";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateOnly(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function timestampUtc(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape per RFC 5545 §3.3.11 — backslash, semicolon, comma, newline. */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold long lines per §3.1: lines over 75 octets must be split with CRLF + space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let pos = 0;
  while (pos < line.length) {
    const chunk = line.slice(pos, pos + (pos === 0 ? 75 : 74));
    out.push(pos === 0 ? chunk : ` ${chunk}`);
    pos += pos === 0 ? 75 : 74;
  }
  return out.join("\r\n");
}

export function buildBookingIcs(b: IcsBooking): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    `PRODID:${PRODID}`,
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const dtstamp = timestampUtc();

  for (let i = 0; i < b.legs.length; i++) {
    const leg = b.legs[i];
    const summary = `Stay at ${leg.lodgeName}`;
    const descriptionParts = [
      `Booking ${b.bookingRef}`,
      b.itineraryName ? b.itineraryName : null,
      `Guest: ${b.guestName}${b.groupSize > 1 ? ` (party of ${b.groupSize})` : ""}`,
      `Room: ${leg.roomName}`,
      `${leg.nightCount} ${leg.nightCount === 1 ? "night" : "nights"}`,
      leg.altitudeMeters ? `Altitude: ${leg.altitudeMeters}m` : null,
      b.appUrl ? `View booking: ${b.appUrl}/booking/${b.bookingRef}/confirmation` : null,
    ].filter((x): x is string => !!x);
    const description = descriptionParts.join("\n");
    const location = `${leg.lodgeName}, ${leg.lodgeVillage}, Nepal`;
    const uid = `${b.bookingRef}-leg-${i + 1}@himalayanstays.com`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(leg.checkInDate)}`);
    lines.push(`DTEND;VALUE=DATE:${dateOnly(leg.checkOutDate)}`);
    lines.push(`SUMMARY:${esc(summary)}`);
    lines.push(`DESCRIPTION:${esc(description)}`);
    lines.push(`LOCATION:${esc(location)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
