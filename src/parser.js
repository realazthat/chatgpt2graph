// @flow strict
/*::
type YearWeek = [number, number];
type YearWeekStr = string;
type GraphData = Map<YearWeek, number>;

*/

// https://github.com/parcel-bundler/parcel/issues/1762#issuecomment-763720624
// https://github.com/parcel-bundler/parcel/issues/1762#issuecomment-1154349769
import 'regenerator-runtime/runtime.js';
import StreamJSON from 'stream-json';
import fs from 'fs';
import path from 'path';
import StreamArrayPKG from 'stream-json/streamers/StreamArray.js';
import * as dateFns from 'date-fns';
// $FlowFixMe - Flow doesn't recognize `once` export correctly
import { once } from 'events';
import jsdom from 'jsdom';

import { GraphInfo, DrawGraphToSVG } from './graph.js';
const { Parser } = StreamJSON;
const { streamArray } = StreamArrayPKG;
const { JSDOM } = jsdom;

function _Get (map /*: Map<YearWeekStr, number> */, key /*: YearWeekStr */) /*: number */ {
  if (typeof key !== 'string' && !(key instanceof String)) {
    throw new Error(`Unexpected type for key; typeof key: ${JSON.stringify(typeof key)}, key instanceof String: ${JSON.stringify(key instanceof String)}`);
  }
  if (!map.has(key)) {
    return 0;
  }
  const result /*: number|void */ = map.get(key);
  if (result === undefined) {
    throw new Error('Unexpected undefined value');
  }
  return result;
}

