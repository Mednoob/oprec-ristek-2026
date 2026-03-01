import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        _count: { select: { submissions: true } },
        sections: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    if (form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (form._count.submissions > 0) {
      return NextResponse.json(
        { error: "Cannot add sections to a form that has submissions" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const maxOrder = form.sections.reduce((max, s) => Math.max(max, s.order), -1);

    const section = await prisma.section.create({
      data: {
        formId,
        title: body.title || `Section ${form.sections.length + 1}`,
        description: body.description || null,
        order: maxOrder + 1,
      },
      include: { questions: true },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
