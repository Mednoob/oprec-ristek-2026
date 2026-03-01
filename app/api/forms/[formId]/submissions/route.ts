import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET submissions for a form (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { formId },
        include: {
          answers: {
            include: {
              question: { select: { text: true, type: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.submission.count({ where: { formId } }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST a new submission (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await request.json();

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "This form is not accepting responses" },
        { status: 403 }
      );
    }

    // Validate required questions
    const allQuestions = form.sections.flatMap((s) => s.questions);
    const requiredQuestions = allQuestions.filter((q) => q.required);
    const answers: Record<string, string> = body.answers || {};

    for (const q of requiredQuestions) {
      if (!answers[q.id] || answers[q.id].trim() === "") {
        return NextResponse.json(
          { error: `Question "${q.text}" is required` },
          { status: 400 }
        );
      }
    }

    const submission = await prisma.submission.create({
      data: {
        formId,
        respondentName: body.respondentName || null,
        respondentEmail: body.respondentEmail || null,
        answers: {
          create: Object.entries(answers)
            .filter(([questionId]) =>
              allQuestions.some((q) => q.id === questionId)
            )
            .map(([questionId, value]) => ({
              questionId,
              value: String(value),
            })),
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
