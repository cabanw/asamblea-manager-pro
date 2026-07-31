// Sends an SMS via the Twilio REST API using plain fetch (no SDK needed in Deno).
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER as function secrets.
// Returns { sent: false, reason } instead of throwing when secrets are missing or the
// request fails, so callers can treat SMS delivery as best-effort and never block
// registration on it.
export async function sendSms(to: string, message: string): Promise<{ sent: boolean; reason?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { sent: false, reason: "Twilio secrets not configured" };
  }

  if (!to) {
    return { sent: false, reason: "No destination phone number" };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return { sent: false, reason: `Twilio error ${response.status}: ${errorBody}` };
    }

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sent: false, reason: message };
  }
}
