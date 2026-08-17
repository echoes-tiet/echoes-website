import { loadHtml, writeContentFile, copyAsset, slugify } from './lib.mjs';

const $ = loadHtml('team.html');

const SECTION_MAP = {
  FACULTY: 'Faculty',
  'EXECUTIVE BOARD': 'Executive Board',
  CORE: 'Core',
};

let currentSection;
let order = 0;
let count = 0;
const usedSlugs = new Set();

$('.team_echoes')
  .find('h2, .team-card')
  .each((_, el) => {
    const $el = $(el);
    if (el.tagName === 'h2') {
      const text = $el.text().trim().toUpperCase();
      if (SECTION_MAP[text]) currentSection = SECTION_MAP[text];
      return;
    }

    // .team-card
    const name = $el.find('h1.fullname').first().text().trim();
    if (!name || !currentSection) return;

    const role = $el.find('p.job').first().text().trim() || undefined;
    const bio = $el.find('p.about-me').first().text().trim() || '';
    const photoSrc = $el.find('img.profile-image').first().attr('src');
    const photo = copyAsset(photoSrc, 'members');

    const socials = $el
      .find('ul.social-icons a[href]')
      .toArray()
      .map((a) => {
        const $a = $(a);
        const href = $a.attr('href');
        const iconClass = $a.find('i').attr('class') || '';
        const platform = iconClass.includes('instagram')
          ? 'instagram'
          : iconClass.includes('linkedin')
            ? 'linkedin'
            : iconClass.includes('facebook')
              ? 'facebook'
              : 'link';
        return { platform, url: href };
      });

    order++;
    let slug = slugify(name) || `member-${order}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${order}`;
    usedSlugs.add(slug);

    writeContentFile(
      'members',
      slug,
      { name, role, section: currentSection, photo, socials: socials.length ? socials : undefined, order },
      bio
    );
    count++;
  });

console.log(`Migrated ${count} team members.`);
