#!/usr/bin/env python3
"""Rebuild js/people-db.js from data/people.csv + data/visits.csv.

Edit the CSVs, then run:
  python3 scripts/build-people-db.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PEOPLE = ROOT / "data" / "people.csv"
VISITS = ROOT / "data" / "visits.csv"
OUT = ROOT / "js" / "people-db.js"

TEMPLATE = r"""/**
 * GradRight test database
 * Source files: data/people.csv, data/visits.csv
 * Regenerate with: python3 scripts/build-people-db.py
 */
(function () {
  var PEOPLE_CSV = %s;
  var VISITS_CSV = %s;

  function parseCsv(text) {
    var rows = [];
    var i = 0, field = '', row = [], inQ = false;
    text = String(text || '').replace(/^\uFEFF/, '');
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0]) rows.push(row);
        row = [];
      } else field += c;
      i++;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    var headers = rows[0];
    return rows.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) { o[h] = r[idx] == null ? '' : r[idx]; });
      return o;
    });
  }

  function parseStamp(s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
    var p = String(s).trim().split(/[- :T]/).map(Number);
    var d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1, p[3] || 0, p[4] || 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function isoDay(d) {
    if (!d) return '';
    if (!(d instanceof Date)) d = parseStamp(d);
    if (!d) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dayKey(s) {
    if (!s) return '';
    if (s instanceof Date) return isoDay(s);
    return String(s).slice(0, 10);
  }

  function formatTime(d) {
    var h = d.getHours();
    var m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h %% 12 || 12;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }

  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatWhen(stamp, today) {
    var d = parseStamp(stamp);
    if (!d) return '—';
    today = today || (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
    var t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((t0 - d0) / 86400000);
    var time = formatTime(d);
    if (diff === 0) return 'Today, ' + time;
    if (diff === 1) return 'Yesterday, ' + time;
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ', ' + time;
  }

  var peopleRows = parseCsv(PEOPLE_CSV);
  var visitRows = parseCsv(VISITS_CSV);
  var byId = {};

  peopleRows.forEach(function (r) {
    if (!r.id) return;
    byId[r.id] = {
      id: r.id,
      name: r.name,
      initials: r.initials,
      role: r.role,
      connected: r.connected === '1',
      email: r.email,
      source: r.source,
      service: r.service,
      forWho: r.forWho,
      connectedOn: r.connectedOn,
      connectedAt: parseStamp(r.connectedOn),
      amount: r.connected === '1' ? (Number(r.amount) || 1999) : 0,
      amber: r.amber === '1',
      views: [],
    };
  });

  visitRows.forEach(function (r) {
    var p = byId[r.person_id];
    if (!p) return;
    var at = parseStamp(r.at);
    if (!at) return;
    p.views.push({
      when: isoDay(at),
      at: r.at,
      date: at,
      source: r.source,
      seconds: Number(r.seconds) || 40,
    });
  });

  Object.keys(byId).forEach(function (id) {
    byId[id].views.sort(function (a, b) { return b.date - a.date; });
    var last = byId[id].views[0];
    if (last) {
      byId[id].lastView = last.at;
      byId[id].lastViewAt = last.date;
      byId[id].lastSource = last.source;
    }
  });

  var list = peopleRows.map(function (r) { return byId[r.id]; }).filter(Boolean);

  window.GradRightDB = {
    today: new Date(2026, 8, 23, 18, 0),
    people: list,
    byId: byId,
    connected: list.filter(function (p) { return p.connected; }),
    parseStamp: parseStamp,
    dayKey: dayKey,
    isoDay: isoDay,
    formatWhen: formatWhen,
    formatTime: formatTime,
  };
})();
"""


def main() -> None:
    people = PEOPLE.read_text(encoding="utf-8")
    visits = VISITS.read_text(encoding="utf-8")
    OUT.write_text(
        TEMPLATE % (json.dumps(people), json.dumps(visits)),
        encoding="utf-8",
    )
    print(
        "wrote",
        OUT.relative_to(ROOT),
        "people",
        people.count("\n") - 1,
        "visits",
        visits.count("\n") - 1,
        "bytes",
        OUT.stat().st_size,
    )


if __name__ == "__main__":
    main()
