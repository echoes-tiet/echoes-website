import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dirs = ['src/content/bulletin', 'src/content/blog', 'src/content/interviews'];

let changedFiles = 0;
let changedLines = 0;

for (const dir of dirs) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const full = join(dir, file);
    const text = readFileSync(full, 'utf-8');

    // Split off frontmatter (--- ... ---) untouched; dedent every line of the body.
    const match = text.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
    if (!match) continue;
    const [, frontmatter, body] = match;

    let fileChanged = false;
    const dedentedBody = body
      .split('\n')
      .map((line) => {
        if (/^\s+\S/.test(line)) {
          fileChanged = true;
          changedLines++;
          return line.replace(/^\s+/, '');
        }
        return line;
      })
      .join('\n');

    if (fileChanged) {
      writeFileSync(full, frontmatter + dedentedBody, 'utf-8');
      changedFiles++;
    }
  }
}

console.log(`Dedented ${changedLines} lines across ${changedFiles} files.`);
