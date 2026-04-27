/**
 * Renders public/icon.svg → build/icon.png + build/icon.ico + build/icon.icns
 * Also copies icon.png into dist/ so the Electron runtime can reference it.
 */
import sharp from 'sharp'
import png2icons from 'png2icons'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs'

mkdirSync('build', { recursive: true })
mkdirSync('dist', { recursive: true })

// Render SVG → 512×512 PNG (electron-builder recommends 512+ for macOS)
const pngBuffer = await sharp('public/icon.svg')
  .resize(512, 512)
  .png()
  .toBuffer()

writeFileSync('build/icon.png', pngBuffer)
console.log('✓ build/icon.png  (512×512)')

// Windows .exe icon
const ico = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, true, true)
writeFileSync('build/icon.ico', ico)
console.log('✓ build/icon.ico')

// macOS .icns
const icns = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0)
writeFileSync('build/icon.icns', icns)
console.log('✓ build/icon.icns')

// Runtime copy for BrowserWindow.icon (lives alongside other dist assets)
copyFileSync('build/icon.png', 'dist/icon.png')
console.log('✓ dist/icon.png   (runtime copy)')
