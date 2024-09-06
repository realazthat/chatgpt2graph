#!/usr/bin/env node
// @flow strict
import fs from 'fs';
import path from 'path';
import jsdom from 'jsdom';

import caporal from '@caporal/core';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import StreamJSON from 'stream-json';

import { GraphStyle } from './graph.js';
import {
  ConversationIteratorInterface,
  // eslint-disable-next-line no-unused-vars
  GraphOutputInterface,
  IntermediaryOutputInterface,
  MakeGraph
} from './parser.js';
import { version } from '../lib/version.js';
const { JSDOM } = jsdom;

const { Parser } = StreamJSON;
const { streamArray } = StreamArray;
const { program } = caporal;

function MakeSVGElement ({ graphStyle }/*: {graphStyle: GraphStyle} */) /*: HTMLElement */ {
  const { margin, wh } = graphStyle;
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const svg = dom.window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', wh.width + margin.left + margin.right);
  svg.setAttribute('height', wh.height + margin.top + margin.bottom);

  // Append the SVG element to the body
  dom.window.document.body.appendChild(svg);
  return svg;
}

class FileConversationIterator extends ConversationIteratorInterface {
  /*::
  ConversationJSONPath: string;
  processedSize: number;
  totalSize: number;
  pipeline: StreamArray;
  */
  constructor ({ ConversationJSONPath } /*: {ConversationJSONPath: string} */) {
    super();
    this.ConversationJSONPath = ConversationJSONPath;
    this.processedSize = 0;
    this.totalSize = 0;
    const self = this;
    this.pipeline = fs.createReadStream(this.ConversationJSONPath)
      .on('data', async chunk => {
        self.processedSize += chunk.length;
        if (self.totalSize === 0) {
          self.totalSize = (await fs.promises.stat(self.ConversationJSONPath)).size;
        }
      })
      .pipe(new Parser())
      .pipe(streamArray());
  }

  async * Next () /*: AsyncGenerator<any, void, void> */ {
    for await (const { value: conv } of this.pipeline) {
      yield conv;
    }
    // TODO: This kills the program for some reason.
    // await once(this.pipeline, 'end');
  }

  Progress () /*: number */ {
    return (this.processedSize / this.totalSize);
  }
}

class FileIntermediaryOutput extends IntermediaryOutputInterface {
  /*::
  intermediaryDir: string|void;
  intermediaryFile: string|void;
  graphStyle: GraphStyle;
  */
  constructor ({ graphStyle, intermediaryDir, intermediaryFile } /*: { graphStyle: GraphStyle, intermediaryDir: string|void, intermediaryFile: string|void } */) {
    super();
    this.intermediaryDir = intermediaryDir;
    this.intermediaryFile = intermediaryFile;
    this.graphStyle = graphStyle;
  }

  async Conversation ({ conv, index, graph } /*: {conv: any, index: number, graph: GraphOutputInterface} */) /*: Promise<void> */ {
    let svg /*: string|null */ = null;
    const intermediaryFile = this.intermediaryFile;
    const intermediaryDir = this.intermediaryDir;

    if (intermediaryFile) {
      const svgElement = MakeSVGElement({ graphStyle: this.graphStyle });
      svg = await graph.SVG({ style: this.graphStyle, svgElement });

      const intermediaryFileDir = path.dirname(intermediaryFile);
      await fs.promises.mkdir(intermediaryFileDir, { recursive: true });
      await fs.promises.writeFile(intermediaryFile, svg);
    }
    if (intermediaryDir) {
      if (!svg) {
        const svgElement = MakeSVGElement({ graphStyle: this.graphStyle });
        svg = await graph.SVG({ style: this.graphStyle, svgElement });
      }

      await fs.promises.mkdir(intermediaryDir, { recursive: true });
      const filename = path.join(intermediaryDir, `conv${index}.svg`);
      await fs.promises.writeFile(filename, svg);
    }
  }
}

async function amain ({ options, logger } /*: {options: any, logger: any} */) {
  logger.info('options:', options);

  const words /*: string */ = options.words;
  const input /*: string */ = options.input;
  const output /*: string */ = options.output;
  const intermediaryDir /*: string */ = options.intermediaryDir;
  const intermediaryFile /*: string */ = options.intermediaryFile;

  const graphStyle = new GraphStyle({
    margin: { top: 20, right: 50, bottom: 30, left: 50 },
    wh: { width: 960, height: 500 },
    opaque: true,
    url: 'https://realazthat.github.io/chatgpt2graph/'
  });

  const conversations = new FileConversationIterator({ ConversationJSONPath: input });
  const intermediary = new FileIntermediaryOutput({
    graphStyle,
    intermediaryDir,
    intermediaryFile
  });
  const { graph } = await MakeGraph({
    words: words.split(','),
    conversations,
    intermediary
  });

  // create the parent directory if it doesn't exist
  const graphDir = path.dirname(output);
  await fs.promises.mkdir(graphDir, { recursive: true });
  await fs.promises.writeFile(output, await graph.SVG({ style: graphStyle, svgElement: MakeSVGElement({ graphStyle }) }));
}

program
  .bin('chatgpt2graph')
  .version(version)
  .description(
    'Graph ChatGPT usage over time.'
  )
  .option(
    '-i, --input <input-path>',
    'Path to conversations.js, which you can get from exporting your ChatGPT history via ChatGPT settings, downloading the zip file you get via email, and extracting the conversations.json file.',
    { validator: program.STRING, required: true }
  )
  .option('-w, --words <words>', 'A list of words to mark as frustrations, separated by commas.', {
    validator: program.STRING,
    required: true
  })
  .option(
    '-o, --output <output>',
    'Path to the output SVG file.',
    { validator: program.STRING, required: true }
  )
  .option(
    '--intermediary-dir <intermediary-dir>',
    'If set, this directory will be filled with intermediary SVG files.'
  )
  .option(
    '--intermediary-file <intermediary-file>',
    'If set, this file will be filled with the final SVG.'
  )
  .action(({ args, options, logger }) => {
    return amain({ options, logger });
  })
  .run()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('program.run() failed:', e);
    process.exit(1);
  });
