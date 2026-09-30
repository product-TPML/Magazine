// Outline icon set on a 24px grid; geometry follows Lucide (ISC licence).
export function icon(name) {
  const paths = {
    bookmark: '<path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1Z" />',
    play: '<path d="M7 4.5v15l12.5-7.5Z" />',
    pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1" /><rect x="14" y="5" width="3.5" height="14" rx="1" />',
    back: '<path d="m15 5-7 7 7 7M8 12h12" />',
    forward: '<path d="m9 5 7 7-7 7" />',
    share: '<circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />',
    home: '<path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 9v10.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9" /><path d="M10 20.5V15h4v5.5" />',
    search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />',
    profile: '<circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />',
    saved: '<path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1Z" />',
    faq: '<circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />',
    sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />',
    globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />',
    contents: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />',
    pages: '<rect x="4" y="4" width="6.5" height="7" rx="1.2" /><rect x="13.5" y="4" width="6.5" height="7" rx="1.2" /><rect x="4" y="13" width="6.5" height="7" rx="1.2" /><rect x="13.5" y="13" width="6.5" height="7" rx="1.2" />',
    swipe: '<rect x="8" y="4.5" width="8" height="15" rx="1.5" /><path d="M4.5 9.5 2 12l2.5 2.5M19.5 9.5 22 12l-2.5 2.5" />',
    vertical: '<rect x="8" y="6.5" width="8" height="11" rx="1.5" /><path d="M9.5 4 12 1.8 14.5 4M9.5 20 12 22.2 14.5 20" />',
    read: '<path d="M2.5 4.5h6a3.5 3.5 0 0 1 3.5 3.5v12a2.5 2.5 0 0 0-2.5-2.5h-7Z" /><path d="M21.5 4.5h-6A3.5 3.5 0 0 0 12 8v12a2.5 2.5 0 0 1 2.5-2.5h7Z" />',
    listen: '<path d="M3.5 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-7a8.5 8.5 0 0 1 17 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />',
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16" />'
  };
  return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">' + (paths[name] || '') + '</svg>';
}
