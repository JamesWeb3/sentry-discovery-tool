import Link from "next/link";
import Image from "next/image";

const STEPS = [
  {
    n: "01",
    title: "Tell us your stack",
    body: "Microsoft or Google? Then tick the tools your team actually uses.",
  },
  {
    n: "02",
    title: "Map your teams",
    body: "Add your departments and mark which tools each one relies on.",
  },
  {
    n: "03",
    title: "See your graph",
    body: "An interactive knowledge graph of your business, plus an instant audit of where context is scattered.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        {/* Nav */}
        <header className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/sentry-logo.png" alt="Sentry AI" width={30} height={30} className="rounded-md" />
            <span className="font-semibold tracking-tight">Sentry AI</span>
          </div>
          <Link
            href="/audit"
            className="text-sm text-white/70 hover:text-white border border-white/15 rounded-lg px-3.5 py-1.5"
          >
            Start audit
          </Link>
        </header>

        {/* Hero */}
        <section className="py-20 md:py-32 flex flex-col items-center text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-white/45 mb-5">
            Free knowledge graph audit
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold max-w-3xl leading-[1.05]">
            See where your business context actually lives
          </h1>
          <p className="text-white/55 mt-6 max-w-xl text-lg">
            Answer a few questions about your tools and teams. We turn them into an
            interactive knowledge graph, and show you where your context is
            scattered, siloed, and ready to connect.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/audit"
              className="px-7 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
            >
              Map my business, it&apos;s free
            </Link>
            <Link
              href="/audit?example=1"
              className="px-7 py-3.5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
            >
              Create example knowledge graph
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-3">Takes about 2 minutes · No signup</p>
        </section>

        {/* How it works */}
        <section className="pb-28">
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="text-white/40 font-mono text-sm">{s.n}</div>
                <div className="text-lg font-semibold text-white mt-2">{s.title}</div>
                <p className="text-white/50 text-sm mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-10 text-xs text-white/30">
          A free tool by Sentry AI. Your answers stay in your browser.
        </footer>
      </div>
    </main>
  );
}
