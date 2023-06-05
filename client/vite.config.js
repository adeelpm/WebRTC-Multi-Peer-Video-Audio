import { defineConfig } from 'vite'

export default defineConfig({
    publicDir:false,
    build: {
        assetsInclude: './*.svg',
        rollupOptions: {
          output: {
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name].[ext]`
          }
        }
      }
  // ...
})