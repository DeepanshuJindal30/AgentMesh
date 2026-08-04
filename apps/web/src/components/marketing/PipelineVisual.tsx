export function PipelineVisual() {
  const stages = [
    { label: "API", sub: "REST + SSE" },
    { label: "Queue", sub: "RabbitMQ" },
    { label: "Worker", sub: "Celery" },
    { label: "Runtime", sub: "gRPC stream" },
    { label: "Live UI", sub: "Events" },
  ];

  return (
    <div className="relative w-full overflow-hidden border-y border-slate-200/80 bg-[#0b1628] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(20,184,166,0.25), transparent 40%), radial-gradient(circle at 80% 60%, rgba(56,189,248,0.18), transparent 45%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/80">
          Execution plane
        </p>
        <h2 className="font-display mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          From submit to live stream in one durable path
        </h2>
        <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
          {stages.map((stage, i) => (
            <div key={stage.label} className="relative flex flex-1 flex-col md:items-center">
              <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-5 backdrop-blur-sm md:mx-2">
                <p className="font-display text-lg font-bold">{stage.label}</p>
                <p className="mt-1 text-sm text-slate-400">{stage.sub}</p>
              </div>
              {i < stages.length - 1 ? (
                <div
                  className="absolute right-0 top-1/2 hidden h-px w-4 -translate-y-1/2 translate-x-1/2 bg-teal-400/60 md:block"
                  style={{ animation: "am-pulse-line 1.8s ease-in-out infinite" }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="am-code-shimmer mt-10 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-5 font-mono text-[13px] leading-6 text-slate-300">
          <p className="text-teal-300">POST /api/v1/executions</p>
          <p className="text-slate-500">→ QUEUED · claim · gRPC RunExecution stream</p>
          <p className="text-slate-500">→ persist events · Redis Pub/Sub · SSE fan-out</p>
          <p className="text-emerald-300">← SUCCEEDED · ticket similarity + root cause</p>
        </div>
      </div>
    </div>
  );
}
