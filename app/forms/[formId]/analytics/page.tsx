"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/loading";
import { toast } from "@/components/toast";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartDataItem {
  name: string;
  value: number;
}

interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType: string;
  sectionTitle: string;
  totalResponses: number;
  chartData?: ChartDataItem[];
  stats?: { avg: number; min: number; max: number };
  answers?: string[];
}

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const router = useRouter();
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forms/${formId}/analytics`)
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
        setAnalytics(data.analytics || []);
        setTotalSubmissions(data.totalSubmissions || 0);
      })
      .catch(() => toast("Failed to load analytics", "error"))
      .finally(() => setLoading(false));
  }, [formId, router]);

  if (loading) return <PageLoading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-border px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/forms/${formId}/edit`}
              className="text-muted hover:text-foreground transition-colors"
            >
              ← Back to Editor
            </Link>
            <h1 className="font-semibold">Response Analytics</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/forms/${formId}/submissions`}
              className="btn-outline text-sm"
            >
              View Submissions
            </Link>
            <Link href="/dashboard" className="btn-outline text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Summary */}
        <div className="card mb-8">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">
                {totalSubmissions}
              </div>
              <div className="text-sm text-muted">Total Responses</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{analytics.length}</div>
              <div className="text-sm text-muted">Questions</div>
            </div>
          </div>
        </div>

        {totalSubmissions === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-1">No data to analyze</h3>
            <p className="text-muted text-sm">
              Share your form to start collecting responses for analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {analytics.map((q) => (
              <div key={q.questionId} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{q.questionText}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded">
                        {q.questionType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted">
                        {q.sectionTitle}
                      </span>
                      <span className="text-xs text-muted">
                        · {q.totalResponses} response
                        {q.totalResponses !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Choice-based charts */}
                {q.chartData &&
                  ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(
                    q.questionType
                  ) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Pie Chart */}
                      <div>
                        <h4 className="text-sm font-medium text-muted mb-3">
                          Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={q.chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {q.chartData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar Chart */}
                      <div>
                        <h4 className="text-sm font-medium text-muted mb-3">
                          Breakdown
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={q.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                {/* Number/Scale charts */}
                {q.chartData &&
                  ["NUMBER", "LINEAR_SCALE"].includes(q.questionType) && (
                    <div>
                      {q.stats && (
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {q.stats.avg}
                            </div>
                            <div className="text-xs text-blue-500">Average</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-green-600">
                              {q.stats.min}
                            </div>
                            <div className="text-xs text-green-500">Min</div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-orange-600">
                              {q.stats.max}
                            </div>
                            <div className="text-xs text-orange-500">Max</div>
                          </div>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={q.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                {/* Text answers */}
                {q.answers && (
                  <div>
                    <h4 className="text-sm font-medium text-muted mb-2">
                      Responses ({q.totalResponses})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {q.answers.map((answer, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 px-3 py-2 rounded-lg text-sm"
                        >
                          {answer || (
                            <span className="text-muted italic">Empty</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
