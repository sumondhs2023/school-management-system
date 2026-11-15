
function base64urlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export async function onRequestGet({ request, env }) {
  try {
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);

    if (!match || !env.SESSION_SECRET) {
      return Response.json(
        { success: false, message: "অনুমতি নেই। আগে লগইন করুন।" },
        { status: 401 }
      );
    }

    const parts = match[1].split(".");
    if (parts.length !== 2) throw new Error("Invalid session");

    const [payload, signature] = parts;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(signature),
      new TextEncoder().encode(payload)
    );

    if (!valid) throw new Error("Invalid signature");

    const data = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(payload))
    );

    if (!data.username || data.exp < Date.now()) {
      throw new Error("Expired session");
    }

    return Response.json({
      success: true,
      username: data.username
    });

  } catch {
    return Response.json(
      { success: false, message: "সেশন সঠিক নয়। আবার লগইন করুন।" },
      { status: 401 }
    );
  }
}
