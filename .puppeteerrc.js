// .puppeteerrc.js
const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // ブラウザのダウンロード先をプロジェクトルートの`.puppeteer-cache`に指定
  cacheDirectory: join(__dirname, '.puppeteer-cache'),
};

