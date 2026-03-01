"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/loading";
import { toast } from "@/components/toast";

interface Answer {
  id: string;
  value: string;
  question: {
    text: string;
    type: string;
    options: string[] | null;
    sectionId: string;
  };
}

interface Submission {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
  answers: Answer[];
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ formId: string; submissionId: string }>;
}) {
  const { formId, submissionId } = use(params);
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forms/${formId}/submissions/${submissionId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          router.push(`/forms/${formId}/submissions`);
          return;
        }
        const data = await res.json();
        setSubmission(data.submission);
      })
      .catch(() => toast("Failed to load submission", "error"))
      .finally(() => setLoading(false));
  }, [formId, submissionId, router]);

  if (loading) return <PageLoading />;
  if (!submission) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href={`/forms/${formId}/submissions`}
            className="text-muted hover:text-foreground transition-colors"
          >
            ← Back to Submissions
          </Link>
          <Link href="/dashboard" className="btn-outline text-sm">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Respondent info */}
        <div className="card mb-6 border-t-4 border-t-primary">
          <h1 className="text-xl font-bold mb-2">Submission Detail</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Name:</span>{" "}
              <span className="font-medium">
                {submission.respondentName || "Anonymous"}
              </span>
            </div>
            <div>
              <span className="text-muted">Email:</span>{" "}
              <span className="font-medium">
                {submission.respondentEmail || "Not provided"}
              </span>
            </div>
            <div>
              <span className="text-muted">Submitted:</span>{" "}
              <span className="font-medium">
                {new Date(submission.submittedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div>
              <span className="text-muted">Answers:</span>{" "}
              <span className="font-medium">{submission.answers.length}</span>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="space-y-4">
          {submission.answers.map((answer) => (
            <div key={answer.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm">{answer.question.text}</h3>
                <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded">
                  {answer.question.type.replace("_", " ")}
                </span>
              </div>
              <div className="text-sm bg-gray-50 px-3 py-2 rounded-lg">
                {answer.question.type === "CHECKBOX" ? (
                  <div className="flex flex-wrap gap-2">
                    {answer.value.split(",").map((v, i) => (
                      <span
                        key={i}
                        className="bg-primary-light text-primary px-2 py-0.5 rounded text-xs font-medium"
                      >
                        {v.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  answer.value || <span className="text-muted italic">No answer</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
