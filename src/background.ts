import * as browser from 'webextension-polyfill';
import { Message, TranslationResult } from './lib/types';
import { categorizeError, isError, TypedError } from './lib/utils';
console.log('[service_worker] Background script loaded');

async function requestTranslation(
  imageBytes: number[],
  fromLang: string = 'auto'
): Promise<TranslationResult> {
  try {
    const maxRetries = 2;
    let retryCount = 0;
    
    // Get stored API keys
    const settings = await browser.storage.sync.get(['ocrKey', 'deeplKey', 'targetLanguage']);
    const ocrKey = settings.ocrKey;
    const deeplKey = settings.deeplKey;

    if (!ocrKey || !deeplKey) {
      throw new TypedError(
        'TranslationError',
        'Please set your OCR.space and DeepL API keys in the extension popup'
      );
    }

    while (retryCount <= maxRetries) {
      try {
        const storedPreference = await browser.storage.sync.get('targetLanguage');
        const toLang =
          storedPreference.targetLanguage &&
          typeof storedPreference.targetLanguage === 'string'
            ? storedPreference.targetLanguage.toLowerCase()
            : 'id';

        // Step 1: Create blob and check size
        const blob = new Blob([new Uint8Array(imageBytes)], { type: 'image/png' });
        
        // Check if image size is greater than 1MB
        if (blob.size > 1024 * 1024) {
          throw new TypedError(
            'TranslationError',
            'Image size must be less than 1MB. Please select a smaller area.'
          );
        }

        // Step 2: Extract text using OCR.space
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        formData.append('language', 'auto');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '2');
        formData.append('scale', 'true');
        formData.append('detectOrientation', 'true');

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            apikey: ocrKey as string
          },
          body: formData
        });

        if (!ocrResponse.ok) {
          console.error('OCR Error Response:', await ocrResponse.text());
          throw new TypedError(
            'FetchError',
            `OCR HTTP error! Status: ${ocrResponse.status}`
          );
        }

        const ocrResult = await ocrResponse.json();
        
        // Check for OCR-specific errors
        if (ocrResult.IsErroredOnProcessing) {
          console.error('OCR Processing Error:', ocrResult.ErrorMessage);
          throw new TypedError(
            'TranslationError',
            `OCR Error: ${ocrResult.ErrorMessage || 'Failed to process image'}`
          );
        }

        // No text found case with helpful suggestions
        if (!ocrResult.ParsedResults?.[0]?.ParsedText) {
          throw new TypedError(
            'TranslationError',
            'No text detected in the image. Try: \n' +
            '• Selecting a larger area around the text\n' +
            '• Ensuring the text is clear and not blurry\n' +
            '• Checking if the text is properly visible on screen'
          );
        }

        const extractedText = ocrResult.ParsedResults[0].ParsedText.trim();
        if (extractedText.length < 2) {
          throw new TypedError(
            'TranslationError',
            'Text is too short or unclear. Try selecting a larger area with more complete text.'
          );
        }

        // Clean up OCR text - handle vertical text and remove unnecessary line breaks
        const cleanText = extractedText
          // Split into lines
          .split(/\r?\n/)
          // Remove empty lines and trim each line
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          // Join with space, preserving intentional paragraph breaks (double newlines)
          .reduce((acc: string, line: string, i: number, arr: string[]) => {
            // Check if this line ends with punctuation or is followed by a capital letter
            const endsWithPunctuation = /[.!?。！？]$/.test(line);
            const nextLineStartsWithCaps = i < arr.length - 1 && /^[A-Z\u00C0-\u00DC]/.test(arr[i + 1]);
            
            // If it's a real sentence break, add two spaces
            if (endsWithPunctuation && nextLineStartsWithCaps) {
              return acc + line + '  ';
            }
            // Otherwise just add a single space
            return acc + line + ' ';
          }, '')
          .trim();

        // Step 2: Translate using DeepL API
        const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${deeplKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: [cleanText],
            target_lang: toLang, // Now matches DeepL's expected format exactly
            source_lang: fromLang === 'auto' ? null : fromLang,
          }),
        });

        if (!deeplResponse.ok) {
          throw new TypedError(
            'FetchError',
            `Translation HTTP error! Status: ${deeplResponse.status}`
          );
        }

        const deeplResult = await deeplResponse.json();
        if (!deeplResult.translations?.[0]?.text) {
          throw new TypedError(
            'TranslationError',
            'Translation failed'
          );
        }

        return {
          originalText: extractedText,
          translatedText: deeplResult.translations[0].text,
        };
      } catch (error) {
        if (
          error instanceof TypedError && 
          error.errorType === 'FetchError' && 
          retryCount < maxRetries
        ) {
          retryCount++;
          await new Promise(r => setTimeout(r, 1000 * retryCount));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error("Unreachable");
  } catch (error) {
    throw error;
  }
}

