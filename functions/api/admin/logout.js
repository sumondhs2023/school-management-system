export async function onRequestPost() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "লগআউট সফল হয়েছে।"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      }
    }
  );
}
