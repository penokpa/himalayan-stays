import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Build a self-submitting HTML form for eSewa (requires POST)
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const gatewayUrl = process.env.ESEWA_GATEWAY_URL ?? "https://rc-epay.esewa.com.np";
  const formAction = `${gatewayUrl}/api/epay/main/v2/form`;

  const hiddenFields = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`)
    .join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Redirecting to eSewa...</title></head>
    <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f5f4">
      <div style="text-align:center">
        <p style="font-size:18px;color:#44403c">Redirecting to eSewa...</p>
        <p style="color:#78716c">Please wait, do not close this page.</p>
      </div>
      <form id="esewa-form" method="POST" action="${formAction}">
        ${hiddenFields}
      </form>
      <script>document.getElementById('esewa-form').submit();</script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
