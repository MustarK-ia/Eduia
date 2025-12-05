import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Use the provided OpenRouter key if no environment variable is set
  // Updated to new key ending in ...64b7
  const apiKey = env.API_KEY || "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";

  return {
    plugins: [react()],
    define: {
      // Injects the API key into the client-side code safely
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});