import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class StartupBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error) { console.error("Crunchless could not render:", error); }

  render() {
    if (this.state.error) {
      return <main style={{ maxWidth: 640, margin: "12vh auto", padding: 28, fontFamily: "system-ui, sans-serif", color: "#1d1d1f" }}>
        <p style={{ color: "#b4232d", fontWeight: 700 }}>Crunchless could not start</p>
        <h1 style={{ fontSize: 26 }}>The page hit a startup error.</h1>
        <p style={{ lineHeight: 1.6 }}>Your saved workspace is kept in this browser. You can reload to try again, or clear Crunchless workspace data if it is damaged.</p>
        <pre style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap", padding: 14, borderRadius: 12, background: "#f0f1f4", fontSize: 12 }}>{this.state.error.message}</pre>
        <button style={{ marginRight: 10, padding: "10px 14px" }} onClick={() => location.reload()}>Reload page</button>
        <button style={{ padding: "10px 14px" }} onClick={() => { localStorage.removeItem("crunchless-project-v24"); location.reload(); }}>Clear local workspace</button>
      </main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StartupBoundary><App /></StartupBoundary>
  </React.StrictMode>,
);
