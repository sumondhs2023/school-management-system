
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

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      throw new Error("Database binding missing");
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
      throw new Error("Invalid password hash format");
    }

    const iterations = Number(parts[1]);

    if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) {
      throw new Error("Invalid password settings");
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

    return Response.json({
      success: true,
      message: "লগইন সফল হয়েছে।"
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: "সার্ভারে সমস্যা হয়েছে।"
    }, { status: 500 });
  }
}
