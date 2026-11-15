
export async function onRequestGet({ request }) {
  const cookie = request.headers.get("Cookie") || "";

  if (!cookie.includes("admin_session=logged_in")) {
    return Response.json({
      success: false,
      message: "অনুমতি নেই। আগে লগইন করুন।"
    }, { status: 401 });
  }

  return Response.json({
    success: true,
    message: "Admin যাচাই সফল।"
  });
}
