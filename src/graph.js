// @flow strict

import * as d3 from 'd3';

class GraphInfo {
  /*::
  name: string;
  x: Array<Date>;
  y: Array<number>;
  ax: 'y1'|'y2';
  */

  constructor ({ name, x, y, ax }/*: {name: string, x: Array<Date>, y: Array<number>, ax: 'y1'|'y2'} */) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.ax = ax;
  }
}

class GraphStyle {
  /*::
  margin: {top: number, right: number, bottom: number, left: number};
  wh: {width: number, height: number};
  opaque: boolean;
  url: string|null;
  */

  constructor ({ margin, wh, opaque, url } /*: {margin: {top: number, right: number, bottom: number, left: number}, wh: {width: number, height: number}, opaque: boolean, url: string} */) {
    this.margin = margin;
    this.wh = wh;
    this.opaque = opaque;
    this.url = url;
  }
}

class DrawGraphToSVG {
  Draw ({ svg, graphs, style } /*:
    {svg: Element,
     graphs: Array<GraphInfo>,
     style: GraphStyle} */
  ) {
    const width = style.wh.width - style.margin.left - style.margin.right;
    const height = style.wh.height - style.margin.top - style.margin.bottom;

    // Create SVG container
    // const svg = d3.select('body').append('svg')
    //   .append('g')
    //   .attr('transform', `translate(${margin.left},${margin.top})`);
    // Alter svg selection to use the provided svg element
    const d3Svg = d3.select(svg)
      .attr('width', width + style.margin.left + style.margin.right)
      .attr('height', height + style.margin.top + style.margin.bottom)
      .append('g')
      .attr('transform', `translate(${style.margin.left}, ${style.margin.top})`);

    // Define scales
    const x = d3.scaleTime().range([0, width]);
    const y1 = d3.scaleLinear().range([height, 0]);
    const y2 = d3.scaleLinear().range([height, 0]);

    // Define axes
    const xAxis = d3.axisBottom(x);
    const yAxisLeft = d3.axisLeft(y1);
    const yAxisRight = d3.axisRight(y2);

    x.domain(d3.extent(graphs.flatMap(g => g.x)));
    // y1.domain([
    //   d3.min(graphs.filter(g => g.ax === 'y1').flatMap(g => g.y)),
    //   d3.max(graphs.filter(g => g.ax === 'y1').flatMap(g => g.y))
    // ]);
    // y2.domain([
    //   d3.min(graphs.filter(g => g.ax === 'y2').flatMap(g => g.y)),
    //   d3.max(graphs.filter(g => g.ax === 'y2').flatMap(g => g.y))
    // ]);
    y1.domain([
      d3.min(graphs.filter(g => g.ax === 'y1').flatMap(g => g.y), d => d),
      d3.max(graphs.filter(g => g.ax === 'y1').flatMap(g => g.y), d => d)
    ]);
    y2.domain([
      d3.min(graphs.filter(g => g.ax === 'y2').flatMap(g => g.y), d => d),
      d3.max(graphs.filter(g => g.ax === 'y2').flatMap(g => g.y), d => d)
    ]);

    // Add axes to SVG
    d3Svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    d3Svg.append('g')
      .attr('class', 'y axis')
      .call(yAxisLeft);

    d3Svg.append('g')
      .attr('class', 'y axis')
      .attr('transform', `translate(${width},0)`)
      .call(yAxisRight);

    // Plot lines
    graphs.forEach((g, i) => {
      const line = d3.line()
        .x(d => x(d.x))
        .y(d => (g.ax === 'y1' ? y1 : y2)(d.y)); // Use the correct yScale directly in line definition

      d3Svg.append('path')
        .datum(g.x.map((x, idx) => ({ x, y: g.y[idx] })))
        .attr('class', 'line')
        .attr('d', line)
        .style('stroke', d3.schemeCategory10[i % 10])
        .style('stroke-width', 2)
        .style('fill', 'none');

      d3Svg.selectAll(`.dot${i}`)
        .data(g.x.map((x, idx) => ({ x, y: g.y[idx] })))
        .enter().append('circle')
        .attr('class', `dot${i}`)
        .attr('cx', d => x(d.x))
        .attr('cy', d => (g.ax === 'y1' ? y1 : y2)(d.y))
        .attr('r', 3.5)
        .style('fill', d3.schemeCategory10[i % 10]);
    });

    const legendLeftX = 20;

    // Add legends for left and right Y-axes
    const legendLeft = d3Svg.selectAll('.legend-left')
      .data(graphs.filter(g => g.ax === 'y1'))
      .enter().append('g')
      .attr('class', 'legend-left')
      .attr('transform', (d, i) => `translate(${legendLeftX}, ${20 + i * 20})`);

    legendLeft.append('rect')
      .attr('x', 0)
      // .attr('dx', -18)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', (d, i) => d3.schemeCategory10[i % 10]);

    legendLeft.append('text')
      .attr('x', 22)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'start')
      .text(d => d.name);
    /// //////////////////////////////////////////////////////////////////////////

    const legendRightX = width - 20;
    const legendRightOffset = graphs.filter(g => g.ax === 'y1').length;

    const legendRight = d3Svg.selectAll('.legend-right')
      .data(graphs.filter(g => g.ax === 'y2'))
      .enter().append('g')
      .attr('class', 'legend-right')
      .attr('transform', (d, i) => `translate(${legendRightX}, ${20 + i * 20})`);

    legendRight.append('rect')
      .attr('x', -18)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', (d, i) => d3.schemeCategory10[i + legendRightOffset % 10]);

    legendRight.append('text')
      .attr('x', -24)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'end')
      .text(d => d.name);

    if (style.url) {
      const link = d3Svg.append('a')
        .attr('xlink:href', style.url)
        .attr('target', '_blank');

      // Append text to the link
      link.append('text')
        .attr('x', style.wh.width / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')

        .style('fill', 'blue')
        .text(style.url);
    }
  }
}

export { GraphInfo, GraphStyle, DrawGraphToSVG };
