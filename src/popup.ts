import * as browser from 'webextension-polyfill';

document.addEventListener('DOMContentLoaded', async () => {
  const langSelect = document.getElementById('lang') as HTMLSelectElement;
  const ocrKeyInput = document.getElementById('ocr-key') as HTMLInputElement;
  const deeplKeyInput = document.getElementById('deepl-key') as HTMLInputElement;

  // Load saved settings
  const settings = await browser.storage.sync.get(['targetLanguage', 'ocrKey', 'deeplKey']);
  
  if (settings.targetLanguage && typeof settings.targetLanguage === 'string') {
    langSelect.value = settings.targetLanguage;
  }
  if (settings.ocrKey && typeof settings.ocrKey === 'string') {
    ocrKeyInput.value = settings.ocrKey;
  }
  if (settings.deeplKey && typeof settings.deeplKey === 'string') {
    deeplKeyInput.value = settings.deeplKey;
  }

  // Handle API key inputs
  ocrKeyInput.addEventListener('change', () => {
    browser.storage.sync.set({ ocrKey: ocrKeyInput.value });
  });

  deeplKeyInput.addEventListener('change', () => {
    browser.storage.sync.set({ deeplKey: deeplKeyInput.value });
  });

  // Handle visibility toggle buttons
  document.querySelectorAll('.visibility-toggle').forEach((button) => {
    button.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const inputId = target.getAttribute('data-for');
      if (!inputId) return;
      
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input.type === 'password') {
        input.type = 'text';
        target.textContent = '🔒';
      } else {
        input.type = 'password';
        target.textContent = '👁️';
      }
    });
  });

  langSelect.addEventListener('change', () => {
    browser.storage.sync.set({
      targetLanguage: langSelect.value,
    });
  });

  const runBtn = document.getElementById('run-btn');
  runBtn?.addEventListener('click', async () => {
    // Validate API keys before running
    if (!ocrKeyInput.value || !deeplKeyInput.value) {
      if (!ocrKeyInput.value) ocrKeyInput.classList.add('error');
      if (!deeplKeyInput.value) deeplKeyInput.classList.add('error');
      return;
    }

    try {
      await browser.runtime.sendMessage({
        type: 'run-translation',
      });

      window.close();
    } catch (err) {
      console.error('Failed to initiate translation command:', err);
    }
  });

  // Remove error class on input
  ocrKeyInput.addEventListener('input', () => ocrKeyInput.classList.remove('error'));
  deeplKeyInput.addEventListener('input', () => deeplKeyInput.classList.remove('error'));

  const shortcutsBtn = document.getElementById('shortcuts-btn');

  shortcutsBtn?.addEventListener('click', async () => {
    try {
      if (navigator.userAgent.includes('Chrome')) {
        // For Chrome, we can open the shortcuts page directly
        await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
      } else if (navigator.userAgent.includes('Firefox')) {
        // For Firefox
        await browser.tabs.create({ url: 'about:addons' });
      } else if (navigator.userAgent.includes('Edge')) {
        // For Microsoft Edge
        await browser.tabs.create({ url: 'edge://extensions/shortcuts' });
      } else if (navigator.userAgent.includes('Opera')) {
        // For Opera
        await browser.tabs.create({ url: 'opera://extensions/shortcuts' });
      }
    } catch (err) {
      console.error('Failed to open shortcuts page:', err);
    }
  });

  const githubBtn = document.getElementById('github-btn');
  const donateBtn = document.getElementById('donate-btn');

  githubBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await browser.tabs.create({ url: 'https://github.com/apirJS' });
    } catch (err) {
      console.error('Failed to open GitHub link:', err);
    }
  });

  donateBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await browser.tabs.create({ url: 'https://saweria.co/aprApr' });
    } catch (err) {
      console.error('Failed to open donation link:', err);
    }
  });
});
