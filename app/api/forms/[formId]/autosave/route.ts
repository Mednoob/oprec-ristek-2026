import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Bulk autosave endpoint - saves entire form state
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;
    const body = await request.json();

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { _count: { select: { submissions: true } } },
    });

    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (form._count.submissions > 0) {
      // Only allow title/description/status changes when there are submissions
      const updateData: Record<string, unknown> = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.status !== undefined) updateData.status = body.status;

      const updated = await prisma.form.update({
        where: { id: formId },
        data: updateData,
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { questions: { orderBy: { order: "asc" } } },
          },
          _count: { select: { submissions: true } },
        },
      });

      return NextResponse.json({ form: updated, savedAt: new Date().toISOString() });
    }

    // Full save: update form + sections + questions
    await prisma.$transaction(async (tx) => {
      // Update form
      await tx.form.update({
        where: { id: formId },
        data: {
          title: body.title || form.title,
          description: body.description ?? form.description,
          status: body.status || form.status,
        },
      });

      if (body.sections) {
        // Get existing section and question IDs
        const existingSections = await tx.section.findMany({
          where: { formId },
          include: { questions: true },
        });
        const existingSectionIds = existingSections.map((s) => s.id);
        const existingQuestionIds = existingSections.flatMap((s) =>
          s.questions.map((q) => q.id)
        );

        const newSectionIds = body.sections.map((s: { id: string }) => s.id);
        const newQuestionIds = body.sections.flatMap(
          (s: { questions: { id: string }[] }) =>
            (s.questions || []).map((q: { id: string }) => q.id)
        );

        // Delete removed questions
        const questionsToDelete = existingQuestionIds.filter(
          (id) => !newQuestionIds.includes(id)
        );
        if (questionsToDelete.length > 0) {
          await tx.question.deleteMany({
            where: { id: { in: questionsToDelete } },
          });
        }

        // Delete removed sections
        const sectionsToDelete = existingSectionIds.filter(
          (id) => !newSectionIds.includes(id)
        );
        if (sectionsToDelete.length > 0) {
          await tx.section.deleteMany({
            where: { id: { in: sectionsToDelete } },
          });
        }

        // Upsert sections and questions
        for (const section of body.sections) {
          await tx.section.upsert({
            where: { id: section.id },
            create: {
              id: section.id,
              formId,
              title: section.title || "Untitled Section",
              description: section.description || null,
              order: section.order ?? 0,
            },
            update: {
              title: section.title || "Untitled Section",
              description: section.description || null,
              order: section.order ?? 0,
            },
          });

          if (section.questions) {
            for (const question of section.questions) {
              await tx.question.upsert({
                where: { id: question.id },
                create: {
                  id: question.id,
                  sectionId: section.id,
                  text: question.text || "Untitled Question",
                  type: question.type || "SHORT_TEXT",
                  required: question.required || false,
                  order: question.order ?? 0,
                  options: question.options || null,
                },
                update: {
                  text: question.text || "Untitled Question",
                  type: question.type || "SHORT_TEXT",
                  required: question.required || false,
                  order: question.order ?? 0,
                  options: question.options || null,
                  sectionId: section.id,
                },
              });
            }
          }
        }
      }
    });

    const updated = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { questions: { orderBy: { order: "asc" } } },
        },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json({ form: updated, savedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Autosave error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
