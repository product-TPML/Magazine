import { renderArticleControls } from './chrome.js';
import { $, prefersReducedMotion, state } from './core.js';
import { t } from './i18n.js';
import { icon } from './icons.js';

export function prepareSpeech() {
  state.speech.sentences = [];
  state.speech.index = 0;
  const excluded = 'h1, .byline, .access-status, .article-footer, .article-figure, .paywall';
  const blocks = [...document.querySelectorAll('#article-content p, #article-content li, #article-content blockquote, #article-content h2, #article-content h3')]
    .filter((block) => !block.closest(excluded) && block.textContent.trim());
  blocks.forEach((block) => {
    const text = block.textContent.replace(/\s+/g, ' ').trim();
    const speechIndex = state.speech.sentences.length;
    state.speech.sentences.push(text);
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const span = document.createElement('span');
      span.className = 'speech-sentence';
      span.dataset.speechIndex = speechIndex;
      span.textContent = node.nodeValue;
      node.replaceWith(span);
    });
  });
  loadVoices();
}

export function loadVoices() {
  if (!('speechSynthesis' in window)) { state.speech.voices = []; renderListenPlayer(); return; }
  state.speech.voices = speechSynthesis.getVoices().filter((voice) => /^kn[-_]/i.test(voice.lang));
  renderListenPlayer();
}

function clearSpeechHighlight() { document.querySelectorAll('.speech-current').forEach((node) => node.classList.remove('speech-current')); }

export function speakCurrentSentence({ restart = false } = {}) {
  if (!state.speech.sentences.length || !state.speech.voices.length) return;
  if (restart) { state.speech.run += 1; speechSynthesis.cancel(); }
  const run = state.speech.run;
  clearSpeechHighlight();
  const sentences = [...document.querySelectorAll('[data-speech-index="' + state.speech.index + '"]')];
  sentences.forEach((sentence) => sentence.classList.add('speech-current'));
  sentences[0]?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
  const utterance = new SpeechSynthesisUtterance(state.speech.sentences[state.speech.index]);
  utterance.lang = 'kn-IN';
  utterance.rate = Number($('#listen-rate').value || 1);
  utterance.voice = state.speech.voices[0];
  utterance.onend = () => {
    if (run !== state.speech.run || state.speech.status !== 'playing') return;
    state.speech.index += 1;
    if (state.speech.index >= state.speech.sentences.length) { state.speech.status = 'idle'; state.speech.index = 0; clearSpeechHighlight(); }
    else speakCurrentSentence();
    renderArticleControls();
    renderListenPlayer();
  };
  utterance.onerror = (event) => {
    if (run !== state.speech.run || event.error === 'canceled' || event.error === 'interrupted') return;
    state.speech.status = 'idle';
    renderArticleControls();
    renderListenPlayer();
  };
  state.speech.utterance = utterance;
  speechSynthesis.speak(utterance);
  renderArticleControls();
  renderListenPlayer();
}

export function toggleSpeech() {
  if (!('speechSynthesis' in window) || !state.speech.voices.length) return;
  if (state.speech.status === 'playing') {
    state.speech.run += 1;
    speechSynthesis.cancel();
    state.speech.status = 'paused';
  }
  else if (state.speech.status === 'paused') { state.speech.status = 'playing'; speakCurrentSentence({ restart: true }); return; }
  else { state.speech.status = 'playing'; speakCurrentSentence({ restart: true }); return; }
  renderArticleControls();
  renderListenPlayer();
}

export function stopSpeech() {
  state.speech.run += 1;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.speech.status = 'idle';
  state.speech.index = 0;
  state.speech.utterance = null;
  clearSpeechHighlight();
  if ($('#article-controls')) renderArticleControls();
  if ($('#listen-player')) renderListenPlayer();
}

export function renderListenPlayer() {
  if (!$('#listen-player')) return;
  $('#listen-player').hidden = state.view !== 'text' || state.speech.status === 'idle';
  const supported = 'speechSynthesis' in window && state.speech.voices.length > 0;
  $('#listen-play').disabled = !supported;
  $('#listen-play').innerHTML = icon(state.speech.status === 'playing' ? 'pause' : 'play');
  $('#listen-play').setAttribute('aria-label', state.speech.status === 'playing' ? t('pauseArticleAria') : t('playArticleAria'));
  $('#listen-status').textContent = supported ? (state.speech.status === 'paused' ? t('paused') : t('readingAloud')) : t('noVoice');
  $('#listen-progress').value = state.speech.sentences.length ? state.speech.index / state.speech.sentences.length : 0;
}
