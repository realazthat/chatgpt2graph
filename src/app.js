
// For semistandard.
/* global FileReader */
/* global Image */
/* global Blob */
/* global URL */
/* global XMLSerializer */
/* type YearWeek = [number, number]; */
/* type GraphData = Map<YearWeek, number>; */

// https://github.com/parcel-bundler/parcel/issues/1762#issuecomment-763720624
// https://github.com/parcel-bundler/parcel/issues/1762#issuecomment-1154349769
require('regenerator-runtime/runtime');
const { Parser } = require('stream-json');

function _DefaultGraphData () {
  return new Proxy(new Map(), {
    get: (map, key) => {
      if (!map.has(key)) {
        map.set(key, 0);
        return 0;
      }
      return map.get(key);
    }
  });
}

function _ToYearWeek (date /*: Date */) /*: YearWeek */ {
  const year = date.getFullYear();
  const week = date.getWeek();
  return [year, week];
}

class _GraphInfo {
  /*: {name: string, x: List[datetime], y: List[float], ax?: string} */
  constructor ({ name, x, y, ax }/*: {name: string, x: List[datetime], y: List[float], ax?: string} */) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.ax = ax;
  }
}

class _GraphsHelper {
  /*: {plots: List[_GraphInfo]} */
  constructor () {
    this.plots = [];
  }

  async AddPlot ({ name, x, y, ax }/*: {name: string, x: List[datetime], y: List[float], ax?: string} */) {
    this.plots.push({ name, x, y, ax });
  }

  async Draw ({ path }/*: Path */) {
    // Draw the graph

  }
}

function _SortByYearWeek (list /*: List[YearWeek] */) /*: List[YearWeek] */ {
  return list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

async function DrawGraph ({ path, week2convs, week2frusts, week2frust_convs }/*: {path: Path, week2convs: GraphData, week2frusts: GraphData, week2frust_convs: GraphData} */) {
  const graphs_ = _GraphsHelper();
  /// /////////////////////////////////////////////////////////////////////////
  let x_yw = _SortByYearWeek(Array.from(week2convs.keys()));
  let x = x_yw.map(([year, week]) => _FromYearWeek(year, week));
  let y = x_yw.map(yw => week2convs.get(yw));
  await graphs_.AddPlot({ name: 'Conversations Per Week', x, y });
  /// /////////////////////////////////////////////////////////////////////////
  // frusts per week
  x_yw = _SortByYearWeek(Array.from(week2convs.keys()));
  // x = [_FromYearWeek(year, week) for year, week in x_yw]
  // y = [week2frusts[yw] for yw in x_yw]
  x = x_yw.map(([year, week]) => _FromYearWeek(year, week));
  y = x_yw.map(yw => week2frusts.get(yw));
  await graph_.AddPlot({ name: 'Frustration Per Week', x, y, ax: 'y1' });
  /// /////////////////////////////////////////////////////////////////////////
  // frust conversations per week
  x_yw = _SortByYearWeek(Array.from(week2frust_convs.keys()));
  // x = [_FromYearWeek(year, week) for year, week in x_yw]
  // y = [week2frust_convs[yw] for yw in x_yw]
  x = x_yw.map(([year, week]) => _FromYearWeek(year, week));
  y = x_yw.map(yw => week2frust_convs.get(yw));
  await graph_.AddPlot({
    name: 'Frustrated Conversations Per Week',
    x,
    y,
    ax: 'y1'
  });

  /// /////////////////////////////////////////////////////////////////////////
  // frusts per conversation
  x_yw = _SortByYearWeek(Array.from(week2convs.keys()));
  x_yw = x_yw.filter(yw => week2convs[yw] > 0);
  x = x_yw.map(([year, week]) => _FromYearWeek(year, week));
  y = x_yw.map(yw => week2frusts[yw] / week2convs[yw]);
  await graph_.AddPlot({
    name: 'Frustration Per Conversation Per Week',
    x,
    y,
    ax: 'y2'
  });
  /// /////////////////////////////////////////////////////////////////////////
  // frustrated conversations per conversation
  // x_yw = sorted([(year, week) for year, week in week2convs.keys()])
  x_yw = _SortByYearWeek(Array.from(week2convs.keys()));
  x_yw = x_yw.filter(yw => week2convs[yw] > 0);
  x = x_yw.map(([year, week]) => _FromYearWeek(year, week));
  // x = [
  //     _FromYearWeek(year, week)
  //     for year, week in x_yw
  //     if week2convs[year, week] > 0
  // ]
  // x_yw = x_yw.filter(yw => week2convs[yw] > 0);
  // y = [
  //     week2frust_convs[yw] / week2convs[yw]
  //     for yw in x_yw
  //     if week2convs[yw] > 0
  // ]
  y = x_yw.map(yw => week2frust_convs[yw] / week2convs[yw]);
  await graph_.AddPlot(
    {
      name: 'Frustrated Conversations Per Conversation Per Week',
      x,
      y,
      ax: 'y2'
    });
  /// /////////////////////////////////////////////////////////////////////////

  await graph_.Draw(path = path);
}

async function MakeGraph ({ words, ChatGPTExportDumpPath }/*: {words: List[str], exportPath: Path} */) {
  const pipeline = fs.createReadStream(ChatGPTExportDumpPath)
    .pipe(new Parser())
    .pipe(streamArray());

  const week2convs = _DefaultGraphData();
  const week2frusts = _DefaultGraphData();
  const week2frust_convs = _DefaultGraphData();

  for await (const { value: conv } of pipeline) {
    const wordCount /*: number */= _ProcessChatData({ conv, words });

    const create_time /*: number */ = conv.create_time;
    // Date in UTC
    const create_time_date = new Date(create_time);

    const yearWeek /*: YearWeek */ = _ToYearWeek(create_time_date);
    week2convs.set(yearWeek, week2convs.get(yearWeek) + 1);

    if (wordCount > 0) {
      week2frusts.set(yearWeek, week2frusts.get(yearWeek) + word_count);
      week2frust_convs.set(yearWeek, week2frust_convs.get(yearWeek) + 1);
    }

    if (wordCount > 0) {
      await DrawGraph(
        path = new Path(`graphs/chatgpt_frustration_over_time${graph_idx}.png`));
      graph_idx += 1;
    }
  }
  await once(pipeline, 'end');
  console.log('Processing completed');
}
