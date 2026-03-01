import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId, sectionId } = await params;
    const body = await request.json().catch(() => ({}));

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { _count: { select: { submissions: true } } },
    });
    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (form._count.submissions > 0) {
      return NextResponse.json(
        { error: "Cannot add questions to a form that has submissions" },
        { status: 400 }
      );
    }

    const existingQuestions = await prisma.question.findMany({
      where: { sectionId },
    });
    const maxOrder = existingQuestions.reduce((max, q) => Math.max(max, q.order), -1);

    const question = await prisma.question.create({
      data: {
        sectionId,
        text: body.text || "Untitled Question",
        type: body.type || "SHORT_TEXT",
        required: body.required || false,
        order: maxOrder + 1,
        options: body.options || null,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
