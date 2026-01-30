import { config } from '@dotenvx/dotenvx'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/node'
import tanStackRouterVite from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import { sri } from 'vite-plugin-sri3'
import tsconfigPaths from 'vite-tsconfig-paths'
import tsupBuild from './src/lib/vite/plugins/tsup'
import { parseEnv } from './src/server/env'

// validate env vars before starting
config({ quiet: true })
const e = parseEnv(process.env)

export default defineConfig(() => {
  return {
    server: {
      port: e.PORT,
    },
    build: {
      // minify: false,
      outDir: 'dist/public',
      copyPublicDir: true,
    },
    plugins: [
      tsconfigPaths(),
      tanStackRouterVite(),
      viteReact({
        babel: {
          plugins: [['babel-plugin-react-compiler', {}]],
        },
      }),
      createHtmlPlugin({
        minify: true,
        entry: 'src/root.tsx',
        inject: {
          data: {},
        },
      }),
      sri(),
      devServer({
        entry: 'src/server/app.ts',
        adapter,
        env() {
          const result = config({
            quiet: true,
            override: true,
            debug: false,
          })
          if (result.error) {
            throw result.error
          }
          return result.parsed!
        },
        exclude: [
          /^(?!\/(favicon|api)).*/, // exclude all routes that are not /api or favicon
        ],
      }),
      tsupBuild({
        entry: ['src/server/serve-node.ts'],
        minify: false,
        format: 'esm',
        target: 'node16',
        silent: true,
        treeshake: true,
        cjsInterop: true,
        external: ['@prisma/client'],
        env: {
          //@ts-expect-error does actually support boolean
          DEV: false,
          //@ts-expect-error does actually support boolean
          PROD: true,
          //@ts-expect-error does actually support boolean
          SSR: false,
          DATABASE_URL: '',
          NODE_ENV: 'production',
        },
        outDir: 'dist',
        async onSuccess() {
          console.log('Server build complete')
        },
      }),
    ],
  }
})
