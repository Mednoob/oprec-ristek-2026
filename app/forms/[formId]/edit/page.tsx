"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/loading";
import { toast } from "@/components/toast";
import { v4 as uuid } from "uuid";

type QuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "DROPDOWN"
  | "DATE"
  | "NUMBER"
  | "LINEAR_SCALE";

interface Question {
  id: string;
  text: string;
  type: QuestionType;
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
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  sections: Section[];
  _count: { submissions: number };
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: "SHORT_TEXT", label: "Short Text", icon: "📝" },
  { value: "LONG_TEXT", label: "Long Text", icon: "📄" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: "⭕" },
  { value: "CHECKBOX", label: "Checkbox", icon: "☑️" },
  { value: "DROPDOWN", label: "Dropdown", icon: "📋" },
  { value: "DATE", label: "Date", icon: "📅" },
  { value: "NUMBER", label: "Number", icon: "#️⃣" },
  { value: "LINEAR_SCALE", label: "Linear Scale", icon: "📊" },
];

export default function FormEditorPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<Form | null>(null);

  const hasSubmissions = form ? form._count.submissions > 0 : false;

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}`);
      if (!res.ok) {
        if (res.status === 401) router.push("/login");
        else if (res.status === 404) router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setForm(data.form);
      formRef.current = data.form;
    } catch {
      toast("Failed to load form", "error");
    } finally {
      setLoading(false);
    }
  }, [formId, router]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const autosave = useCallback(async () => {
    if (!formRef.current) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/autosave`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formRef.current.title,
          description: formRef.current.description,
          status: formRef.current.status,
          sections: formRef.current.sections.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            order: s.order,
            questions: s.questions.map((q) => ({
              id: q.id,
              text: q.text,
              type: q.type,
              required: q.required,
              order: q.order,
              options: q.options,
            })),
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastSaved(data.savedAt);
        setHasChanges(false);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }, [formId]);

  const triggerAutosave = useCallback(() => {
    setHasChanges(true);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autosave();
    }, 2000);
  }, [autosave]);

  const updateForm = useCallback(
    (updater: (f: Form) => Form) => {
      setForm((prev) => {
        if (!prev) return prev;
        const updated = updater(prev);
        formRef.current = updated;
        return updated;
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  // Section operations
  function addSection() {
    if (hasSubmissions) {
      toast("Cannot modify form structure with existing responses", "error");
      return;
    }
    const newSection: Section = {
      id: uuid(),
      title: `Section ${(form?.sections.length || 0) + 1}`,
      description: null,
      order: form?.sections.length || 0,
      questions: [],
    };
    updateForm((f) => ({
      ...f,
      sections: [...f.sections, newSection],
    }));
    setActiveSection((form?.sections.length || 0));
  }

  function deleteSection(sectionIdx: number) {
    if (hasSubmissions) {
      toast("Cannot modify form structure with existing responses", "error");
      return;
    }
    if ((form?.sections.length || 0) <= 1) {
      toast("Cannot delete the last section", "error");
      return;
    }
    updateForm((f) => ({
      ...f,
      sections: f.sections
        .filter((_, i) => i !== sectionIdx)
        .map((s, i) => ({ ...s, order: i })),
    }));
    if (activeSection >= sectionIdx && activeSection > 0) {
      setActiveSection(activeSection - 1);
    }
  }

  function moveSectionUp(idx: number) {
    if (idx <= 0 || hasSubmissions) return;
    updateForm((f) => {
      const sections = [...f.sections];
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
      return { ...f, sections: sections.map((s, i) => ({ ...s, order: i })) };
    });
    setActiveSection(idx - 1);
  }

  function moveSectionDown(idx: number) {
    if (!form || idx >= form.sections.length - 1 || hasSubmissions) return;
    updateForm((f) => {
      const sections = [...f.sections];
      [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
      return { ...f, sections: sections.map((s, i) => ({ ...s, order: i })) };
    });
    setActiveSection(idx + 1);
  }

  // Question operations
  function addQuestion(sectionIdx: number) {
    if (hasSubmissions) {
      toast("Cannot modify form structure with existing responses", "error");
      return;
    }
    const section = form?.sections[sectionIdx];
    const newQuestion: Question = {
      id: uuid(),
      text: "Untitled Question",
      type: "SHORT_TEXT",
      required: false,
      order: section?.questions.length || 0,
      options: null,
    };
    updateForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === sectionIdx
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      ),
    }));
  }

  function updateQuestion(
    sectionIdx: number,
    questionIdx: number,
    updates: Partial<Question>
  ) {
    if (hasSubmissions) {
      toast("Cannot modify form structure with existing responses", "error");
      return;
    }
    updateForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              questions: s.questions.map((q, j) =>
                j === questionIdx ? { ...q, ...updates } : q
              ),
            }
          : s
      ),
    }));
  }

  function deleteQuestion(sectionIdx: number, questionIdx: number) {
    if (hasSubmissions) {
      toast("Cannot modify form structure with existing responses", "error");
      return;
    }
    updateForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              questions: s.questions
                .filter((_, j) => j !== questionIdx)
                .map((q, j) => ({ ...q, order: j })),
            }
          : s
      ),
    }));
  }

  function moveQuestionUp(sectionIdx: number, questionIdx: number) {
    if (questionIdx <= 0 || hasSubmissions) return;
    updateForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => {
        if (i !== sectionIdx) return s;
        const questions = [...s.questions];
        [questions[questionIdx - 1], questions[questionIdx]] = [
          questions[questionIdx],
          questions[questionIdx - 1],
        ];
        return { ...s, questions: questions.map((q, j) => ({ ...q, order: j })) };
      }),
    }));
  }

  function moveQuestionDown(sectionIdx: number, questionIdx: number) {
    const section = form?.sections[sectionIdx];
    if (!section || questionIdx >= section.questions.length - 1 || hasSubmissions)
      return;
    updateForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => {
        if (i !== sectionIdx) return s;
        const questions = [...s.questions];
        [questions[questionIdx], questions[questionIdx + 1]] = [
          questions[questionIdx + 1],
          questions[questionIdx],
        ];
        return { ...s, questions: questions.map((q, j) => ({ ...q, order: j })) };
      }),
    }));
  }

  function changeQuestionType(
    sectionIdx: number,
    questionIdx: number,
    type: QuestionType
  ) {
    const needsOptions = ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(type);
    updateQuestion(sectionIdx, questionIdx, {
      type,
      options: needsOptions ? ["Option 1"] : null,
    });
  }

  function addOption(sectionIdx: number, questionIdx: number) {
    const q = form?.sections[sectionIdx]?.questions[questionIdx];
    if (!q) return;
    const opts = q.options || [];
    updateQuestion(sectionIdx, questionIdx, {
      options: [...opts, `Option ${opts.length + 1}`],
    });
  }

  function updateOption(
    sectionIdx: number,
    questionIdx: number,
    optionIdx: number,
    value: string
  ) {
    const q = form?.sections[sectionIdx]?.questions[questionIdx];
    if (!q || !q.options) return;
    const opts = [...q.options];
    opts[optionIdx] = value;
    updateQuestion(sectionIdx, questionIdx, { options: opts });
  }

  function deleteOption(
    sectionIdx: number,
    questionIdx: number,
    optionIdx: number
  ) {
    const q = form?.sections[sectionIdx]?.questions[questionIdx];
    if (!q || !q.options || q.options.length <= 1) return;
    updateQuestion(sectionIdx, questionIdx, {
      options: q.options.filter((_, i) => i !== optionIdx),
    });
  }

  async function togglePublish() {
    if (!form) return;
    const newStatus = form.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED";

    // Validate before publishing
    if (newStatus === "PUBLISHED") {
      const allQuestions = form.sections.flatMap((s) => s.questions);
      if (allQuestions.length === 0) {
        toast("Add at least one question before publishing", "error");
        return;
      }
      for (const q of allQuestions) {
        if (!q.text.trim()) {
          toast("All questions must have text before publishing", "error");
          return;
        }
      }
    }

    updateForm((f) => ({ ...f, status: newStatus }));
    // Force immediate save
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setTimeout(() => autosave(), 100);
    toast(
      newStatus === "PUBLISHED"
        ? "Form published! Share the link to collect responses."
        : "Form closed. No new responses will be accepted.",
      "success"
    );
  }

  if (loading) return <PageLoading />;
  if (!form) return null;

  const currentSection = form.sections[activeSection];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-muted hover:text-foreground transition-colors"
            >
              ← Back
            </Link>
            <div className="flex items-center gap-2">
              <span
                className={`badge ${
                  form.status === "PUBLISHED"
                    ? "badge-published"
                    : form.status === "CLOSED"
                    ? "badge-closed"
                    : "badge-draft"
                }`}
              >
                {form.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            <div className="text-xs text-muted flex items-center gap-1.5">
              {saving ? (
                <>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                  Saving...
                </>
              ) : hasChanges ? (
                <>
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  Unsaved changes
                </>
              ) : lastSaved ? (
                <>
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  All changes saved
                </>
              )}
            </div>

            {hasSubmissions && (
              <Link
                href={`/forms/${formId}/submissions`}
                className="btn-outline text-sm"
              >
                Responses ({form._count.submissions})
              </Link>
            )}

            {form.status === "PUBLISHED" && (
              <button
                className="btn-outline text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/forms/${formId}/respond`
                  );
                  toast("Share link copied!", "success");
                }}
              >
                Copy Link
              </button>
            )}

            <button
              className={`${
                form.status === "PUBLISHED" ? "btn-danger" : "btn-primary"
              } text-sm`}
              onClick={togglePublish}
            >
              {form.status === "PUBLISHED" ? "Close Form" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Constraint warning */}
        {hasSubmissions && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <span className="text-lg leading-none">⚠️</span>
            <div>
              <strong>Form has {form._count.submissions} response(s).</strong>
              <br />
              You cannot add, delete, or modify questions while there are submissions.
              You can still change the form title, description, and status.
            </div>
          </div>
        )}

        {/* Form Title & Description */}
        <div className="card mb-6 border-t-4 border-t-primary">
          <input
            type="text"
            className="w-full text-2xl font-bold outline-none bg-transparent mb-2 placeholder-gray-300 border-b border-transparent focus:border-gray-400 duration-200"
            value={form.title}
            onChange={(e) =>
              updateForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="Form title"
          />
          <input
            type="text"
            className="w-full text-sm text-muted outline-none bg-transparent placeholder-gray-300 border-b border-transparent focus:border-gray-400"
            value={form.description || ""}
            onChange={(e) =>
              updateForm((f) => ({
                ...f,
                description: e.target.value || null,
              }))
            }
            placeholder="Form description (optional)"
          />
        </div>

        {/* Section Navigation */}
        {form.sections.length > 1 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {form.sections.map((section, idx) => (
              <button
                key={section.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === idx
                    ? "bg-primary text-white"
                    : "bg-white text-foreground border border-border hover:bg-gray-50"
                }`}
                onClick={() => setActiveSection(idx)}
              >
                {section.title || `Section ${idx + 1}`}
              </button>
            ))}
            {!hasSubmissions && (
              <button
                className="px-3 py-2 rounded-lg text-sm border border-dashed border-gray-300 text-muted hover:border-primary hover:text-primary transition-colors"
                onClick={addSection}
              >
                + Add Section
              </button>
            )}
          </div>
        )}

        {/* Current Section */}
        {currentSection && (
          <div className="space-y-4">
            {/* Section Header */}
            <div className="card bg-primary-light border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <input
                    type="text"
                    className="w-full font-semibold outline-none bg-transparent text-lg placeholder-gray-400 border-b border-transparent focus:border-gray-400 duration-200"
                    value={currentSection.title}
                    onChange={(e) =>
                      updateForm((f) => ({
                        ...f,
                        sections: f.sections.map((s, i) =>
                          i === activeSection
                            ? { ...s, title: e.target.value }
                            : s
                        ),
                      }))
                    }
                    placeholder="Section title"
                    disabled={hasSubmissions}
                  />
                  <input
                    type="text"
                    className="w-full text-sm text-muted outline-none bg-transparent mt-1 placeholder-gray-400 border-b border-transparent focus:border-gray-400 duration-200"
                    value={currentSection.description || ""}
                    onChange={(e) =>
                      updateForm((f) => ({
                        ...f,
                        sections: f.sections.map((s, i) =>
                          i === activeSection
                            ? { ...s, description: e.target.value || null }
                            : s
                        ),
                      }))
                    }
                    placeholder="Section description (optional)"
                    disabled={hasSubmissions}
                  />
                </div>
                {!hasSubmissions && form.sections.length > 1 && (
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      className="p-1 text-muted hover:text-foreground disabled:opacity-30"
                      onClick={() => moveSectionUp(activeSection)}
                      disabled={activeSection === 0}
                      title="Move section up"
                    >
                      ↑
                    </button>
                    <button
                      className="p-1 text-muted hover:text-foreground disabled:opacity-30"
                      onClick={() => moveSectionDown(activeSection)}
                      disabled={activeSection === form.sections.length - 1}
                      title="Move section down"
                    >
                      ↓
                    </button>
                    <button
                      className="p-1 text-red-400 hover:text-red-600"
                      onClick={() => deleteSection(activeSection)}
                      title="Delete section"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted mt-2">
                Page {activeSection + 1} of {form.sections.length} ·{" "}
                {currentSection.questions.length} question
                {currentSection.questions.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Questions */}
            {currentSection.questions.map((question, qIdx) => (
              <QuestionCard
                key={question.id}
                question={question}
                sectionIdx={activeSection}
                questionIdx={qIdx}
                totalQuestions={currentSection.questions.length}
                disabled={hasSubmissions}
                onUpdate={updateQuestion}
                onDelete={deleteQuestion}
                onMoveUp={moveQuestionUp}
                onMoveDown={moveQuestionDown}
                onChangeType={changeQuestionType}
                onAddOption={addOption}
                onUpdateOption={updateOption}
                onDeleteOption={deleteOption}
              />
            ))}

            {/* Add Question Button */}
            {!hasSubmissions && (
              <button
                className="card w-full text-center py-6 border-dashed text-muted hover:text-primary hover:border-primary transition-colors cursor-pointer"
                onClick={() => addQuestion(activeSection)}
              >
                <span className="text-2xl block mb-1">+</span>
                <span className="text-sm">Add question</span>
              </button>
            )}
          </div>
        )}

        {/* Section nav (bottom) */}
        {form.sections.length > 1 && (
          <div className="flex items-center justify-between mt-8">
            <button
              className="btn-outline"
              disabled={activeSection === 0}
              onClick={() => setActiveSection(activeSection - 1)}
            >
              ← Previous Section
            </button>
            <span className="text-sm text-muted">
              Section {activeSection + 1} of {form.sections.length}
            </span>
            <button
              className="btn-outline"
              disabled={activeSection === form.sections.length - 1}
              onClick={() => setActiveSection(activeSection + 1)}
            >
              Next Section →
            </button>
          </div>
        )}

        {/* Add section if only one */}
        {form.sections.length <= 1 && !hasSubmissions && (
          <div className="mt-6 text-center">
            <button className="btn-outline text-sm" onClick={addSection}>
              + Add another section
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Question Card Component
function QuestionCard({
  question,
  sectionIdx,
  questionIdx,
  totalQuestions,
  disabled,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  question: Question;
  sectionIdx: number;
  questionIdx: number;
  totalQuestions: number;
  disabled: boolean;
  onUpdate: (si: number, qi: number, updates: Partial<Question>) => void;
  onDelete: (si: number, qi: number) => void;
  onMoveUp: (si: number, qi: number) => void;
  onMoveDown: (si: number, qi: number) => void;
  onChangeType: (si: number, qi: number, type: QuestionType) => void;
  onAddOption: (si: number, qi: number) => void;
  onUpdateOption: (si: number, qi: number, oi: number, value: string) => void;
  onDeleteOption: (si: number, qi: number, oi: number) => void;
}) {
  const hasOptions = ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(
    question.type
  );

  return (
    <div className="card fade-in hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Question content */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <input
              type="text"
              className="flex-1 font-medium outline-none bg-transparent text-base placeholder-gray-300 border-b border-transparent focus:border-gray-400 duration-200 pb-1"
              value={question.text}
              onChange={(e) =>
                onUpdate(sectionIdx, questionIdx, { text: e.target.value })
              }
              placeholder="Question text"
              disabled={disabled}
            />
            <select
              className="input w-auto text-sm"
              value={question.type}
              onChange={(e) =>
                onChangeType(
                  sectionIdx,
                  questionIdx,
                  e.target.value as QuestionType
                )
              }
              disabled={disabled}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview area for question type */}
          <div className="ml-0 mb-3">
            {question.type === "SHORT_TEXT" && (
              <div className="border-b border-gray-200 pb-1 text-sm text-gray-400 w-2/3">
                Short answer text
              </div>
            )}
            {question.type === "LONG_TEXT" && (
              <div className="border border-gray-200 rounded-lg p-2 text-sm text-gray-400 h-16">
                Long answer text
              </div>
            )}
            {question.type === "DATE" && (
              <div className="border border-gray-200 rounded-lg p-2 text-sm text-gray-400 w-48">
                📅 Month / Day / Year
              </div>
            )}
            {question.type === "NUMBER" && (
              <div className="border-b border-gray-200 pb-1 text-sm text-gray-400 w-32">
                Number
              </div>
            )}
            {question.type === "LINEAR_SCALE" && (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            {/* Options for MC, Checkbox, Dropdown */}
            {hasOptions && (
              <div className="space-y-2">
                {(question.options || []).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="text-muted">
                      {question.type === "CHECKBOX"
                        ? "☐"
                        : question.type === "MULTIPLE_CHOICE"
                        ? "○"
                        : `${oIdx + 1}.`}
                    </span>
                    <input
                      type="text"
                      className="flex-1 text-sm border-none outline-none bg-transparent border-b border-transparent focus:border-b-gray-300 pb-0.5"
                      value={opt}
                      onChange={(e) =>
                        onUpdateOption(
                          sectionIdx,
                          questionIdx,
                          oIdx,
                          e.target.value
                        )
                      }
                      disabled={disabled}
                    />
                    {!disabled && (question.options?.length || 0) > 1 && (
                      <button
                        className="text-muted hover:text-red-500 text-sm"
                        onClick={() =>
                          onDeleteOption(sectionIdx, questionIdx, oIdx)
                        }
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {!disabled && (
                  <button
                    className="text-sm text-primary hover:text-primary-hover font-medium"
                    onClick={() => onAddOption(sectionIdx, questionIdx)}
                  >
                    + Add option
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) =>
                    onUpdate(sectionIdx, questionIdx, {
                      required: e.target.checked,
                    })
                  }
                  disabled={disabled}
                  className="w-4 h-4 rounded"
                />
                Required
              </label>
            </div>
            {!disabled && (
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 border border-gray-400 text-foreground not-disabled:hover:border-gray-500 duration-200 rounded disabled:opacity-30 not-disabled:cursor-pointer"
                  onClick={() => onMoveUp(sectionIdx, questionIdx)}
                  disabled={questionIdx === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="p-1.5 border border-gray-400 text-foreground not-disabled:hover:border-gray-500 duration-200 rounded disabled:opacity-30 not-disabled:cursor-pointer"
                  onClick={() => onMoveDown(sectionIdx, questionIdx)}
                  disabled={questionIdx === totalQuestions - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  className="p-1.5 border border-gray-300 text-red-400 hover:border-red-400 duration-200 rounded cursor-pointer"
                  onClick={() => onDelete(sectionIdx, questionIdx)}
                  title="Delete question"
                >
                  🗑
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
