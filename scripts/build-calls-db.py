#!/usr/bin/env python3
"""Build data/calls.csv + js/calls-db.js from connected people.

  python3 scripts/build-calls-db.py
"""
from __future__ import annotations

import csv
import json
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PEOPLE = ROOT / "data" / "people.csv"
CALLS = ROOT / "data" / "calls.csv"
OUT = ROOT / "js" / "calls-db.js"

TODAY = date(2026, 9, 23)
NOW_HOUR = 18
SERVICES = [
    "College shortlisting",
    "SOP review",
    "Visa readiness",
    "Pathway consult",
    "Essay workshop",
    "Applications",
    "Parent consult",
]
TODAY_TIMES = [
    "10:00",
    "10:45",
    "11:30",
    "12:15",
    "13:00",
    "13:40",
    "14:00",
    "14:45",
    "15:15",
    "16:00",
    "16:45",
    "17:30",
    "18:00",
    "18:45",
    "19:30",
]
MINS = [30, 45, 60]


def parse_connected_on(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def service_for(person: dict, index: int) -> str:
    existing = (person.get("service") or "").strip()
    if existing:
        return existing
    return SERVICES[index % len(SERVICES)]


def status_for(day: date, time_str: str) -> str:
    hour = int(time_str.split(":")[0])
    if day < TODAY:
        return "done"
    if day > TODAY:
        return "upcoming"
    return "done" if hour < NOW_HOUR else "upcoming"


def main() -> None:
    with PEOPLE.open(newline="", encoding="utf-8") as handle:
        people = [row for row in csv.DictReader(handle) if row.get("connected") == "1" and row.get("id")]

    people.sort(key=lambda row: row.get("connectedOn") or "", reverse=True)

    rows: list[dict] = []
    used_today = 0
    for index, person in enumerate(people):
        connected_at = parse_connected_on(person.get("connectedOn") or "")
        if not connected_at or connected_at.date() > TODAY:
            continue

        if used_today < len(TODAY_TIMES):
            time_str = TODAY_TIMES[used_today]
            day = TODAY
            used_today += 1
        else:
            # Extra calls on earlier days so the file is a real schedule DB.
            day = TODAY - timedelta(days=1 + (index % 40))
            if day < connected_at.date():
                day = connected_at.date()
            time_str = TODAY_TIMES[index % len(TODAY_TIMES)]

        rows.append(
            {
                "id": f"c-{person['id']}",
                "person_id": person["id"],
                "service": service_for(person, index),
                "day": day.isoformat(),
                "time": time_str,
                "mins": str(MINS[index % len(MINS)]),
                "status": status_for(day, time_str),
            }
        )

    fieldnames = ["id", "person_id", "service", "day", "time", "mins", "status"]
    with CALLS.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    csv_text = CALLS.read_text(encoding="utf-8")
    OUT.write_text(
        TEMPLATE % json.dumps(csv_text),
        encoding="utf-8",
    )
    today_count = sum(1 for row in rows if row["day"] == TODAY.isoformat())
    print(
        "wrote",
        CALLS.relative_to(ROOT),
        "and",
        OUT.relative_to(ROOT),
        "calls",
        len(rows),
        "today",
        today_count,
    )


TEMPLATE = r"""/**
 * GradRight calls database
 * Built from connected people. Regenerate: python3 scripts/build-calls-db.py
 */
(function () {
  var CALLS_CSV = %s;

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

  var todayKey = '2026-09-23';
  var list = parseCsv(CALLS_CSV).map(function (r) {
    var person = (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[r.person_id]) || {};
    return {
      id: r.id,
      personId: r.person_id,
      name: person.name || r.person_id,
      initials: person.initials || '•',
      amber: !!person.amber,
      service: r.service || person.service || 'Consult',
      day: r.day,
      time: r.time,
      mins: Number(r.mins) || 30,
      status: r.status || 'upcoming',
    };
  });

  window.GradRightCalls = {
    todayKey: todayKey,
    list: list,
    today: function () {
      return list.filter(function (c) { return c.day === todayKey; }).sort(function (a, b) {
        return String(a.time).localeCompare(String(b.time));
      });
    },
  };
})();
"""


if __name__ == "__main__":
    main()
