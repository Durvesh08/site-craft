import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
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
    console.error("Uncaught error in application:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6 font-sans">
          <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-destructive/20 shadow-xl space-y-6 text-center animate-fade-in">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected runtime error occurred. Please try resetting the view or return to your dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted/50 p-4 rounded-lg border border-border/50 text-left text-xs font-mono overflow-auto max-h-32 text-muted-foreground">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={this.handleReset} className="w-full gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset View
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
