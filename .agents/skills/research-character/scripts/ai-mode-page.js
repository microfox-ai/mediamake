// research-character, way 2: read Google's AI Mode answer from the open page.
// Paste the whole file into the browser's JavaScript tool on a google.com/search?udm=50&q=… page.
// It waits (up to ~60 s) for the answer to stop growing, then returns JSON:
//   { done, url, markdown, sources: [{ title, url }] }
// Write `markdown` to a file and save it with `rc.py save --how browser --answer <file> --url <url>
// --source "<title>|<url>" …`. Reads the page only: it clicks nothing and sends nothing.
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const root = () => document.querySelector('[data-container-id="main-col"]') || document.querySelector('main') || document.body;
  let last = -1, still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {          // three readings in a row of the same length: finished
    const n = root().innerText.length;
    still = n === last && n > 200 ? still + 1 : 0;
    last = n;
    await sleep(1500);
  }
  const host = root().cloneNode(true);
  host.querySelectorAll('script,style,svg,button,[aria-hidden="true"],[role="button"],[data-ignore-copy]').forEach(e => e.remove());
  const text = el => el.textContent.replace(/\s+/g, ' ').trim();
  const out = [];
  const inline = el => {
    let s = '';
    for (const c of el.childNodes) {
      if (c.nodeType === 3) s += c.textContent;
      else if (c.nodeType === 1) {
        const t = c.tagName;
        if (t === 'BR') s += '\n';
        else if (t === 'STRONG' || t === 'B') { const x = inline(c).trim(); if (x) s += ` **${x}** `; }
        else if (t === 'EM' || t === 'I') { const x = inline(c).trim(); if (x) s += ` *${x}* `; }
        else s += inline(c);
      }
    }
    return s;
  };
  const BLOCKS = 'div,p,ul,ol,li,h1,h2,h3,h4,h5,h6,blockquote,table,[role="heading"]';
  const clean = s => s.replace(/\[Highlight (start|end)\]/g, '').replace(/[ \t]+/g, ' ').replace(/ ([,.;:!?])/g, '$1').trim();
  // Text, links, chips and bold beside each other are one paragraph; only real blocks break it.
  const walk = el => {
    let buf = '';
    const flush = () => { const x = clean(buf); if (x && x.length > 1) out.push(x + '\n'); buf = ''; };
    for (const c of el.childNodes) {
      if (c.nodeType === 3) { buf += c.textContent; continue; }
      if (c.nodeType !== 1) continue;
      const t = c.tagName, role = c.getAttribute('role');
      if (/^H[1-6]$/.test(t) || role === 'heading') { flush(); const x = clean(text(c)); if (x) out.push(`\n#### ${x}\n`); }
      else if (t === 'UL' || t === 'OL') { flush(); for (const li of c.children) { const x = clean(inline(li)); if (x) out.push(`- ${x}`); } out.push(''); }
      else if (t === 'BLOCKQUOTE') { flush(); const x = clean(inline(c)); if (x) out.push('> ' + x + '\n'); }
      else if (t === 'BR') buf += '\n';
      else if (!c.querySelector(BLOCKS) && t !== 'DIV' && t !== 'P') buf += inline(c);
      else if (!c.querySelector(BLOCKS)) { flush(); buf = inline(c); flush(); }
      else { flush(); walk(c); }
    }
    flush();
  };
  walk(host);
  // The answer ends where the page's own furniture starts: the disclaimer, then feedback and policy links.
  let lines = out.join('\n').split('\n');
  const end = lines.findIndex(l => /^AI (can make mistakes|responses may include mistakes)/i.test(l.trim()));
  if (end > 0) lines = lines.slice(0, end);
  // Follow-up chips just above it: short lines with no sentence in them.
  while (lines.length && (!lines[lines.length - 1].trim() || (lines[lines.length - 1].trim().length < 40 && !/[.?!:"”)]$/.test(lines[lines.length - 1].trim()) && !/^[-#>]/.test(lines[lines.length - 1].trim())))) lines.pop();
  const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const seen = new Set(), sources = [];
  const scope = document.querySelectorAll('[data-container-id="main-col"] a[href^="http"], [data-container-id="rhs-col"] a[href^="http"]');
  for (const a of (scope.length ? scope : root().querySelectorAll('a[href^="http"]'))) {
    const u = a.href.split('#:~:text=')[0];
    if (/(^https?:\/\/([^/]*\.)?google\.[a-z.]+\/)|accounts\.google|support\.google|policies\.google/.test(u) || seen.has(u)) continue;
    seen.add(u);
    const title = (a.getAttribute('aria-label') || text(a) || new URL(u).hostname).replace(/\s+/g, ' ').trim().slice(0, 120);
    sources.push({ title, url: u });
  }
  return JSON.stringify({ done: still >= 3, url: location.href.split('&mstk=')[0], markdown, sources });
})();
