import vinext from "vinext";
import { defineConfig } from "vite";

// This project intentionally runs as a normal local vinext app. GPT Sites
// hosting is not configured or loaded here.
export default defineConfig({
  plugins: [vinext()],
});
