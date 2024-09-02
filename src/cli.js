#!/usr/bin/env node
// @flow strict
import {
  MakeGraph,
  FileConversationIterator,
  IntermediaryOutputInterface,
  // eslint-disable-next-line no-unused-vars
  GraphOutputInterface
} from './parser.js';
import { GraphStyle } from './graph.js';
import { version } from '../lib/version.js';
import caporal from '@caporal/core';
import fs from 'fs';
import path from 'path';

const { program } = caporal;

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
      svg = await graph.SVG({ style: this.graphStyle });

      const intermediaryFileDir = path.dirname(intermediaryFile);
      await fs.promises.mkdir(intermediaryFileDir, { recursive: true });
      await fs.promises.writeFile(intermediaryFile, svg);
    }
    if (intermediaryDir) {
      if (!svg) {
        svg = await graph.SVG({ style: this.graphStyle });
      }

      await fs.promises.mkdir(intermediaryDir, { recursive: true });
      const filename = path.join(intermediaryDir, `conv${index}.svg`);
      await fs.promises.writeFile(filename, svg);
    }
  }
}

async function amain ({ options, logger } /*: {options: any, logger: any} */) {
  const words /*: string */ = options.words;
  const conversationsPath /*: string */ = options.conversationsPath;
  const output /*: string */ = options.output;
  const intermediaryDir /*: string */ = options.intermediaryDir;
  const intermediaryFile /*: string */ = options.intermediaryFile;

  const graphStyle = new GraphStyle({
    margin: { top: 20, right: 50, bottom: 30, left: 50 },
    wh: { width: 960, height: 500 },
    opaque: true,
    url: 'https://realazthat.github.io/chatgpt2graph/'
  });

  const conversations = new FileConversationIterator({ ConversationJSONPath: conversationsPath });
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
  await fs.promises.writeFile(output, await graph.SVG({ style: graphStyle }));
}

program
  .bin('chatgpt2graph')
  .version(version)
  .description(
    'Graph ChatGPT usage over time.'
  )
  .option('-w, --words <words>', 'A list of words to mark as frustrations, separated by commas.', {
    validator: program.STRING,
    required: true
  })
  .option(
    '--conversations-path <conversations-path>',
    'Path to conversations.js, which you can get from exporting your ChatGPT history via ChatGPT settings, downloading the zip file you get via email, and extracting the conversations.json file.',
    { validator: program.STRING, required: true }
  )
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
