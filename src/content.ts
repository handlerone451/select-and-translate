import {
  hideLoadingToast,
  selectAndCropImage,
  showPopupToViewport,
} from './lib/dom';
import { Message } from './lib/types';
import * as browser from 'webextension-polyfill';

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to convert canvas to blob'));
        return;
      }
      resolve(blob);
    }, 'image/png', 1.0);
  });
}

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const typedMessage = message as Message;
  try {
    if (typedMessage.type === 'ping') {
      return Promise.resolve('pong');
    }

    if (typedMessage.type === 'user-select') {
      const croppedCanvas = await selectAndCropImage(
        typedMessage.payload.imageDataUrl
      );
      const imageBlob = await canvasToBlob(croppedCanvas);
      // Convert blob to array buffer for sending through extension messaging
      const arrayBuffer = await imageBlob.arrayBuffer();
      return Array.from(new Uint8Array(arrayBuffer));
    } else if (typedMessage.type === 'translation-result') {
      await hideLoadingToast('success');
      showPopupToViewport(typedMessage.payload);
    } else if (typedMessage.type === 'error') {
      await hideLoadingToast('failed');
    }
  } catch (error) {
    await hideLoadingToast('failed');
    return error;
  }
});
