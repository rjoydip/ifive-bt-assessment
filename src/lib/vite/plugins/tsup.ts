import { build, Options } from 'tsup'
import type { Plugin } from 'vite'

export const tsupBuild = (options: Options): Plugin => {
  return {
    name: 'vite-plugin-tsup',
    apply: 'build',
    async configResolved() {
      await build(options)
    },
  }
}

export default tsupBuild
