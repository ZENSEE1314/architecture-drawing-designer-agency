export function sanitizeSvg(raw: string): string {
  if (!raw) return fallbackSvg("No diagram");
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return fallbackSvg("Invalid SVG");
  return match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "");
}

export function fallbackSvg(label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="${label}">
    <rect width="400" height="240" fill="#fafaf7" stroke="#e5e4dc"/>
    <text x="200" y="125" font-family="Inter, sans-serif" font-size="14" fill="#888" text-anchor="middle">${label}</text>
  </svg>`;
}
