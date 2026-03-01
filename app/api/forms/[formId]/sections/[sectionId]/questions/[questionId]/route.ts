import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; sectionId: string; questionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId, questionId } = await params;
    const body = await request.json();

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { _count: { select: { submissions: true } } },
    });
    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (form._count.submissions > 0) {
      return NextResponse.json(
        { error: "Cannot modify questions of a form that has submissions" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.text !== undefined) updateData.text = body.text;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.required !== undefined) updateData.required = body.required;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.options !== undefined) updateData.options = body.options;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });

    return NextResponse.json({ question });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string; sectionId: string; questionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId, questionId } = await params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { _count: { select: { submissions: true } } },
    });
    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (form._count.submissions > 0) {
      return NextResponse.json(
        { error: "Cannot delete questions of a form that has submissions" },
        { status: 400 }
      );
    }

    await prisma.question.delete({ where: { id: questionId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
