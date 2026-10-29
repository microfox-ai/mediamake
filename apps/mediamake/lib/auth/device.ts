/**
 * What a signed-in device looks like on the devices page: the browser and OS
 * from its User-Agent, and a rough location from Vercel's geo headers (absent
 * under `next dev`). Apps that sign in from a server, such as the Claude
 * connector, show their HTTP client and the server's location.
 */
export interface Device {
  /** "Chrome 131", or the HTTP client for server apps ("python-httpx 0.27"). */
  browser?: string;
  os?: string;
  /** "Hyderabad, IN". */
  location?: string;
  userAgent?: string;
}

const BROWSERS: [name: string, pattern: RegExp][] = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/(\d+)/],
  ['Opera', /\b(?:OPR|Opera)\/(\d+)/],
  ['Samsung Internet', /\bSamsungBrowser\/(\d+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /\bVersion\/(\d+)[^ ]* (?:Mobile\/\S+ )?Safari\//],
];

const SYSTEMS: [name: string, pattern: RegExp][] = [
  ['iOS', /\b(?:iPhone|iPad|iPod)\b/],
  ['Android', /\bAndroid\b/],
  ['ChromeOS', /\bCrOS\b/],
  ['Windows', /\bWindows\b/],
  ['macOS', /\bMac OS X\b|\bMacintosh\b/],
  ['Linux', /\bLinux\b/],
];

export function parseUserAgent(ua: string): Pick<Device, 'browser' | 'os'> {
  const os = SYSTEMS.find(([, pattern]) => pattern.test(ua))?.[0];
  for (const [name, pattern] of BROWSERS) {
    const match = ua.match(pattern);
    if (match) return { browser: `${name} ${match[1]}`, os };
  }
  // Not a browser: name the HTTP client from its first product token.
  const product = ua.match(/^([A-Za-z][\w.-]*)(?:\/(\d+(?:\.\d+)?))?/);
  return { browser: product ? [product[1], product[2]].filter(Boolean).join(' ') : undefined, os };
}

function header(headers: Headers, name: string) {
  const value = headers.get(name)?.trim();
  if (!value) return undefined;
  try {
    // Vercel percent-encodes the city.
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function deviceFromHeaders(headers: Headers): Device {
  const userAgent = headers.get('user-agent')?.slice(0, 300) || undefined;
  const city = header(headers, 'x-vercel-ip-city');
  const country = header(headers, 'x-vercel-ip-country');
  const location = [city, country].filter(Boolean).join(', ') || undefined;
  return { ...(userAgent ? parseUserAgent(userAgent) : {}), location, userAgent };
}
