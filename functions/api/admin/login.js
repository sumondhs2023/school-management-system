async function hashPassword(password, saltHex, iterations) {
  const salt = Uint8Array.from(
    saltHex.match(/.{2}/g),
    x => parseInt(x, 16)
  );

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

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createSession(username, secret) {
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        username,
        exp: Date.now() + 8 * 60 * 60 * 1000
      })
    )
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return payload + "." + toBase64Url(new Uint8Array(signature));
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB || !env.SESSION_SECRET) {
      throw new Error("Required configuration missing");
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({
        success: false,
        message: "ইউজারনেম ও পাসওয়ার্ড দিন।"
      }, { status: 400 });
    }

    const admin = await env.DB.prepare(
      "SELECT * FROM admins WHERE username = ?"
    ).bind(username.trim()).first();

    if (!admin) {
      return Response.json({
        success: false,
        message: "ভুল ইউজারনেম অথবা পাসওয়ার্ড।"
      }, { status: 401 });
    }

    const parts = admin.password_hash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      throw new Error("Invalid password hash");
    }

    const iterations = Number(parts[1]);

    if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 100000) {
      throw new Error("Invalid iterations");
    }

    const calculatedHash = await hashPassword(
      password,
      parts[2],
      iterations
    );

    if (calculatedHash !== parts[3]) {
      return Response.json({
        success: false,
        message: "ভুল ইউজারনেম অথবা পাসওয়ার্ড।"
      }, { status: 401 });
    }

    const session = await createSession(
      username.trim(),
      env.SESSION_SECRET
    );

    return Response.json(
      {
        success: true,
        message: "লগইন সফল হয়েছে।"
      },
      {
        headers: {
          "Set-Cookie": `admin_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
        }
      }
    );

  } catch (error) {
    return Response.json({
      success: false,
      message: "সার্ভারে সমস্যা হয়েছে।"
    }, { status: 500 });
  }
}
