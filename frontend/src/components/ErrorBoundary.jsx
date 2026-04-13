export default function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    setError(error);
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  if (hasError) {
    return (
      <div style={{
        padding: 40,
        textAlign: "center",
        color: "#ff6b6b",
        fontFamily: "system-ui, sans-serif"
      }}>
        <h2>Something went wrong</h2>
        <p style={{ color: "#888", marginTop: 8 }}>
          {error?.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            background: "#4d9fff",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return children;
}
