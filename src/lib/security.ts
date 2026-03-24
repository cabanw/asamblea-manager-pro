const SECRET_KEY_STRING = import.meta.env.VITE_QR_SECRET || "default_dev_secret_key_change_me_in_prod";

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY_STRING),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Signs a payload with HMAC SHA-256 and attaches the signature.
 */
export async function signQRData(payload: object): Promise<string> {
  const enc = new TextEncoder();
  // Ensure consistent key ordering by sorting before stringify if needed, 
  // but standard stringify object is usually fine if we parse/sign immediately.
  const dataString = JSON.stringify(payload, Object.keys(payload).sort());
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataString));
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return JSON.stringify({
    ...payload,
    _sig: signatureHex
  });
}

/**
 * Verifies the signature of a parsed QR payload.
 * Returns the payload without signature if valid, or null if invalid.
 */
export async function verifyQRData(jsonString: string): Promise<any | null> {
  try {
    const data = JSON.parse(jsonString);
    if (!data._sig) return null; // No signature present

    const { _sig, ...payload } = data;
    const enc = new TextEncoder();
    const dataString = JSON.stringify(payload, Object.keys(payload).sort());
    const key = await getHmacKey();
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataString));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSig = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (_sig === expectedSig) {
      return payload;
    }
    return null; // Invalid signature
  } catch (e) {
    return null; // Invalid JSON or crypto error
  }
}
