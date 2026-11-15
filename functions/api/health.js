
export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      { success: false, message: "Database সংযোগ পাওয়া যায়নি" },
      { status: 500 }
    );
  }

  try {
    const result = await env.DB.prepare("SELECT 1 AS connected").first();

    return Response.json({
      success: true,
      message: "School Database Connected",
      database: result.connected === 1
    });
  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
