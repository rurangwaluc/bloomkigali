type ComingSoonPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
};

export function ComingSoonPage({ title, description, nextStep }: ComingSoonPageProps) {
  return (
    <section className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="max-w-2xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)] dark:text-[var(--primary)]">
          Coming next
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-6 border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-black text-slate-800 dark:text-slate-200">
            Next work
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            {nextStep}
          </p>
        </div>
      </div>
    </section>
  );
}
