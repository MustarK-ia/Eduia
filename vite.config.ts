import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Use the provided OpenRouter key if no environment variable is set
  // Updated to new key ending in ...cb0c
  const apiKey = env.API_KEY || "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";

  return {
    plugins: [react()],
    define: {
      // Injects the API key into the client-side code safely
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});