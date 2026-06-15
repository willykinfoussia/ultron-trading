import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  key?: string;
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

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "var(--sp-4)",
            textAlign: "center",
            color: "var(--danger)",
          }}
        >
          <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--sp-2)" }}>
            ⚠️ Something went wrong
          </p>
          <pre
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-2)",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error}
          </pre>
          <button
            className="btn-ghost"
            onClick={() => this.setState({ hasError: false, error: "" })}
            style={{ marginTop: "var(--sp-3)" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
