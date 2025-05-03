# Select and Translate

A browser extension that lets you select an area on your screen, extract text from it, and translate it instantly to your preferred language.

## Demo
![Select and Translate Demo](demo/select-and-translate.gif)

## Features

- 📸 **Area Selection**: Drag to select any area on your screen that contains text
- 🔍 **Text Extraction**: Automatically extracts text from the selected area
- 🌐 **Translation**: Translates the extracted text to your chosen language
- 💬 **Languages**: Support for major languages including English, Spanish, Chinese, and many more
- 🌓 **Light/Dark Mode**: Automatically adapts to your browser's theme settings
- ⌨️ **Keyboard Shortcut**: Quick access with Ctrl+Shift+Space
- 📋 **Copy Text**: Easily copy original or translated text to clipboard
- 🎈 **Lightweight**: Extension size smaller than 1MB

## Installation

### Chrome / Edge

1. Download the latest release from [GitHub Releases](https://github.com/handlerone451/select-and-translate/releases)
2. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`
3. Enable "Developer mode" in the top right corner
4. Drag and drop the downloaded .zip file into the browser window
5. The extension should now be installed and visible in your toolbar

## Usage

1. Click the extension icon in your browser toolbar or use the keyboard shortcut (Ctrl+Shift+Space by default)
2. Drag to select the area containing the text you want to translate
3. Wait a moment for the text to be extracted and translated
4. A popup will appear showing both the original text and the translation
5. Use the buttons at the bottom to copy either text to your clipboard

### Change Target Language

1. Click the extension icon in your toolbar to open the popup
2. Select your desired target language from the dropdown menu
3. Your selection will be automatically saved for future translations

### Change Keyboard Shortcut

1. Click the "Change Shortcut" button in the extension popup
2. Your browser's shortcut management page will open
3. Find "Select and Translate" in the list and set your preferred keyboard shortcut

## Privacy

- Use your own api key for translate from ocr.space and deepl, don't worry it's free

## Technical Details

This extension uses:

- Browser Extension API with Manifest V3
- TypeScript for type safety
- Vite for build tool

## Troubleshooting

### Keyboard shortcut doesn't work
- Ensure the shortcut isn't already assigned to another extension or browser function
- Try setting a different shortcut through the browser's extension shortcuts page

### No text detected in the image
- Make sure the selected area contains clear, readable text
- Increase the selection size to include complete text blocks

### Translation doesn't appear
- Check your internet connection, as translation requires API access
- Verify that you've given the extension necessary permissions
- Try refreshing the page and attempting the translation again

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the WebExtension API
- Uses Gemini API
- Made with ❤️ by Echa (apir)
