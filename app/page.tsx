import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <span className="font-semibold text-lg">Formaker</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-outline">
            Log in
          </Link>
          <Link href="/register" className="btn-primary">
            Sign up free
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Build forms that{" "}
            <span className="text-primary">people love</span> to fill
          </h1>
          <p className="text-lg text-muted mb-8 max-w-lg mx-auto">
            Create beautiful, multi-page forms with various question types.
            Collect responses and analyze them with built-in charts.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-6 py-3">
              Get started — it&apos;s free
            </Link>
            <Link href="/login" className="btn-outline text-base px-6 py-3">
              Log in
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="card">
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-semibold mb-1">Multiple Question Types</h3>
              <p className="text-sm text-muted">
                Short text, multiple choice, checkboxes, dropdowns, dates, numbers, and more.
              </p>
            </div>
            <div className="card">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold mb-1">Response Analytics</h3>
              <p className="text-sm text-muted">
                Visualize responses with pie charts, bar graphs, and summary statistics.
              </p>
            </div>
            <div className="card">
              <div className="text-2xl mb-2">📄</div>
              <h3 className="font-semibold mb-1">Multi-Page Forms</h3>
              <p className="text-sm text-muted">
                Organize questions into sections with page navigation and auto-save.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
