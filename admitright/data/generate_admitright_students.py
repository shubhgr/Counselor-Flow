#!/usr/bin/env python3
"""Generate temp AdmitRight student profiles as CSV.

Usage: python3 admitright/data/generate_admitright_students.py [count] [seed]
Writes admitright/data/admitright-students.csv (read by admitright/js/admitright.js).

Marks are stored in each board's own grading:
  class*_scale = percent | cgpa10 (10-point GPA, % = GPA x 9.5) | ib45 (IB points out of 45)
tests = "Name=value;..." in the test's own unit (percentile, score or rank).
Custom tests carry their maximum: "NSO Olympiad=41/60".
activities = "Coding;Robotics;..." (any custom activity is allowed).
"""
import csv
import os
import random
import sys
from datetime import date, datetime, timedelta

TODAY = date(2026, 10, 6)
NOW = datetime(2026, 10, 6, 14, 0)

PROGRAMS = [
    ("btech-cse", "PCM", 0.32),
    ("btech-ai", "PCM", 0.22),
    ("bsc-ds", "PCM", 0.16),
    ("bba", "Any", 0.18),
    ("bdes", "Any", 0.12),
    ("bcom", "Commerce", 0.10),
]
STAGES = ["recommended", "opened", "shortlisted", "expert", "applied", "enrolled"]
STAGE_WEIGHTS = [0.30, 0.25, 0.18, 0.13, 0.09, 0.05]
# Class 12 board share. Class 10 is usually the same board, sometimes a switch after Class 10.
BOARDS = [("CBSE", 0.44), ("CISCE", 0.12), ("UP Board", 0.14), ("Maharashtra Board", 0.10),
          ("Telangana Board", 0.08), ("Other State Board", 0.08), ("IB", 0.04)]
STREAMS = ["PCM", "PCB", "Commerce", "Humanities"]
ACTIVITIES = [
    "Coding", "Robotics", "Olympiads", "Hackathons", "Science fairs", "Debate", "MUN", "Quizzing",
    "Music", "Dance", "Theatre", "Art", "Photography", "Creative writing", "Sports", "Swimming", "Chess",
    "NCC", "Volunteering", "Entrepreneurship",
]
CUSTOM_ACTIVITIES = ["Astronomy club", "Beatboxing", "Podcasting", "Rock climbing", "Sign language", "3D printing"]

# National tests: (name, kind, max). kind = percentile | score | rank (lower is better).
TESTS = {
    "JEE Main": ("percentile", 100),
    "JEE Advanced": ("rank", None),
    "BITSAT": ("score", 390),
    "MHT CET": ("percentile", 100),
    "CUET UG": ("percentile", 100),
    "NEET UG": ("score", 720),
    "IPMAT Indore": ("score", 360),
    "CLAT": ("score", 120),
    "UCEED": ("score", 300),
    "NATA": ("score", 200),
    "SAT": ("score", 1600),
}
CUSTOM_TESTS = [("University entrance test", 100), ("NSO Olympiad", 60), ("Aptitude test", 50)]
INTAKES = ["Aug 2027", "Jan 2027"]
NEAR_CITIES = [
    ("Noida", 5), ("Greater Noida", 15), ("Ghaziabad", 22), ("Delhi", 28), ("Faridabad", 38),
    ("Gurugram", 45), ("Sonipat", 60), ("Meerut", 72),
]
FAR_CITIES = [
    ("Panipat", 95), ("Aligarh", 130), ("Mathura", 160), ("Agra", 200), ("Dehradun", 245),
    ("Chandigarh", 255), ("Jaipur", 270), ("Kanpur", 450), ("Lucknow", 500), ("Bhopal", 760),
    ("Patna", 1000), ("Kolkata", 1470), ("Mumbai", 1400), ("Bengaluru", 2100),
]
FIRST = [
    "Aarav", "Ananya", "Vihaan", "Diya", "Arjun", "Ishita", "Kabir", "Meera", "Rohan", "Saanvi",
    "Aditya", "Kavya", "Reyansh", "Myra", "Vivaan", "Anika", "Krish", "Tara", "Dev", "Riya",
    "Yash", "Nisha", "Aryan", "Pooja", "Siddharth", "Zara", "Nikhil", "Aisha", "Rahul", "Sneha",
    "Kunal", "Priya", "Harsh", "Avni", "Manav", "Ira", "Tanmay", "Simran", "Om", "Lavanya",
    "Parth", "Jiya", "Shaurya", "Naina", "Ayaan", "Kiara", "Rudra", "Advika", "Atharv", "Pari",
    "Ishaan", "Navya", "Arnav", "Sara", "Dhruv", "Aadhya", "Laksh", "Mahi", "Veer", "Tanvi",
]
LAST = [
    "Sharma", "Verma", "Gupta", "Singh", "Kapoor", "Mehta", "Jain", "Agarwal", "Reddy", "Iyer",
    "Malhotra", "Bansal", "Chopra", "Saxena", "Mishra", "Yadav", "Khanna", "Joshi", "Nair", "Pandey",
    "Tiwari", "Chauhan", "Rastogi", "Goel", "Arora", "Bhatia", "Sethi", "Dubey", "Rao", "Kulkarni",
]

