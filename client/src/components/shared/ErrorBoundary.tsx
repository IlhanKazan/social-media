import * as Sentry from '@sentry/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Class component: can't use the useTranslation hook, so read the i18next
// singleton directly. Reactive to changeLanguage() the same as the hook.
import i18n from '@/i18n';

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
    // The boundary stops the error propagating, so without this the crash that
    // replaced the whole UI would be the one thing never reported.
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });
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
              <h1 className="text-2xl font-bold tracking-tight">{i18n.t('common.errorBoundary.title')}</h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                {i18n.t('common.errorBoundary.description')}
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
              {i18n.t('common.errorBoundary.reload')}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
