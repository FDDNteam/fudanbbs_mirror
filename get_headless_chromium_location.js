const os = require('os')
const path = require('path')
const util = require('util')

function currentPlatform() {
  const platform = os.platform()
  if (platform === 'darwin')
    return 'mac'
  if (platform === 'linux')
    return 'linux'
  if (platform === 'win32')
    return os.arch() === 'x64' ? 'win64' : 'win32'
  return ''
}
function getFolderPath(platform, revision) {
  return path.join('/path/to/node_modules/puppeteer/.local-chromium', platform + '-' + revision);
}

const revision = '515411'  // from puppeteer/package.json
const downloadURLs = {
  linux: '%s/chromium-browser-snapshots/Linux_x64/%d/chrome-linux.zip',
  mac: '%s/chromium-browser-snapshots/Mac/%d/chrome-mac.zip',
  win32: '%s/chromium-browser-snapshots/Win/%d/chrome-win32.zip',
  win64: '%s/chromium-browser-snapshots/Win_x64/%d/chrome-win32.zip',
}

let platform = currentPlatform()
let url = downloadURLs[platform]
console.assert(url, `Unsupported platform: ${platform}`)
url = util.format(url, 'https://storage.googleapis.com', revision)

let folderPath = getFolderPath(platform, revision)

console.log(`url: ${url}`)
console.log(`extract to folder: ${folderPath}`)