FIELDS = [
    "id", "first_name", "last_name", "phone", "email", "city", "km",
    "class10_board", "class10_scale", "class10_score", "class12_board", "class12_scale", "class12_score",
    "stream", "tests", "activities", "budget_min", "budget_max", "program", "intake",
    "stage", "created_at", "recommended_at", "opened_at", "shortlisted_at", "expert_at", "applied_at",
    "enrolled_at", "last_active_at",
]
STAGE_COLUMNS = ["recommended_at", "opened_at", "shortlisted_at", "expert_at", "applied_at", "enrolled_at"]


def stamp(dt):
    return dt.strftime("%Y-%m-%dT%H:%M")


def activity(rng, stage_index):
    """Profile creation, one timestamp per funnel stage reached, and last activity, all before NOW."""
    day = TODAY - timedelta(days=days_ago(rng))
    created = datetime(day.year, day.month, day.day, rng.randint(8, 22), rng.randint(0, 59))
    if created > NOW:
        created = NOW - timedelta(minutes=rng.randint(30, 300))
    recommended = min(created + timedelta(minutes=rng.randint(2, 25)), NOW)
    times = [recommended]
    span = max(60, (NOW - recommended).total_seconds() / 60)
    # Each later stage takes a share of the remaining time, so journeys stay in order.
    cursor = recommended
    for _ in range(stage_index):
        remaining = (NOW - cursor).total_seconds() / 60
        step = max(5, min(remaining * rng.uniform(0.08, 0.45), span))
        cursor = cursor + timedelta(minutes=step)
        if cursor.hour < 8:
            cursor = cursor.replace(hour=rng.randint(8, 11), minute=rng.randint(0, 59))
        cursor = min(cursor, NOW)
        times.append(cursor)
    last = times[-1] + timedelta(minutes=(NOW - times[-1]).total_seconds() / 60 * rng.uniform(0, 0.6))
    if last.hour < 8:
        last = max(last.replace(hour=rng.randint(8, 11)), times[-1])
    row = {"created_at": stamp(created), "last_active_at": stamp(min(last, NOW))}
    for i, col in enumerate(STAGE_COLUMNS):
        row[col] = stamp(times[i]) if i < len(times) else ""
    return row


# (min_days, max_days, share): ~12% last 30 days, ~18% 1-3 months, ~40% 3-12 months, ~30% older.
AGE_BANDS = [(0, 30, 0.12), (31, 90, 0.18), (91, 365, 0.40), (366, 730, 0.30)]


def days_ago(rng):
    lo, hi, _ = rng.choices(AGE_BANDS, weights=[b[2] for b in AGE_BANDS])[0]
    return rng.randint(lo, hi)


def board_score(rng, board, level, pct):
    """Native grade for a board: (scale, score). pct is the underlying percentage."""
    if board == "Telangana Board" and level == 10:
        return "cgpa10", f"{min(10.0, round(pct / 9.5, 1)):.1f}"
    if board == "IB" and level == 12:
        return "ib45", str(max(24, min(45, round(pct * 45 / 100))))
    return "percent", str(pct)


def test_value(rng, name, strong):
    kind, top = TESTS[name]
    if kind == "rank":
        return str(max(50, round(60000 * (1 - strong) ** 2 + rng.uniform(0, 3000))))
    if kind == "percentile":
        return f"{max(20.0, min(99.99, 40 + strong * 58 + rng.gauss(0, 8))):.2f}"
    if name == "SAT":
        return str(max(400, min(1600, round((700 + strong * 800 + rng.gauss(0, 80)) / 10) * 10)))
    return str(max(0, min(top, round(top * (0.25 + strong * 0.65 + rng.gauss(0, 0.07))))))


