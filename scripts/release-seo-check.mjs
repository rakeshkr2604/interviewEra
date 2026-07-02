const base = process.env.BASE_URL ?? 'http://localhost:3000';
const pages = ['/', '/teams', '/college', '/campus', '/pricing'];

for (const path of pages) {
  const res = await fetch(`${base}${path}`);
  const html = await res.text();
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1];
  const ldCount = (html.match(/application\/ld\+json/g) ?? []).length;
  const robots = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/)?.[1];
  console.log(`${path}\tstatus=${res.status}\tcanonical=${canonical ?? 'MISSING'}\tjsonld=${ldCount}\trobots=${robots ?? 'default'}`);
}

const sm = await fetch(`${base}/sitemap.xml`);
const smText = await sm.text();
for (const path of pages.filter((p) => p !== '/')) {
  console.log(`sitemap${path}\t${smText.includes(`<loc>${base}${path}</loc>`) || smText.includes(path) ? 'present' : 'MISSING'}`);
}

const robotsTxt = await fetch(`${base}/robots.txt`);
console.log(`robots.txt\tstatus=${robotsTxt.status}`);
