import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: Record<string, unknown> = { userId: user.id };
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    const validSortFields = ["title", "status", "createdAt", "updatedAt"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "updatedAt";

    const forms = await prisma.form.findMany({
      where,
      include: {
        _count: {
          select: { submissions: true, sections: true },
        },
      },
      orderBy: { [orderField]: sortOrder === "asc" ? "asc" : "desc" },
    });

    return NextResponse.json({ forms });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await prisma.form.create({
      data: {
        userId: user.id,
        title: "Untitled Form",
        sections: {
          create: {
            title: "Section 1",
            order: 0,
            questions: {
              create: {
                text: "Untitled Question",
                type: "SHORT_TEXT",
                order: 0,
              },
            },
          },
        },
      },
      include: {
        sections: {
          include: { questions: true },
        },
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
