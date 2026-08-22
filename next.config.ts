import type { NextConfig } from 'next'

/**
 * WashBook is served under a base path, not at the root — see the bootstrap
 * brief §5.1. Two things follow from that and both are easy to get wrong:
 *
 *  1. `output: 'standalone'` is what makes the Docker runner image small; it
 *     emits a self-contained server bundle under `.next/standalone`.
 *  2. Next applies `basePath` to redirect *destinations* as well as sources, so
 *     a redirect from '/' to '/washbook' would become '/washbook' -> '/washbook'
 *     and loop. `basePath: false` on that one entry opts it out.
 */
const nextConfig: NextConfig = {
  basePath: '/washbook',
  output: 'standalone',
  reactStrictMode: true,

  // Fail the production build on a type error rather than shipping one. This is
  // Next's default; stated explicitly so nobody "fixes" a red build by flipping
  // it. (Next 16 removed the `eslint` config key along with `next lint`; lint
  // is a separate CI step — see .github/workflows/ci.yml.)
  typescript: { ignoreBuildErrors: false },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/washbook',
        permanent: false,
        basePath: false,
      },
    ]
  },
}

export default nextConfig
