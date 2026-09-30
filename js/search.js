import { $, state } from './core.js';
import { t } from './i18n.js';
import { articleIds, needsPreview } from './issue.js';
import { articleRow } from './panels.js';

export function searchMarkup() {
  return '<form class="search-form" id="search-form"><input id="search-input" type="search" placeholder="' + t('searchThisIssue') + '" aria-label="' + t('searchThisIssue') + '"><button type="submit">' + t('search') + '</button></form><div id="search-results"></div>';
}

function searchExcerpt(article, query) {
  // ponytail: never leak paid body text to free readers via search snippets
  if (needsPreview(article)) {
    const haystack = (article.title || '');
    const index = haystack.toLowerCase().indexOf(query.toLowerCase());
    if (index >= 0) return '…' + haystack.slice(Math.max(0, index - 45), index + query.length + 75) + '…';
    return t('premiumSearchNote');
  }
  const text = article.plainText || article.title || '';
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  return index < 0 ? text.slice(0, 120) : '…' + text.slice(Math.max(0, index - 45), index + query.length + 75) + '…';
}

// Lowercased search text per article, cached until the article's access state or loaded text changes.
function searchKey(article) {
  const paid = needsPreview(article);
  const cached = article._search;
  if (cached && cached.paid === paid && cached.plainText === article.plainText) return cached.text;
  const body = String(article.plainText || '');
  const preview = paid ? body.trim().split(/\s+/).filter(Boolean).slice(0, 100).join(' ') : body;
  const text = ((article.title || '') + ' ' + (article.byline || '') + ' ' + preview).toLowerCase();
  article._search = { paid, plainText: article.plainText, text };
  return text;
}

export function runSearch(query) {
  const results = $('#search-results');
  if (!results) return;
  if (!query) { results.innerHTML = ''; return; }
  const needle = query.toLowerCase();
  const matches = articleIds().map((id) => state.issue.articles[id]).filter((article) => searchKey(article).includes(needle));
  const pending = !state.issue.metaLoaded ? '<p class="panel-row">' + t('searchIndexing') + '</p>' : '';
  results.innerHTML = matches.length ? matches.map((article) => articleRow(article, searchExcerpt(article, query))).join('') + pending : pending || '<p class="panel-row">' + t('noMatches') + '</p>';
}

export function refreshSearch() {
  const input = $('#search-input');
  if (input) runSearch(input.value.trim());
}

let searchTimer = 0;
$('#panel-host').addEventListener('input', (event) => {
  if (event.target.id !== 'search-input') return;
  clearTimeout(searchTimer);
  const query = event.target.value.trim();
  searchTimer = setTimeout(() => runSearch(query), 150);
});
