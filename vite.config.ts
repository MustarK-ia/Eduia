import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Use the provided OpenRouter key if no environment variable is set
  // This ensures it works on Vercel even if env vars aren't configured in the dashboard
  const apiKey = env.API_KEY || "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";

  return {
    plugins: [react()],
    define: {
      // Injects the API key into the client-side code safely
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});