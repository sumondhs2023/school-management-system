export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) {
      return Response.json(
        { success: false, message: "ডেটাবেজ সংযোগ পাওয়া যায়নি।" },
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
        status
      FROM admissions
      ORDER BY rowid DESC
      LIMIT 200
    `).all();

    return Response.json({
      success: true,
      applications: result.results || []
    });

  } catch (error) {
    return Response.json(
      { success: false, message: "আবেদনের তালিকা পাওয়া যায়নি।" },
      { status: 500 }
    );
  }
}
