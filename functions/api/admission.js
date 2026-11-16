
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return Response.json(
        { success: false, message: "ডেটাবেজ সংযোগ পাওয়া যায়নি।" },
        { status: 500 }
      );
    }

    const form = await request.formData();

    const studentName = form.get("student_name_bn");
    const academicYear = form.get("academic_year");
    const studentClass = form.get("class");
    const group = form.get("group") || "";

    if (!studentName || !academicYear || !studentClass) {
      return Response.json(
        { success: false, message: "প্রয়োজনীয় তথ্য পূরণ করুন।" },
        { status: 400 }
      );
    }

    if (!["6", "7", "8", "9"].includes(studentClass)) {
      return Response.json(
        { success: false, message: "সঠিক শ্রেণি নির্বাচন করুন।" },
        { status: 400 }
      );
    }

    if (studentClass === "9" &&
        !["Science", "Arts", "Commerce"].includes(group)) {
      return Response.json(
        { success: false, message: "নবম শ্রেণির বিভাগ নির্বাচন করুন।" },
        { status: 400 }
      );
    }

    const data = {};
    const documentNames = {};

    for (const [key, value] of form.entries()) {
      if (value instanceof File) {
        if (value.name) {
          documentNames[key] = value.name;
        }
      } else {
        data[key] = value;
      }
    }

    const applicationId =
      "APP-" + academicYear + "-" +
      Date.now().toString() + "-" +
      crypto.randomUUID().slice(0, 6).toUpperCase();

    await env.DB.prepare(`
      INSERT INTO admissions (
        application_id,
        academic_year,
        class,
        group_name,
        student_name,
        application_data,
        documents,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      applicationId,
      academicYear,
      studentClass,
      studentClass === "9" ? group : null,
      studentName,
      JSON.stringify(data),
      JSON.stringify(documentNames),
      "pending"
    ).run();

    return Response.json({
      success: true,
      message: "আবেদন তথ্য জমা হয়েছে।",
      application_id: applicationId,
      notice: "ছবি ও সনদের আসল ফাইল এখনো সংরক্ষিত হয়নি।"
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "আবেদন জমা করা যায়নি। আবার চেষ্টা করুন।"
      },
      { status: 500 }
    );
  }
}
