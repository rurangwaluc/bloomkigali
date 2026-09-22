export default function OwnerLoading() {
  return (
    <section className="space-y-4">
      <div className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="h-5 w-44 animate-pulse bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="h-28 animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-28 animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-28 animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-28 animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </section>

      <div className="h-64 animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    </section>
  );
}
