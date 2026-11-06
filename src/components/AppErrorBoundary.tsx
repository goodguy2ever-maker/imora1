import { Component, type ReactNode } from 'react';
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen grid place-items-center bg-slate-950 p-6 text-slate-100">
      <section role="alert" className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8">
        <h1 className="text-2xl font-semibold">Не удалось открыть страницу</h1>
        <p className="mt-4 text-sm text-slate-300">Попробуйте обновить страницу. Если вы заполняли форму, проверьте сохранённые данные перед повторной отправкой.</p>
        <button className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-black" onClick={() => window.location.reload()}>Обновить страницу</button>
        <a className="ml-4 text-sm underline" href="/">На главную</a>
      </section>
    </main>;
  }
}
