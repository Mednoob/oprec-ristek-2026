import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId, sectionId } = await params;
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
        { error: "Cannot modify sections of a form that has submissions" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.order !== undefined) updateData.order = body.order;

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: updateData,
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ section });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId, sectionId } = await params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        _count: { select: { submissions: true } },
        sections: true,
      },
    });
    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (form._count.submissions > 0) {
      return NextResponse.json(
        { error: "Cannot delete sections of a form that has submissions" },
        { status: 400 }
      );
    }
    if (form.sections.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last section" },
        { status: 400 }
      );
    }

    await prisma.section.delete({ where: { id: sectionId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
