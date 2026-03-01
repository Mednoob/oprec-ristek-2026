"use client";

import { useEffect, useState, use } from "react";
import { PageLoading, LoadingSpinner } from "@/components/loading";
import { toast } from "@/components/toast";

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  order: number;
  options: string[] | null;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
}

interface Form {
  id: string;
  title: string;
  description: string | null;
  user: { name: string };
  sections: Section[];
}

export default function RespondPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/forms/${formId}/public`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Form not available");
          return;
        }
        setForm(data.form);
      })
      .catch(() => setError("Failed to load form"))
      .finally(() => setLoading(false));
  }, [formId]);

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear validation error on change
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function toggleCheckbox(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = prev[questionId] || "";
      const selected = current ? current.split(",").map((s) => s.trim()) : [];
      const idx = selected.indexOf(option);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else {
        selected.push(option);
      }
      return { ...prev, [questionId]: selected.join(", ") };
    });
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function validateCurrentSection(): boolean {
    if (!form) return false;
    const section = form.sections[activeSection];
    const errors: Record<string, string> = {};

    for (const q of section.questions) {
      if (q.required && (!answers[q.id] || answers[q.id].trim() === "")) {
        errors[q.id] = "This question is required";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToNextSection() {
    if (!validateCurrentSection()) {
      toast("Please answer all required questions", "error");
      return;
    }
    setActiveSection((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPrevSection() {
    setActiveSection((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!validateCurrentSection()) {
      toast("Please answer all required questions", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentName: respondentName || null,
          respondentEmail: respondentEmail || null,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to submit", "error");
        return;
      }

      setSubmitted(true);
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="card text-center max-w-md">
          <div className="text-4xl mb-3">🚫</div>
          <h1 className="text-xl font-bold mb-2">Form Unavailable</h1>
          <p className="text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="card text-center max-w-md">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-bold mb-2">Response Submitted!</h1>
          <p className="text-muted text-sm mb-4">
            Thank you for filling out this form.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
              setActiveSection(0);
              setRespondentName("");
              setRespondentEmail("");
            }}
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  if (!form) return null;
  const currentSection = form.sections[activeSection];
  const isLastSection = activeSection === form.sections.length - 1;
  const isFirstSection = activeSection === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <div className="card mb-4 border-t-4 border-t-primary">
          <h1 className="text-2xl font-bold mb-1">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-muted mb-2">{form.description}</p>
          )}
          <p className="text-xs text-muted">by {form.user.name}</p>
        </div>

        {/* Respondent Info (first section only) */}
        {isFirstSection && (
          <div className="card mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Name <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Email <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="email"
                  className="input"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section progress */}
        {form.sections.length > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-muted mb-2">
              <span>
                Section {activeSection + 1} of {form.sections.length}
              </span>
              <span>
                {Math.round(((activeSection + 1) / form.sections.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((activeSection + 1) / form.sections.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Section Header */}
        {(form.sections.length > 1 || currentSection.title !== "Section 1") && (
          <div className="card mb-4 bg-primary-light border-primary/20">
            <h2 className="font-semibold text-lg">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-sm text-muted mt-1">
                {currentSection.description}
              </p>
            )}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {currentSection.questions.map((question) => (
            <div
              key={question.id}
              className={`card ${
                validationErrors[question.id]
                  ? "border-red-300 bg-red-50/50"
                  : ""
              }`}
            >
              <label className="block font-medium mb-3">
                {question.text}
                {question.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>

              {/* Short Text */}
              {question.type === "SHORT_TEXT" && (
                <input
                  type="text"
                  className="input"
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="Your answer"
                />
              )}

              {/* Long Text */}
              {question.type === "LONG_TEXT" && (
                <textarea
                  className="input min-h-[100px] resize-y"
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="Your answer"
                />
              )}

              {/* Multiple Choice */}
              {question.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  {(question.options || []).map((opt, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        value={opt}
                        checked={answers[question.id] === opt}
                        onChange={() => updateAnswer(question.id, opt)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Checkbox */}
              {question.type === "CHECKBOX" && (
                <div className="space-y-2">
                  {(question.options || []).map((opt, i) => {
                    const selected = (answers[question.id] || "")
                      .split(",")
                      .map((s) => s.trim());
                    return (
                      <label
                        key={i}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => toggleCheckbox(question.id, opt)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Dropdown */}
              {question.type === "DROPDOWN" && (
                <select
                  className="input"
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                >
                  <option value="">Choose...</option>
                  {(question.options || []).map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {/* Date */}
              {question.type === "DATE" && (
                <input
                  type="date"
                  className="input"
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                />
              )}

              {/* Number */}
              {question.type === "NUMBER" && (
                <input
                  type="number"
                  className="input"
                  value={answers[question.id] || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="0"
                />
              )}

              {/* Linear Scale */}
              {question.type === "LINEAR_SCALE" && (
                <div className="flex items-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-colors ${
                        answers[question.id] === String(n)
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 hover:border-primary"
                      }`}
                      onClick={() => updateAnswer(question.id, String(n))}
                      type="button"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {validationErrors[question.id] && (
                <p className="text-red-500 text-sm mt-2">
                  {validationErrors[question.id]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {!isFirstSection && (
              <button className="btn-outline" onClick={goToPrevSection}>
                ← Previous
              </button>
            )}
          </div>
          <div>
            {isLastSection ? (
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting && <LoadingSpinner size="sm" />}
                {submitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button className="btn-primary" onClick={goToNextSection}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
