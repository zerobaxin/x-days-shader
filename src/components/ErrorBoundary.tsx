import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from './ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="overflow-hidden">
          <div className="aspect-video relative overflow-hidden bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-sm">Something went wrong</div>
              <div className="text-xs mt-1 opacity-75">
                {this.state.error?.message || 'Unknown error'}
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Error</h3>
            <p className="text-muted-foreground text-sm">
              Failed to render shader preview
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
