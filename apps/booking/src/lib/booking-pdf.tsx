import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface BookingLegPdf {
  lodgeName: string;
  lodgeVillage: string;
  altitudeMeters: number | null;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  legTotal: number;
  dayNumber: number | null;
}

export interface BookingPaymentPdf {
  method: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: Date | null;
  providerTxnId: string | null;
}

export interface BookingPdfData {
  bookingRef: string;
  status: string;
  paymentStatus: string | null;
  itineraryName: string | null;
  guestName: string;
  guestEmail: string;
  groupSize: number;
  specialRequests: string | null;
  totalNpr: number;
  totalUsd: number | null;
  legs: BookingLegPdf[];
  payments: BookingPaymentPdf[];
  createdAt: Date;
}

const COLORS = {
  primary: "#047857",
  primaryDark: "#065f46",
  ink: "#1c1917",
  body: "#44403c",
  muted: "#78716c",
  border: "#e7e5e4",
  successBg: "#d1fae5",
  successText: "#065f46",
  warnBg: "#fef3c7",
  warnText: "#92400e",
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.body,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  brandAccent: { color: COLORS.primary },
  brandLine: { fontSize: 9, color: COLORS.muted, marginTop: 2 },

  hero: {
    marginTop: 28,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f4",
    borderRadius: 8,
    alignItems: "center",
  },
  heroLabel: { fontSize: 9, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 },
  heroRef: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  heroSub: { fontSize: 10, color: COLORS.muted, marginTop: 4 },

  badge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginTop: 22,
    marginBottom: 8,
  },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  rowLabel: { color: COLORS.muted, fontSize: 10 },
  rowValue: { color: COLORS.ink, fontSize: 10, fontFamily: "Helvetica-Bold" },

  legCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  legLodge: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  legSub: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  legAmount: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.primary },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: COLORS.ink,
  },
  totalLabel: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.primary },

  notice: { marginTop: 14, padding: 10, borderRadius: 6, fontSize: 9 },
  noticeSuccess: { backgroundColor: COLORS.successBg, color: COLORS.successText },
  noticeWarn: { backgroundColor: COLORS.warnBg, color: COLORS.warnText },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
});

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#fef3c7", color: "#92400e", label: "Pending payment" },
  CONFIRMED: { bg: "#d1fae5", color: "#065f46", label: "Confirmed" },
  CHECKED_IN: { bg: "#dbeafe", color: "#1e40af", label: "Checked in" },
  COMPLETED: { bg: "#e7e5e4", color: "#44403c", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
  NO_SHOW: { bg: "#fee2e2", color: "#991b1b", label: "No-show" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Card (Stripe)",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Pay at Lodge",
  BANK_TRANSFER: "Bank transfer",
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNpr(n: number): string {
  return `NPR ${n.toLocaleString()}`;
}

function BookingDocument({ data }: { data: BookingPdfData }) {
  const isMulti = data.legs.length > 1;
  const completedPayment = data.payments.find((p) => p.status === "COMPLETED");
  const cashHold = data.payments.find((p) => p.method === "CASH" && p.status === "INITIATED");
  const statusInfo = STATUS_BADGE[data.status] ?? {
    bg: "#e7e5e4",
    color: "#44403c",
    label: data.status,
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Brand */}
        <View>
          <Text style={styles.brand}>
            Himalayan <Text style={styles.brandAccent}>Stays</Text>
          </Text>
          <Text style={styles.brandLine}>Booking confirmation · himalayanstays.com</Text>
        </View>

        {/* Hero with ref + status */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Booking Reference</Text>
          <Text style={styles.heroRef}>{data.bookingRef}</Text>
          {data.itineraryName && <Text style={styles.heroSub}>{data.itineraryName}</Text>}
          <View
            style={[styles.badge, { backgroundColor: statusInfo.bg, color: statusInfo.color }]}
          >
            <Text>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Guest */}
        <Text style={styles.sectionTitle}>Guest</Text>
        <View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{data.guestName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{data.guestEmail}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Group size</Text>
            <Text style={styles.rowValue}>{data.groupSize}</Text>
          </View>
        </View>

        {/* Itinerary / Stay */}
        <Text style={styles.sectionTitle}>{isMulti ? "Itinerary" : "Stay Details"}</Text>
        {data.legs.map((leg, i) => (
          <View key={i} style={styles.legCard}>
            <View style={styles.legHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.legLodge}>
                  {isMulti && leg.dayNumber ? `Day ${leg.dayNumber} · ` : ""}
                  {leg.lodgeName}
                </Text>
                <Text style={styles.legSub}>
                  {leg.lodgeVillage}
                  {leg.altitudeMeters ? ` · ${leg.altitudeMeters.toLocaleString()}m` : ""} · {leg.roomName}
                </Text>
                <Text style={styles.legSub}>
                  {formatDate(leg.checkIn)} → {formatDate(leg.checkOut)} · {leg.nights}{" "}
                  {leg.nights === 1 ? "night" : "nights"}
                </Text>
              </View>
              <Text style={styles.legAmount}>{formatNpr(leg.legTotal)}</Text>
            </View>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <View>
            <Text style={styles.totalValue}>{formatNpr(data.totalNpr)}</Text>
            {data.totalUsd && (
              <Text style={{ fontSize: 9, color: COLORS.muted, textAlign: "right" }}>
                ~ USD {data.totalUsd.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        {/* Payment notice */}
        {completedPayment && (
          <View style={[styles.notice, styles.noticeSuccess]}>
            <Text>
              Paid: {completedPayment.currency} {Number(completedPayment.amount).toLocaleString()} via{" "}
              {PAYMENT_METHOD_LABELS[completedPayment.method] ?? completedPayment.method}
              {completedPayment.providerTxnId ? ` (Ref: ${completedPayment.providerTxnId})` : ""}.
            </Text>
          </View>
        )}
        {!completedPayment && cashHold && (
          <View style={[styles.notice, styles.noticeWarn]}>
            <Text>
              Pay at Lodge — settle directly at {isMulti ? "each lodge" : "the lodge"} on arrival.
            </Text>
          </View>
        )}
        {!completedPayment && !cashHold && data.status === "PENDING" && (
          <View style={[styles.notice, styles.noticeWarn]}>
            <Text>Payment pending — complete to confirm your stay.</Text>
          </View>
        )}

        {/* Special requests */}
        {data.specialRequests && (
          <>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <Text style={{ fontSize: 10, color: COLORS.body, lineHeight: 1.4 }}>
              {data.specialRequests}
            </Text>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Show this confirmation at the lodge · Booked on {formatDate(data.createdAt)} ·
          bookings@himalayanstays.com
        </Text>
      </Page>
    </Document>
  );
}

export async function renderBookingPdf(data: BookingPdfData): Promise<Buffer> {
  return renderToBuffer(<BookingDocument data={data} />);
}
