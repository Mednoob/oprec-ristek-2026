"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/loading";
import { toast } from "@/components/toast";

interface Answer {
  id: string;
  value: string;
  question: { text: string; type: string };
}

interface Submission {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
  answers: Answer[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SubmissionsPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forms/${formId}/submissions?page=${page}&limit=20`)
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setPagination(data.pagination || null);
      })
      .catch(() => toast("Failed to load submissions", "error"))
      .finally(() => setLoading(false));
  }, [formId, page, router]);

  if (loading) return <PageLoading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/forms/${formId}/edit`}
              className="text-muted hover:text-foreground transition-colors"
            >
              ← Back to Editor
            </Link>
            <h1 className="font-semibold">Submissions</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/forms/${formId}/analytics`}
              className="btn-outline text-sm"
            >
              View Analytics
            </Link>
            <Link href="/dashboard" className="btn-outline text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {pagination && (
          <p className="text-sm text-muted mb-4">
            {pagination.total} total response{pagination.total !== 1 ? "s" : ""}
          </p>
        )}

        {submissions.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="font-semibold text-lg mb-1">No responses yet</h3>
            <p className="text-muted text-sm">
              Share your form to start collecting responses.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {submissions.map((submission, idx) => (
                <Link
                  key={submission.id}
                  href={`/forms/${formId}/submissions/${submission.id}`}
                  className="card block hover:shadow-md transition-shadow fade-in"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-muted">
                          #{(page - 1) * 20 + idx + 1}
                        </span>
                        <span className="font-medium">
                          {submission.respondentName || "Anonymous"}
                        </span>
                        {submission.respondentEmail && (
                          <span className="text-sm text-muted">
                            ({submission.respondentEmail})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        Submitted{" "}
                        {new Date(submission.submittedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                        {" · "}
                        {submission.answers.length} answer
                        {submission.answers.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span className="text-muted text-sm">View →</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  className="btn-outline text-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className="text-sm text-muted">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  className="btn-outline text-sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
