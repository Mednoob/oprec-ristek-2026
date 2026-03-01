import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId, submissionId } = await params;

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: {
            question: {
              select: { text: true, type: true, options: true, sectionId: true },
            },
          },
        },
      },
    });

    if (!submission || submission.formId !== formId) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ submission });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
