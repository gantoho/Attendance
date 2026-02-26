import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HeroUIProvider, Alert } from "@heroui/react";
import App from "./App";
import "./App.css";
import { useUIStore } from "./store/uiStore";
import { startSafeAreaWatcher } from "./utils/safeArea";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || String(error) };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <Alert color="danger" radius="lg">
            应用发生错误：{this.state.message || '未知错误'}
          </Alert>
        </div>
      );
    }
    return this.props.children as any;
  }
}

function ThemedApp() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('theme-dark', 'dark');
    } else {
      root.classList.remove('theme-dark', 'dark');
    }
  }, [theme]);
  useEffect(() => {
    startSafeAreaWatcher();
  }, []);
  return (
    <HeroUIProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </HeroUIProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
