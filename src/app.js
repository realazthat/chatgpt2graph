// @flow strict

/* global ArrayBuffer */
/* global FileReader */
/* global HTMLInputElement */
/* global HTMLImageElement */
/* global HTMLButtonElement */
/* global HTMLSpanElement */
/* global HTMLAnchorElement */
/* global HTMLDivElement */
/* global Image */

// https://github.com/parcel-bundler/parcel/issues/1762#issuecomment-763720624
// https://github.com/parcel-bundler/parcel/issues/1762#issuecomment-1154349769
import 'regenerator-runtime/runtime.js';
import { ConversationIteratorInterface, MakeGraph } from './parser.js';
import { GraphStyle } from './graph.js';
// Needed to webpack.
import process from 'process';

window.process = process;

class State {
  /*::
  conversations: ConversationIteratorInterface|null;
  */
  constructor () {
    this.conversations = null;
  }
}

window.chatgpt2GraphState = new State();

const LoadHistoryElement = document.getElementById('load-history');
if (!LoadHistoryElement) {
  throw new Error('missing load history element');
}
const LoadedIndicatorElement = document.getElementById('loaded-indicator');
if (!LoadedIndicatorElement) {
  throw new Error('missing loaded indicator element');
}

const WordsElement = document.getElementById('words');
if (!WordsElement) { throw new Error('missing words element'); }
if (!(WordsElement instanceof HTMLInputElement)) {
  throw new Error('words element is not an input');
}
const OpaqueBackgroundElement = document.getElementById('background-opaque');
if (!OpaqueBackgroundElement) { throw new Error('missing opaque background element'); }
if (!(OpaqueBackgroundElement instanceof HTMLInputElement)) {
  throw new Error('opaque background element is not a input');
}

const GraphImageElement = document.getElementById('graph-image');
if (!GraphImageElement) { throw new Error('missing graph image element'); }
if (!(GraphImageElement instanceof HTMLImageElement)) {
  throw new Error('graph image element is not an image');
}
const GenerateGraphButton = document.getElementById('generate-graph');
if (!GenerateGraphButton) { throw new Error('missing generate graph button'); }
if (!(GenerateGraphButton instanceof HTMLButtonElement)) {
  throw new Error('generate graph button is not a button');
}
const ErrorMessageSpanElement = document.getElementById('error-message');
if (!ErrorMessageSpanElement) { throw new Error('missing error message element'); }
if (!(ErrorMessageSpanElement instanceof HTMLSpanElement)) {
  throw new Error('error message element is not an element');
}
const DownloadLinksDiv = document.getElementById('download-links-div');
if (!DownloadLinksDiv) { throw new Error('missing download links div'); }
if (!(DownloadLinksDiv instanceof HTMLDivElement)) {
  throw new Error('download links div is not a div');
}

const DownloadGraphAsSVGLink = document.getElementById('download-graph-svg');
if (!DownloadGraphAsSVGLink) { throw new Error('missing download graph as svg link'); }
if (!(DownloadGraphAsSVGLink instanceof HTMLAnchorElement)) {
  throw new Error('download graph as svg link is not an anchor');
}
const DownloadGraphAsPNGLink = document.getElementById('download-graph-png');
if (!DownloadGraphAsPNGLink) { throw new Error('missing download graph as png link'); }
if (!(DownloadGraphAsPNGLink instanceof HTMLAnchorElement)) {
  throw new Error('download graph as png link is not an anchor');
}

class AppConversationIterator extends ConversationIteratorInterface {
  /*::
  buffer: ArrayBuffer;
  processedSize: number;
  totalSize: number;
  index: number;
  conversations: Array<any>;
  */
  constructor ({ buffer } /*: {buffer: ArrayBuffer} */) {
    super();
    this.buffer = buffer;
    this.index = 0;
    this.conversations = JSON.parse(new TextDecoder().decode(this.buffer));
  }

