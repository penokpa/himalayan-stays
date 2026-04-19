import { createRoot } from "react-dom/client";
import "./index.css";

// Lazy load App to catch and display any import errors
const root = document.getElementById("root")!;

async function init() {
  try {
    const { default: App } = await import("./App");
    createRoot(root).render(<App />);
  } catch (err) {
    console.error("App failed to load:", err);
    root.innerHTML = `<pre style="color:red;padding:20px;white-space:pre-wrap">${err}\n\n${(err as Error).stack}</pre>`;
  }
}

init();
