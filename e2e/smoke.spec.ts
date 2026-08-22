import { expect, test } from '@playwright/test'

/**
 * S0-14 — verify the base path in a real browser, not by reading the config.
 *
 * The bootstrap brief §5.1 is explicit about this because `basePath` is quietly
 * easy to half-configure: the page renders, but the stylesheet, the service
 * worker or the manifest 404s under the prefix and nobody notices until a
 * supervisor's screen is unstyled at a gate.
 */

test.describe('base path and app shell', () => {
  test('the root path redirects to /washbook rather than 404ing', async ({
    page,
  }) => {
    // Deliberately requests the server root, not the baseURL.
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    expect(response?.status()).toBeLessThan(400)
    expect(new URL(page.url()).pathname).toBe('/washbook')
  })

  test('the app shell renders under the base path', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'WashBook' })).toBeVisible()
  })

  test('the stylesheet resolves under the base path', async ({ page }) => {
    await page.goto('/')

    // If Tailwind's stylesheet 404s, this heading falls back to the UA default
    // (~32px at h1) with a normal weight. Asserting a computed style is the
    // cheapest way to catch an asset path that silently failed.
    const heading = page.getByRole('heading', { name: 'WashBook' })
    const fontWeight = await heading.evaluate(
      (el) => getComputedStyle(el).fontWeight,
    )
    expect(Number(fontWeight)).toBeGreaterThanOrEqual(600)
  })

  test('no request 404s while loading the shell', async ({ page }) => {
    const notFound: string[] = []
    page.on('response', (response) => {
      if (response.status() === 404) notFound.push(response.url())
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    expect(notFound).toEqual([])
  })

  test('interactive controls meet the 44px minimum touch target', async ({
    page,
  }) => {
    // NFR-12. Asserted from Slice 0 so it never becomes a retrofit.
    await page.goto('/')
    const link = page.getByRole('link', { name: /service health/i })
    const box = await link.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  })
})

test.describe('health route', () => {
  test('reports service status, build SHA and database connectivity', async ({
    request,
  }) => {
    // Relative, so it resolves under the base path in baseURL. An absolute
    // '/api/health' would bypass /washbook entirely and 404.
    const response = await request.get('api/health')

    // 503 is correct and expected when the database is down — the route is what
    // Docker's HEALTHCHECK probes, so a degraded database must not read as ok.
    expect([200, 503]).toContain(response.status())

    const body: unknown = await response.json()
    expect(body).toMatchObject({
      service: 'washbook',
      status: expect.stringMatching(/^(ok|degraded)$/),
      buildSha: expect.any(String),
      database: { reachable: expect.any(Boolean) },
    })
  })
})