def pick_tests(rng, program, stream, strong):
    names = []
    if stream == "PCM":
        if rng.random() < 0.8:
            names.append("JEE Main")
        if "JEE Main" in names and strong > 0.62 and rng.random() < 0.6:
            names.append("JEE Advanced")
        if rng.random() < 0.2:
            names.append("BITSAT")
        if rng.random() < 0.12:
            names.append("MHT CET")
    if stream == "PCB" and rng.random() < 0.9:
        names.append("NEET UG")
    if program == "bba" and rng.random() < 0.25:
        names.append("IPMAT Indore")
    if stream in ("Commerce", "Humanities") and rng.random() < 0.12:
        names.append("CLAT")
    if program == "bdes":
        if rng.random() < 0.5:
            names.append("UCEED")
        if rng.random() < 0.15:
            names.append("NATA")
    if rng.random() < (0.55 if names else 0.9):
        names.append("CUET UG")
    if rng.random() < 0.06:
        names.append("SAT")
    if not names:
        names.append("CUET UG")
    values = {n: test_value(rng, n, strong) for n in names}
    # JEE Advanced is only open to top JEE Main scorers; its rank follows the JEE Main percentile.
    if "JEE Advanced" in values:
        jee_main = float(values["JEE Main"])
        if jee_main < 90:
            names.remove("JEE Advanced")
            del values["JEE Advanced"]
        else:
            values["JEE Advanced"] = str(max(50, round((100 - jee_main) / 10 * 60000 + rng.uniform(-1500, 1500))))
    parts = [f"{n}={values[n]}" for n in names]
    if rng.random() < 0.06:
        cname, ctop = rng.choice(CUSTOM_TESTS)
        cval = max(0, min(ctop, round(ctop * (0.3 + strong * 0.6 + rng.gauss(0, 0.08)))))
        parts.append(f"{cname}={cval}/{ctop}")
    return ";".join(parts)


def make_student(i, rng, used_emails):
    first = rng.choice(FIRST)
    last = rng.choice(LAST)
    program, program_stream, _ = rng.choices(PROGRAMS, weights=[p[2] for p in PROGRAMS])[0]
    city, km = rng.choice(NEAR_CITIES) if rng.random() < 0.5 else rng.choice(FAR_CITIES)
    strong = rng.betavariate(2, 2.5)

    if program_stream in ("PCM", "Commerce"):
        stream = program_stream if rng.random() < 0.75 else rng.choice(STREAMS)
    else:
        stream = rng.choice(STREAMS)

    class12 = max(45, min(99, round(55 + strong * 40 + rng.gauss(0, 6))))
    class10 = max(45, min(99, round(class12 + rng.uniform(-8, 8))))
    board12 = rng.choices([b[0] for b in BOARDS], weights=[b[1] for b in BOARDS])[0]
    board10 = board12 if board12 != "IB" and rng.random() < 0.8 else rng.choice([b[0] for b in BOARDS if b[0] != "IB"])
    scale10, score10 = board_score(rng, board10, 10, class10)
    scale12, score12 = board_score(rng, board12, 12, class12)
    budget_min = round(rng.uniform(3, 22))
    budget_max = budget_min + round(rng.uniform(2, 8))
    acts = rng.sample(ACTIVITIES, 1 + int(rng.random() * 3))
    if rng.random() < 0.07:
        acts.append(rng.choice(CUSTOM_ACTIVITIES))

    email = f"{first}.{last}".lower()
    n = 1
    while email in used_emails:
        n += 1
        email = f"{first}.{last}{n}".lower()
    used_emails.add(email)

    stage = rng.choices(STAGES, weights=STAGE_WEIGHTS)[0]
    row = {
        "id": f"GR-{100001 + i}",
        "first_name": first,
        "last_name": last,
        "phone": f"+91 9{rng.randint(100000000, 999999999)}",
        "email": f"{email}@gmail.com",
        "city": city,
        "km": km,
        "class10_board": board10,
        "class10_scale": scale10,
        "class10_score": score10,
        "class12_board": board12,
        "class12_scale": scale12,
        "class12_score": score12,
        "stream": stream,
        "tests": pick_tests(rng, program, stream, strong),
        "activities": ";".join(acts),
        "budget_min": budget_min,
        "budget_max": budget_max,
        "program": program,
        "intake": INTAKES[0] if rng.random() < 0.8 else INTAKES[1],
        "stage": stage,
    }
    row.update(activity(rng, STAGES.index(stage)))
    return row


def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 6594
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42
    rng = random.Random(seed)
    used = set()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "admitright-students.csv")
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for i in range(count):
            writer.writerow(make_student(i, rng, used))
    print(f"Wrote {count} students to {out}")


if __name__ == "__main__":
    main()
