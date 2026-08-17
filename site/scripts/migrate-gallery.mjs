import { loadHtml, copyAsset } from './lib.mjs';

const $ = loadHtml('gallery.html');
const paths = $('.gallery__image')
  .toArray()
  .map((img) => copyAsset($(img).attr('src'), 'gallery'))
  .filter(Boolean);

console.log(JSON.stringify(paths, null, 2));
