import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UNIMART ErrorBoundary caught:', error, info);
  }

  handleResetAndReload = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('unimart_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F3] text-[#0F294A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-display font-bold text-xl text-[#0F294A]">
              Something went wrong in UNIMART
            </h1>
            <p className="text-xs text-[#5C6F85] leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="h-10 px-5 rounded-xl bg-[#0F294A] hover:bg-[#1A3A63] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Cached Data & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
