import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/assistant";
  };

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      setTimeout(() => {
        window.location.href = "/assistant";
      }, 3000);
    }
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Terjadi kesalahan yang tidak terduga.";
      
      try {
        // Check if it's a Firestore error JSON
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `Firestore Error: ${parsed.error}`;
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border-2 border-black p-10 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <AlertTriangle className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Anomali Sistem</h1>
            <p className="text-neutral-500 mb-8 font-medium">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-4">
              <Button onClick={() => window.location.href = "/assistant"} className="btn-accent h-14 uppercase font-black text-sm tracking-widest shadow-lg">
                Ke Halaman AI Estimator
              </Button>
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest animate-pulse font-bold">
                Mengalihkan otomatis ke AI Estimator Page...
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
