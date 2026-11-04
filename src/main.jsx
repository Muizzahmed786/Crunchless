import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;


class StartupBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error) { console.error("Crunchless could not render:", error); }

  render() {
    if (this.state.error) {
      return (
        <main>
          <h1>Crunchless could not start</h1>
          <pre>{this.state.error.message}</pre>
          <button onClick={() => location.reload()}>
            Reload page
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function Root() {
  if (!PUBLISHABLE_KEY) {
    return (
      <main style={{ maxWidth: 540, margin: "14vh auto", padding: 28, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ color: "#d93025" }}>Missing Clerk Configuration</h1>
        <p>Please define <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your <code>.env</code> file to enable authentication.</p>
        <button onClick={() => location.reload()}>Reload Page</button>
      </main>
    );
  }
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <StartupBoundary>
        <App />
      </StartupBoundary>
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
