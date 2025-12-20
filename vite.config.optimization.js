// Vite Optimization Configuration
// Advanced asset optimization for production builds

import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    glsl({
      compress: true,
      watch: true,
      root: '/public/shaders',
    }),
  ],
  
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          if (/glsl|frag|vert/i.test(ext)) {
            return `assets/shaders/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    cssCodeSplit: true,
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    
    assetsInlineLimit: 4096, // 4kb - inline small assets as base64
  },
  
  optimizeDeps: {
    include: ['three'],
    esbuildOptions: {
      target: 'es2015',
      supported: {
        'top-level-await': false,
      },
    },
  },
  
  server: {
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
});
