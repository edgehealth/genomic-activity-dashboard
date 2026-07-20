import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base must match the GitHub Pages project path so built asset URLs resolve
// under https://edgehealth.github.io/genomic-activity-dashboard/.
export default defineConfig({
  base: '/genomic-activity-dashboard/',
  plugins: [react()],
})
