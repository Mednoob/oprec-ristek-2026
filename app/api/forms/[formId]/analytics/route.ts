import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
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
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: {
                answers: {
                  select: { value: true },
                },
              },
            },
          },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!form || form.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build analytics per question
    const analytics = form.sections.flatMap((section) =>
      section.questions.map((question) => {
        const answers = question.answers.map((a) => a.value);
        const totalResponses = answers.length;

        if (
          ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(question.type)
        ) {
          // Count occurrences of each option
          const optionCounts: Record<string, number> = {};
          const options = (question.options as string[]) || [];
          options.forEach((opt) => (optionCounts[opt] = 0));

          answers.forEach((answer) => {
            // For checkboxes, answers might be comma-separated
            if (question.type === "CHECKBOX") {
              const selected = answer.split(",").map((s) => s.trim());
              selected.forEach((s) => {
                optionCounts[s] = (optionCounts[s] || 0) + 1;
              });
            } else {
              optionCounts[answer] = (optionCounts[answer] || 0) + 1;
            }
          });

          return {
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            sectionTitle: section.title,
            totalResponses,
            chartData: Object.entries(optionCounts).map(([name, value]) => ({
              name,
              value,
            })),
          };
        }

        if (question.type === "NUMBER" || question.type === "LINEAR_SCALE") {
          const numbers = answers.map(Number).filter((n) => !isNaN(n));
          const avg =
            numbers.length > 0
              ? numbers.reduce((a, b) => a + b, 0) / numbers.length
              : 0;
          const min = numbers.length > 0 ? Math.min(...numbers) : 0;
          const max = numbers.length > 0 ? Math.max(...numbers) : 0;

          // Build distribution
          const distribution: Record<string, number> = {};
          numbers.forEach((n) => {
            const key = String(n);
            distribution[key] = (distribution[key] || 0) + 1;
          });

          return {
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            sectionTitle: section.title,
            totalResponses,
            stats: { avg: Math.round(avg * 100) / 100, min, max },
            chartData: Object.entries(distribution)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([name, value]) => ({ name, value })),
          };
        }

        // Text-based: just return answer list
        return {
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          sectionTitle: section.title,
          totalResponses,
          answers: answers.slice(0, 50),
        };
      })
    );

    return NextResponse.json({
      analytics,
      totalSubmissions: form._count.submissions,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
