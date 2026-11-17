
function base64urlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function verifyAdmin(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);

  if (!match || !env.SESSION_SECRET) return false;

  try {
    const parts = match[1].split(".");
    if (parts.length !== 2) return false;

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

    if (!valid) return false;

    const data = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(payload))
    );

    return !!data.username && data.exp >= Date.now();
  } catch {
    return false;
  }
}

export async function onRequestGet({ request, env }) {
  try {
    if (!(await verifyAdmin(request, env))) {
      return Response.json(
        { success: false, message: "অনুমতি নেই।" },
        { status: 401 }
      );
    }

    if (!env.DB) {
      return Response.json(
        { success: false, message: "ডেটাবেজ পাওয়া যায়নি।" },
        { status: 500 }
      );
    }

    const result = await env.DB.prepare(`
      SELECT
        application_id,
        academic_year,
        class,
        group_name,
        student_name,
        application_data,
        documents,
        status
      FROM admissions
      ORDER BY rowid DESC
      LIMIT 200
    `).all();

    return Response.json({
      success: true,
      total: result.results.length,
      applications: result.results
    });

  } catch (error) {
    return Response.json(
      { success: false, message: "আবেদন তালিকা পাওয়া যায়নি।" },
      { status: 500 }
    );
  }
}
