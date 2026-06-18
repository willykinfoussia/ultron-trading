import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  key?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.key !== this.props.key && this.state.hasError) {
      this.setState({ hasError: false, error: "" });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: "" });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          className="error-boundary"
        >
          <span className="error-boundary-icon" aria-hidden="true">⚠️</span>
          <p className="error-boundary-title">Something went wrong</p>
          <pre className="error-boundary-message">
            {this.state.error}
          </pre>
          <button
            className="btn-ghost"
            onClick={this.handleRetry}
          >
            Try again
          </button>
        </motion.div>
      );
    }
    return this.props.children;
  }
}
