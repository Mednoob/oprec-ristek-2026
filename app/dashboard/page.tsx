"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoading, SkeletonList } from "@/components/loading";
import { toast } from "@/components/toast";

interface Form {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  _count: { submissions: number; sections: number };
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [formsLoading, setFormsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
        setLoading(false);
      });
  }, [router]);

  const fetchForms = useCallback(async () => {
    setFormsLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/forms?${params}`);
      const data = await res.json();
      if (res.ok) {
        setForms(data.forms);
      }
    } catch {
      toast("Failed to load forms", "error");
    } finally {
      setFormsLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user, fetchForms]);

  async function handleCreateForm() {
    setCreating(true);
    try {
      const res = await fetch("/api/forms", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push(`/forms/${data.form.id}/edit`);
      } else {
        toast(data.error || "Failed to create form", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteForm(formId: string, title: string) {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/forms/${formId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Form deleted", "success");
        fetchForms();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to delete form", "error");
      }
    } catch {
      toast("Network error", "error");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) return <PageLoading />;
  if (!user) return null;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "badge badge-draft",
      PUBLISHED: "badge badge-published",
      CLOSED: "badge badge-closed",
    };
    return <span className={map[status] || "badge"}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-semibold text-lg">Formaker</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">{user.name}</span>
            <button onClick={handleLogout} className="btn-outline text-sm">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Title + Create */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Forms</h1>
            <p className="text-sm text-muted mt-1">
              Create, manage, and analyze your forms
            </p>
          </div>
          <button
            onClick={handleCreateForm}
            className="btn-primary flex items-center gap-2"
            disabled={creating}
          >
            {creating ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Creating...
              </>
            ) : (
              <>
                <span className="text-lg leading-none">+</span> New Form
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-muted mb-1">
                Search
              </label>
              <input
                type="text"
                className="input"
                placeholder="Search forms by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Status
              </label>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Sort by
              </label>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="updatedAt">Last modified</option>
                <option value="createdAt">Date created</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Order
              </label>
              <select
                className="input"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form List */}
        {formsLoading ? (
          <SkeletonList count={3} />
        ) : forms.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-semibold text-lg mb-1">No forms yet</h3>
            <p className="text-muted text-sm mb-4">
              {search || statusFilter !== "ALL"
                ? "No forms match your filters"
                : "Create your first form to get started"}
            </p>
            {!search && statusFilter === "ALL" && (
              <button onClick={handleCreateForm} className="btn-primary" disabled={creating}>
                + Create your first form
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => (
              <div
                key={form.id}
                className="card hover:shadow-md transition-shadow fade-in"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{form.title}</h3>
                      {statusBadge(form.status)}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted mb-2 line-clamp-1">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>
                        {form._count.sections} section{form._count.sections !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {form._count.submissions} response{form._count.submissions !== 1 ? "s" : ""}
                      </span>
                      <span>
                        Updated{" "}
                        {new Date(form.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/forms/${form.id}/edit`}
                      className="btn-outline text-sm"
                    >
                      Edit
                    </Link>
                    {form._count.submissions > 0 && (
                      <>
                        <Link
                          href={`/forms/${form.id}/submissions`}
                          className="btn-outline text-sm"
                        >
                          Responses
                        </Link>
                        <Link
                          href={`/forms/${form.id}/analytics`}
                          className="btn-outline text-sm"
                        >
                          Analytics
                        </Link>
                      </>
                    )}
                    {form.status === "PUBLISHED" && (
                      <button
                        className="btn-outline text-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/forms/${form.id}/respond`
                          );
                          toast("Share link copied!", "success");
                        }}
                      >
                        Share
                      </button>
                    )}
                    <button
                      className="btn-danger text-sm"
                      onClick={() => handleDeleteForm(form.id, form.title)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
