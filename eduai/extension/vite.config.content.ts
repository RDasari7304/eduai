import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build:{
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        format: 'iife',
        entryFileNames: 'content.js'
      }

    },
        outDir: 'dist',
        emptyOutDir: false 
  }
})
