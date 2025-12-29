import { defineConfig } from 'astro/config'

import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
    server: {
        port: 3000,
        allowedHosts: ['dev.test'],
    },
    output: 'static',

    adapter: vercel({
        webAnalytics: { enabled: true },
    }),

    vite: {
        plugins: [tailwindcss()],
    },

    integrations: [react()],
})