function _ToYearWeekStr (date /*: Date */) /*: YearWeekStr */ {
  const year = dateFns.getYear(date);
  const week = dateFns.getWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function _SplitYearWeekStr (yearWeekStr /*: YearWeekStr */) /*: [number, number] */ {
  const [year, week] = yearWeekStr.split('-W');
  return [parseInt(year), parseInt(week)];
}

// week: Is ISO week format, starting with 1.
function _FromYearWeekStr (yearWeekStr /*: string */) /*: Date */ {
  const [year, week] = _SplitYearWeekStr(yearWeekStr);
  const isoYW = `${year}-W${String(week).padStart(2, '0')}-1`;
  return dateFns.parseISO(isoYW);
}

class _GraphsHelper {
  /*::
  plots: Array<GraphInfo>;
  */
  constructor () {
    this.plots = [];
  }

  async AddPlot ({ name, x, y, ax }/*: {name: string, x: Array<Date>, y: Array<number>, ax: 'y1'|'y2'} */) {
    this.plots.push(new GraphInfo({ name, x, y, ax }));
  }

  async Draw ({ graphPath }/*: {graphPath: string} */) {
    // Draw the graph
    const margin = { top: 20, right: 80, bottom: 30, left: 50 };
    const wh = { width: 960, height: 500 };
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const svg = dom.window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', wh.width + margin.left + margin.right);
    svg.setAttribute('height', wh.height + margin.top + margin.bottom);

    // Append the SVG element to the body
    dom.window.document.body.appendChild(svg);
    const drawer = new DrawGraphToSVG();

    drawer.Draw({ svg, margin, wh, graphs: this.plots });
    let svgOutput = dom.window.document.body.innerHTML;
    svgOutput = svgOutput.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    svgOutput = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${svgOutput}`;
    // write it out
    // create the parent directory if it doesn't exist
    const graphDir = path.dirname(graphPath);
    await fs.promises.mkdir(graphDir, { recursive: true });
    await fs.promises.writeFile(graphPath, svgOutput);
  }
}

function _SortByYearWeek (list /*: Array<YearWeekStr> */) /*: Array<YearWeekStr> */ {
  const compareFn = (a /*: string */, b/*: string */) => {
    const [aYear, aWeek] = _SplitYearWeekStr(a);
    const [bYear, bWeek] = _SplitYearWeekStr(b);
    return parseInt(aYear) - parseInt(bYear) || parseInt(aWeek) - parseInt(bWeek);
  };
  return list.sort(compareFn);
}

async function DrawGraph ({ graphPath, week2Convs, week2Frusts, week2FrustConvs }/*: {graphPath: string, week2Convs: Map<YearWeekStr, number>, week2Frusts: Map<YearWeekStr, number>, week2FrustConvs: Map<YearWeekStr, number>} */) {
  const graphs_ = new _GraphsHelper();
  /// /////////////////////////////////////////////////////////////////////////
  let xYW /*: Array<YearWeekStr> */ = _SortByYearWeek(Array.from(week2Convs.keys()));
  let x /*: Array<Date> */= xYW.map((yearWeekStr) => _FromYearWeekStr(yearWeekStr));
  let y /*: Array<number> */= xYW.map(yw => _Get(week2Convs, yw));
  await graphs_.AddPlot({ name: 'Conversations Per Week', x, y, ax: 'y1' });
  /// /////////////////////////////////////////////////////////////////////////
  // frusts per week
  xYW = _SortByYearWeek(Array.from(week2Convs.keys()));
  x = xYW.map((yearWeekStr) => _FromYearWeekStr(yearWeekStr));
  y = xYW.map(yw => _Get(week2Frusts, yw));
  await graphs_.AddPlot({ name: 'Frustration Per Week', x, y, ax: 'y1' });
  /// /////////////////////////////////////////////////////////////////////////
  // frust conversations per week
  xYW = _SortByYearWeek(Array.from(week2FrustConvs.keys()));
  x = xYW.map((yearWeekStr) => _FromYearWeekStr(yearWeekStr));
  y = xYW.map(yw => _Get(week2FrustConvs, yw));
  await graphs_.AddPlot({
    name: 'Frustrated Conversations Per Week',
    x,
    y,
    ax: 'y1'
  });

  /// /////////////////////////////////////////////////////////////////////////
  // frusts per conversation
  xYW = _SortByYearWeek(Array.from(week2Convs.keys()));
  xYW = xYW.filter(yw => _Get(week2Convs, yw) > 0);
  x = xYW.map((yearWeekStr) => _FromYearWeekStr(yearWeekStr));
  y = xYW.map(yw => _Get(week2Frusts, yw) / _Get(week2Convs, yw));
  await graphs_.AddPlot({
    name: 'Frustration Per Conversation Per Week',
    x,
    y,
    ax: 'y2'
  });
  /// /////////////////////////////////////////////////////////////////////////
  // frustrated conversations per conversation
  xYW = _SortByYearWeek(Array.from(week2Convs.keys()));
  xYW = xYW.filter(yw => _Get(week2Convs, yw) > 0);
  x = xYW.map((yearWeekStr) => _FromYearWeekStr(yearWeekStr));
  y = xYW.map(yw => _Get(week2FrustConvs, yw) / _Get(week2Convs, yw));
  await graphs_.AddPlot(
    {
      name: 'Frustrated Conversations Per Conversation Per Week',
      x,
      y,
      ax: 'y2'
    });
  /// /////////////////////////////////////////////////////////////////////////

  await graphs_.Draw({ graphPath });
}

function _CountWords ({ conv, words }/*: {conv: any, words: Array<string>} */) /*: number */ {
  let counter = 0;
  for (const node of Object.values(conv.mapping)) {
    if (node.message === null || node.message === undefined) {
      continue;
    }
    const message = node.message;
    const role/*: string */ = message.author.role;
    const contentType/*: string */ = message.content.content_type;
    if (contentType !== 'text') {
      continue;
    }
    const content = message.content;

    if (role !== 'user') {
      continue;
    }

    for (let part of content.parts) {
      part = part.toLowerCase();
      const partWords = part.split(/\s+/);
      for (let word of words) {
        word = word.toLowerCase().trim();
        if (partWords.includes(word)) {
          counter += 1;
        }
      }
    }
  }
  return counter;
}

async function MakeGraph ({ words, ChatGPTExportDumpPath }/*: {words: Array<string>, ChatGPTExportDumpPath: string} */) {
  const ConversationJSONPath = path.join(ChatGPTExportDumpPath, 'conversations.json');
  const totalSize = fs.statSync(ConversationJSONPath).size;
  let processedSize = 0;

  const pipeline = fs.createReadStream(ConversationJSONPath)
    .on('data', chunk => {
      processedSize += chunk.length;
      const progress = (processedSize / totalSize) * 100;
      console.log(`Progress: ${progress.toFixed(2)}%`);
    })
    .pipe(new Parser())
    .pipe(streamArray());

  const week2Convs /*: Map<YearWeekStr, number> */ = new Map();
  const week2Frusts /*: Map<YearWeekStr, number> */= new Map();
  const week2FrustConvs /*: Map<YearWeekStr, number> */= new Map();

  let graphIdx = 0;
  for await (const { value: conv } of pipeline) {
    const wordCount /*: number */= _CountWords({ conv, words });
    const createTime /*: number */ = conv.create_time;
    // Date in UTC
    const createTimeDate /*: Date */ = new Date(createTime * 1000);

    const yearWeekStr = _ToYearWeekStr(createTimeDate);

    week2Convs.set(yearWeekStr, _Get(week2Convs, yearWeekStr) + 1);

    if (wordCount > 0) {
      week2Frusts.set(yearWeekStr, _Get(week2Frusts, yearWeekStr) + wordCount);
      week2FrustConvs.set(yearWeekStr, _Get(week2FrustConvs, yearWeekStr) + 1);
    }

    if (wordCount > 0) {
      const graphPath = `graphs/chatgpt_frustration_over_time${graphIdx}.svg`;
      await DrawGraph({ graphPath, week2Convs, week2FrustConvs, week2Frusts });
      graphIdx += 1;
    }
  }
  // TODO: This kills the program for some reason.
  // await once(pipeline, 'end');
  console.log('Processing completed');
}
