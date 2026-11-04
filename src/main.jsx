import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable key in .env");
}

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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <StartupBoundary>
        <App />
      </StartupBoundary>
    </ClerkProvider>
  </React.StrictMode>
);
