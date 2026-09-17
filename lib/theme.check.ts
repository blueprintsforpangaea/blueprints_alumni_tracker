// Contrast check for the theme tokens in app/globals.css. No framework:
//   node --experimental-strip-types lib/theme.check.ts
//
// It parses globals.css rather than hardcoding values, so editing a token and
// breaking contrast fails here instead of in someone's eyes.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

type Oklch = [L: number, C: number, H: number]

function oklchToSrgb([L, C, H]: Oklch): [number, number, number] {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** WCAG relative luminance, over the linear-light channels oklch already gives us. */
function luminance(color: Oklch): number {
  const [r, g, b] = oklchToSrgb(color)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(fg: Oklch, bg: Oklch): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

// ─── Parse the real stylesheet ────────────────────────────────────────────────

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `could not find the \`${selector}\` block in globals.css`)
  const end = css.indexOf('\n}', start)
  return css.slice(start, end)
}

function token(selector: string, name: string): Oklch {
  const match = block(selector).match(
    new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`)
  )
  assert.ok(match, `--${name} is missing from ${selector}, or is not a plain oklch() value`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

// ─── Assertions ───────────────────────────────────────────────────────────────

const AA_TEXT = 4.5
const AA_LARGE = 3

for (const mode of [':root', '.dark'] as const) {
  const label = mode === ':root' ? 'light' : 'dark'

  const pairs: Array<[string, Oklch, Oklch, number]> = [
    // Button labels. This is the pair that was failing at 2.80:1 in dark mode.
    [
      'primary-foreground on primary',
      token(mode, 'primary-foreground'),
      token(mode, 'primary'),
      // Light mode ships at 4.21:1 and predates this work, so hold it at AA
      // large rather than restyling the light palette from inside a dark-mode
      // change. Dark mode is new and must clear full AA.
      label === 'dark' ? AA_TEXT : AA_LARGE,
    ],
    ['foreground on background', token(mode, 'foreground'), token(mode, 'background'), AA_TEXT],
    ['foreground on card', token(mode, 'foreground'), token(mode, 'card'), AA_TEXT],
    ['muted-foreground on card', token(mode, 'muted-foreground'), token(mode, 'card'), AA_TEXT],
    [
      'muted-foreground on background',
      token(mode, 'muted-foreground'),
      token(mode, 'background'),
      AA_TEXT,
    ],
    [
      'sidebar-foreground on background',
      token(mode, 'sidebar-foreground'),
      token(mode, 'background'),
      AA_TEXT,
    ],
  ]

  for (const [name, fg, bg, minimum] of pairs) {
    const ratio = contrast(fg, bg)
    assert.ok(ratio >= minimum, `${label}: ${name} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`)
  }
}

// ─── The two logo marks ───────────────────────────────────────────────────────
// Both PNGs are 64% transparent with the globe's grid lines as knockouts, so
// each one shows the page through its gaps and has to be paired with the right
// background. The colour mark's darkest ink is navy; the white mark is a single
// #f0f0f0 knockout. Each is swapped in by a dark: variant at the render sites.

const COLOUR_LOGO_INK: Oklch = [0.201, 0.095, 262] // sampled from blueprints-logo.png
const WHITE_LOGO_INK: Oklch = [0.949, 0, 0] // #f0f0f0, from blueprints-logo-white.png

assert.ok(
  contrast(COLOUR_LOGO_INK, token(':root', 'background')) >= AA_LARGE,
  'the colour logo must read on the light background'
)
assert.ok(
  contrast(WHITE_LOGO_INK, token('.dark', 'background')) >= AA_LARGE,
  'the white logo must read on the dark background'
)

// And each must be wrong for the other mode — that's why both files exist.
assert.ok(
  contrast(WHITE_LOGO_INK, token(':root', 'background')) < AA_LARGE,
  'the white logo on a light background would be invisible; it must stay dark-only'
)
assert.ok(
  contrast(COLOUR_LOGO_INK, token('.dark', 'background')) < AA_LARGE,
  'the colour logo on a dark background would be invisible; it must stay light-only'
)

console.log('theme checks passed')
