import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',
    define: {
      // Expose app name to frontend via import.meta.env
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'Zarona Unisex'),
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          shop: resolve(__dirname, 'shop.html'),
          login: resolve(__dirname, 'login.html'),
          signup: resolve(__dirname, 'signup.html'),
        },
      },
    },
  };
});