const contentScriptStates = new Map<number, 'loading'|'ready'|'error'>();

// Track loaded content scripts
browser.tabs.onRemoved.addListener((tabId) => {
  contentScriptStates.delete(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    contentScriptStates.delete(tabId);
  }
});

async function injectContentScript(tabId: number): Promise<void> {
  try {
    if (contentScriptStates.get(tabId) === 'ready') {
      return;
    }
    
    try {
      const pong = await browser.tabs.sendMessage(tabId, { type: 'ping' });
      if (pong === 'pong') {
        contentScriptStates.set(tabId, 'ready');
        return;
      }
      throw new Error("Invalid response");
    } catch (error) {
      contentScriptStates.set(tabId, 'loading');
      
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['/assets/js/content.js'],
        injectImmediately: true,
      });
      
      // Wait for content script to initialize
      let attempts = 0;
      while (attempts < 10) {
        try {
          const pong = await browser.tabs.sendMessage(tabId, { type: 'ping' });
          if (pong === 'pong') {
            contentScriptStates.set(tabId, 'ready');
            return;
          }
        } catch (e) {
          // Still loading
        }
        
        await new Promise(r => setTimeout(r, 50));
        attempts++;
      }
      
      throw new TypedError('ContentScriptError', 'Failed to load content script');
    }
  } catch (error) {
    contentScriptStates.set(tabId, 'error');
    throw error;
  }
}
 
async function handleTranslation(): Promise<boolean> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new TypedError('TabQueryError', 'No active tab found.');
    }

    const tabId = tab.id;
    if (!tabId) {
      throw new TypedError('TabQueryError', 'Failed to retrieve tab ID.');
    }

    await injectContentScript(tabId);

    const imageDataUrl = await browser.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });
    const selectionResult: unknown = await browser.tabs.sendMessage(tabId, {
      type: 'user-select',
      payload: {
        tabId,
        imageDataUrl,
      },
    } as Message);

    if (isError(selectionResult) || !Array.isArray(selectionResult)) {
      throw selectionResult;
    }

    const translationResult = await requestTranslation(selectionResult);
    await browser.tabs.sendMessage(tabId, {
      type: 'translation-result',
      payload: translationResult,
    } as Message);

    return true;
  } catch (error) {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && tab.id) {
      await browser.tabs.sendMessage(tab.id, {
        type: 'error',
        payload: { error },
      } as Message);
    }

    if (
      error instanceof Error &&
      error.message.includes('Receiving end does not exist')
    ) {
      await reportError(
        new TypedError(
          'CommunicationError',
          'Failed to communicate with the page. The tab may have changed or navigation occurred.'
        )
      );
      return false;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'errorType' in error &&
      (error.errorType === 'TimeoutReached' ||
        error.errorType === 'UserEscapeKeyPressed')
    ) {
      return false;
    }

    if (error instanceof TypedError) {
      await reportError(error, error.errorType);
    } else {
      await reportError(error);
    }

    return false;
  }
}

browser.commands.onCommand.addListener(async () => {
  await handleTranslation();
});

browser.runtime.onMessage.addListener((message: unknown) => {
  const typedMessage = message as Message;
  if (typedMessage.type === 'run-translation') {
    return handleTranslation();
  }
  return Promise.resolve(false);
});

async function reportError(error: unknown, title = 'Extension Error') {
  const errorInfo = categorizeError(error);
  
  if (!errorInfo.shouldNotify) {
    console.log(`Silently handling error: ${errorInfo.errorType}`);
    return;
  }

  await browser.notifications.create({
    type: 'basic',
    iconUrl: '/assets/img/icon.png',
    title: errorInfo.type === 'network' ? 'Connection Error' : title,
    message: errorInfo.message,
  });
}