  async * Next () /*: AsyncGenerator<any, void, void> */ {
    let t = 0;

    while (this.index < this.conversations.length) {
      yield this.conversations[this.index++];

      const dt = performance.now() - t;
      // Every interval, update the UI with the current progress.
      if (dt > 200) {
        t = performance.now();
        ErrorMessageSpanElement.textContent = `Processing conversation ${this.index} of ${this.conversations.length}`;
        ErrorMessageSpanElement.style.color = 'green';
        // Allow the browser to update the UI.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    ErrorMessageSpanElement.textContent = 'Finished processing all conversations';
    ErrorMessageSpanElement.style.color = 'green';
  }

  Progress () /*: number */ {
    return this.index / this.conversations.length;
  }
}

LoadHistoryElement.addEventListener('change', function (e) {
  try {
    ErrorMessageSpanElement.textContent = 'Loading conversations';
    ErrorMessageSpanElement.style.color = 'green';

    const reader = new FileReader();
    reader.onload = async function (event) {
      if (event.target === null) {
        throw new Error('event.target is null');
      }

      ErrorMessageSpanElement.textContent = 'Loaded File';
      ErrorMessageSpanElement.style.color = 'green';

      const arrayBuffer = reader.result;
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error(`not an ArrayBuffer: ${typeof arrayBuffer}`);
      }
      const conversations = new AppConversationIterator({ buffer: arrayBuffer });
      window.chatgpt2GraphState.conversations = conversations;
      LoadedIndicatorElement.style.backgroundColor = 'green';
      ErrorMessageSpanElement.textContent = 'Finished loading conversations';
      ErrorMessageSpanElement.style.color = 'green';
    };
    // $FlowFixMe: `files` is missing in  `EventTarget`
    const files /*: FileList */ = e.target.files;
    reader.readAsArrayBuffer(files[0]);
    ErrorMessageSpanElement.textContent = 'Loading file';
    ErrorMessageSpanElement.style.color = 'green';
  } catch (err) {
    console.error(err);
    ErrorMessageSpanElement.textContent = err.message;
    ErrorMessageSpanElement.style.color = 'red';
  }
});

async function SVGToPNGURL ({ svg } /*: {svg: string} */) /*: Promise<string> */ {
  return new Promise((resolve, reject) => {
    // Create a new Image element
    const img = new Image();
    img.onload = () => {
      // Once the image is loaded, draw it to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Convert the canvas to a PNG URL
      canvas.toBlob(blob => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/png');
    };

    // Handle image loading errors
    img.onerror = () => reject(new Error('Image loading failed'));

    // Set the src to be the data URL of the SVG
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

GenerateGraphButton.addEventListener('click', async function () {
  try {
    ErrorMessageSpanElement.textContent = 'Starting processing all conversations';
    ErrorMessageSpanElement.style.color = 'green';

    let words = WordsElement.value.split(',');
    words = words.map(word => word.trim());
    words = words.filter(word => word.length > 0);
    const conversations = window.chatgpt2GraphState.conversations;

    if (!conversations) {
      ErrorMessageSpanElement.textContent = 'Conversations has not finished loading';
      ErrorMessageSpanElement.style.color = 'red';
      return;
    }
    const { graph } = await MakeGraph({ words, conversations, intermediary: null });

    const graphStyle = new GraphStyle({
      margin: { top: 50, right: 50, bottom: 30, left: 50 },
      wh: { width: 960, height: 500 },
      opaque: OpaqueBackgroundElement.checked,
      url: 'https://realazthat.github.io/chatgpt2graph/'
    });

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const svg /*: string */= await graph.SVG({ style: graphStyle, svgElement });
    const svgURL = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    const pngURL = await SVGToPNGURL({ svg });
    GraphImageElement.src = svgURL;

    DownloadGraphAsSVGLink.href = svgURL;
    DownloadGraphAsPNGLink.href = pngURL;
    DownloadLinksDiv.style.visibility = 'visible';
  } catch (err) {
    console.error(err);
    ErrorMessageSpanElement.textContent = err.message;
    ErrorMessageSpanElement.style.color = 'red';
  }
});
