import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Use the provided OpenRouter key if no environment variable is set
  // Switching back to the '94b3' key as 'f769' is confirmed invalid (User not found)
  const apiKey = env.API_KEY || "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";

  return {
    plugins: [react()],
    define: {
      // Injects the API key into the client-side code safely
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});