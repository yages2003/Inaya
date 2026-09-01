import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Also log to console for debugging
    console.error("Inaya render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 32,
            fontFamily: "system-ui, sans-serif",
            maxWidth: 720,
            margin: "40px auto",
          }}
        >
          <h2 style={{ color: "#c92a2a" }}>Something went wrong</h2>
          <p>The page hit an error while rendering. Details below:</p>
          <pre
            style={{
              background: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: 8,
              padding: 16,
              overflow: "auto",
              fontSize: 13,
              color: "#495057",
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/";
            }}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: "#4c6ef5",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}