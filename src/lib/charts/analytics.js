export function paintAnalyticsChart({
  document,
  TODAY,
  formatWhen,
  formatShort,
  series,
  grain,
  labels = ['Impressions', 'Connects'],
  sharedScale = false,
  tooltipRows,
  valueFormatter = (value) => value.toLocaleString('en-IN'),
}) {
  function pathFrom(points) {
    if (!points.length) return '';
    let path = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const before = points[i - 2] || points[i - 1],
        start = points[i - 1],
        end = points[i],
        after = points[i + 1] || end;
      path += ` C${(start.x + (end.x - before.x) / 6).toFixed(1)} ${(start.y + (end.y - before.y) / 6).toFixed(1)} ${(end.x - (after.x - start.x) / 6).toFixed(1)} ${(end.y - (after.y - start.y) / 6).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    }
    return path;
  }

  function maxOf(series, key) {
    return Math.max(
      1,
      series.reduce(function (n, d) {
        return Math.max(n, d[key] || 0);
      }, 0),
    );
  }

  function renderChart(series, grain) {
    const svg = document.getElementById('analytics-chart');
    const tip = document.getElementById('analytics-tip');
    if (!svg || !tip) return;
    const w = 760;
    const h = 180;
    const pad = { l: 8, r: 8, t: 16, b: 28 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const maxVis = maxOf(series, 'visitors');
    const maxCon = sharedScale
      ? Math.max(maxVis, maxOf(series, 'connections'))
      : maxOf(series, 'connections');

    function xy(i, value, max) {
      const x =
        series.length === 1 ? pad.l + innerW / 2 : pad.l + (i / (series.length - 1)) * innerW;
      const y = pad.t + innerH - (value / max) * innerH;
      return { x: x, y: y };
    }

    const visPts = series.map(function (d, i) {
      return xy(i, d.visitors, maxVis);
    });
    const conPts = series.map(function (d, i) {
      return xy(i, d.connections, maxCon);
    });

    const area = (points) =>
      pathFrom(points) +
      ` L${points[points.length - 1].x} ${h - pad.b} L${points[0].x} ${h - pad.b} Z`;
    let html =
      '<defs><linearGradient id="dashboard-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--blue-300)" stop-opacity=".45"/><stop offset="100%" stop-color="var(--blue-100)" stop-opacity=".2"/></linearGradient></defs>';
    if (visPts.length)
      html += `<path d="${area(visPts)}" fill="url(#dashboard-area-fill)"/><path d="${area(conPts)}" fill="url(#dashboard-area-fill)"/>`;
    const step = Math.max(1, Math.ceil(series.length / 8));
    let axisLabels = '';
    series.forEach((day, i) => {
      if (
        (i % step === 0 && series.length - 1 - i >= Math.ceil(step / 2)) ||
        i === series.length - 1
      ) {
        const x = visPts[i].x;
        const label =
          grain === 'hour' ? new Date(day.date).getHours() + ':00' : formatShort(day.date);
        axisLabels += `<span style="left:${((x / w) * 100).toFixed(2)}%;transform:translateX(${i === 0 ? '0' : i === series.length - 1 ? '-100%' : '-50%'})">${label}</span>`;
      }
    });
    visPts.forEach(function (p, i) {
      html +=
        '<rect class="analytics-hit" data-i="' +
        i +
        '" x="' +
        (p.x - innerW / series.length / 2).toFixed(1) +
        '" y="0" width="' +
        Math.max(12, innerW / series.length).toFixed(1) +
        '" height="' +
        h +
        '"></rect>';
    });
    html +=
      '<path class="analytics-path visitors" d="' +
      pathFrom(visPts) +
      '"></path>' +
      '<path class="analytics-path connections" d="' +
      pathFrom(conPts) +
      '"></path>';
    if (grain === 'hour') {
      visPts.forEach(function (p, i) {
        if (!series[i].visitors && !series[i].connections) return;
        html +=
          '<circle class="analytics-dot" cx="' +
          p.x.toFixed(1) +
          '" cy="' +
          p.y.toFixed(1) +
          '" r="2.4"></circle>';
      });
    }
    const axis = document.getElementById('dashboard-chart-axis');
    if (axis) axis.innerHTML = axisLabels;
    svg.innerHTML = html;
    svg.dataset.ready = '1';

    function showTip(i, evt) {
      const d = series[i];
      if (!d) return;
      const label = grain === 'hour' ? formatWhen(d.date, TODAY) : formatShort(d.date);
      tip.hidden = false;
      [
        ['visitors', visPts[i]],
        ['connections', conPts[i]],
      ].forEach(([name, point]) => {
        const marker = document.getElementById('dashboard-hover-' + name);
        if (!marker) return;
        marker.hidden = false;
        marker.style.left = (point.x / w) * 100 + '%';
        marker.style.top = (point.y / h) * 100 + '%';
      });
      const rows = tooltipRows?.(d) || [
        ['visitors', labels[0], d.visitors],
        ['connections', labels[1], d.connections],
      ];
      tip.innerHTML =
        '<strong>' +
        label +
        '</strong>' +
        rows
          .map(
            ([color, title, value]) =>
              `<div><span class="dot ${color}"></span>${title}<span>${valueFormatter(value)}</span></div>`,
          )
          .join('');
      const wrap = tip.parentElement.getBoundingClientRect();
      const x = (visPts[i].x / w) * wrap.width;
      const tooltipWidth = tip.getBoundingClientRect().width;
      const gap = 16;
      const left = x + gap + tooltipWidth <= wrap.width - 8 ? x + gap : x - tooltipWidth - gap;
      tip.style.left = Math.max(8, Math.min(wrap.width - tooltipWidth - 8, left)) + 'px';
      tip.style.top = '12px';
    }

    svg.onmousemove = function (e) {
      const hit = e.target.closest('[data-i]');
      if (!hit) return;
      showTip(Number(hit.getAttribute('data-i')), e);
    };
    svg.onmouseleave = function () {
      tip.hidden = true;
      ['visitors', 'connections'].forEach((name) => {
        const marker = document.getElementById('dashboard-hover-' + name);
        if (marker) marker.hidden = true;
      });
    };
  }

  renderChart(series, grain);
}
