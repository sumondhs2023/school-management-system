export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { success: false, message: "ইউজারনেম ও পাসওয়ার্ড দিন।" },
        { status: 400 }
      );
    }

    const admin = await env.DB.prepare(
      "SELECT * FROM admins WHERE username = ?"
    ).bind(username).first();

    if (!admin || admin.password !== password) {
      return Response.json(
        { success: false, message: "ভুল ইউজারনেম অথবা পাসওয়ার্ড।" },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      message: "লগইন সফল হয়েছে।"
    });
  } catch (error) {
    return Response.json(
      { success: false, message: "সার্ভারে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }
}
