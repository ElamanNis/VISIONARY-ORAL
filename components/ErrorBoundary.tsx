import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Rendering error' };
  }

  componentDidCatch(error: any, info: any) {
    console.error('UI ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white max-w-lg w-full p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
            <h2 className="text-xl font-black text-slate-900 mb-2">Что-то пошло не так</h2>
            <p className="text-slate-500 text-sm mb-6">Мы уже записали ошибку в консоль. Обновите страницу или попробуйте снова.</p>
            {this.state.message && <pre className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-auto">{this.state.message}</pre>}
            <button
              className="mt-6 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700"
              onClick={() => { this.setState({ hasError: false, message: undefined }); location.reload(); }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
