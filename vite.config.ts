import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Use the provided Google API key
  const apiKey = env.API_KEY || "AIzaSyCz_rv25gaz7Yu-zFl8e8Jcq69IWoEUgsE";

  return {
    plugins: [react()],
    define: {
      // Injects the API key into the client-side code safely
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});