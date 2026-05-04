import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
          <div className="flex flex-col items-center text-center max-w-md space-y-5">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Beklenmedik bir hata oluştu</h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                Uygulama çalışırken bir sorunla karşılaştık. Endişelenme, bu durumu kaydettik. Lütfen sayfayı yenilemeyi dene.
              </p>
            </div>
            {this.state.error && (
              <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-full overflow-auto text-left border border-zinc-200 dark:border-zinc-800">
                <code className="text-xs text-destructive break-words font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button onClick={this.handleReset} className="gap-2 rounded-full px-6 mt-4">
              <RefreshCw className="h-4 w-4" />
              Sayfayı Yenile
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
