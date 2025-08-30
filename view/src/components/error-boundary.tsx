import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onError: (error: Error) => void;
  fallback?: React.ReactNode;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  override state = {
    hasError: false,
  };

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Error</div>;
    }

    return this.props.children;
  }

  override componentDidCatch(error: Error) {
    this.props.onError(error);
    this.setState({ hasError: true });
  }
}
