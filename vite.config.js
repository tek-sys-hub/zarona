import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',
    define: {
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'Zarona Unisex'),
    },
    build: {
      rollupOptions: {
        input: {
          // Storefront
          main:    resolve(__dirname, 'index.html'),
          shop:    resolve(__dirname, 'shop.html'),
          login:   resolve(__dirname, 'login.html'),
          signup:  resolve(__dirname, 'signup.html'),
          // Admin Panel
          adminLogin:     resolve(__dirname, 'admin/login.html'),
          adminIndex:     resolve(__dirname, 'admin/index.html'),
          adminProducts:  resolve(__dirname, 'admin/products.html'),
          adminOrders:    resolve(__dirname, 'admin/orders.html'),
          adminCustomers: resolve(__dirname, 'admin/customers.html'),
        },
      },
    },
  };
});
