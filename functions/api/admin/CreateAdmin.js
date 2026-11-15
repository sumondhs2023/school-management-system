
async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    key,
    256
  );

  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB || !env.ADMIN_SETUP_KEY) {
      return Response.json({
        success: false,
        message: "সার্ভার সেটআপ সম্পূর্ণ হয়নি।"
      }, { status: 500 });
    }

    const setupKey = request.headers.get("x-setup-key");

    if (setupKey !== env.ADMIN_SETUP_KEY) {
      return Response.json({
        success: false,
        message: "অনুমতি নেই।"
      }, { status: 403 });
    }

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM admins"
    ).first();

    if (count.total > 0) {
      return Response.json({
        success: false,
        message: "Admin ইতিমধ্যে তৈরি আছে।"
      }, { status: 409 });
    }

    const { username, password } = await request.json();

    if (!username || !password || password.length < 10) {
      return Response.json({
        success: false,
        message: "ইউজারনেম দিন এবং কমপক্ষে ১০ অক্ষরের পাসওয়ার্ড দিন।"
      }, { status: 400 });
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const iterations = 100000;

    const hash = await hashPassword(
      password,
      salt,
      iterations
    );

    const passwordHash =
      `pbkdf2$${iterations}$${saltHex}$${hash}`;

    await env.DB.prepare(
      "INSERT INTO admins (username, password_hash) VALUES (?, ?)"
    ).bind(username.trim(), passwordHash).run();

    return Response.json({
      success: true,
      message: "Admin তৈরি হয়েছে।"
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: String(error)
    }, { status: 500 });
  }
}
