import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled render error:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: "1rem",
            fontFamily: "sans-serif",
            background: "#0f172a",
            color: "#fff",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 900 }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", maxWidth: "24rem" }}>
            حدثت مشكلة أثناء عرض هذه الشاشة. يرجى إعادة تحميل الصفحة — إذا
            تكررت المشكلة تواصل مع الدعم الفني.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "#dc2626",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontWeight: 900,
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
