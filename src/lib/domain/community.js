export const AUTHORS = {
  'Rohan Kulkarni': {
    type: 'counselor',
    initials: 'RK',
    amber: false,
    role: 'Counselor · Canada pathways',
    bio: 'Helps students with SDS timelines, college shortlists, and attestation routes across Canada.',
    followers: 312,
    following: 64,
  },
  'Ananya Lal': {
    type: 'counselor',
    initials: 'AL',
    amber: true,
    role: 'Counselor · SOP craft',
    bio: 'Guides students on story-led SOPs for UK and US masters applications.',
    followers: 520,
    following: 88,
  },
  'Priya Sharma': {
    type: 'counselor',
    initials: 'PS',
    amber: false,
    role: 'You · GradRight counselor',
    bio: 'Your counselor profile on GradRight Community.',
    followers: 62,
    following: 40,
  },
  'Aarav Reddy': {
    type: 'student',
    initials: 'AR',
    amber: false,
    role: 'Student · USA · CS Masters',
    bio: 'Building a California shortlist and working on SOP drafts with GradRight counselors.',
    followers: 11,
    following: 18,
  },
  'Jia Das': {
    type: 'student',
    initials: 'JD',
    amber: true,
    role: 'Student · Australia · CS',
    bio: 'Preparing Australian CS masters applications and visa timing questions.',
    followers: 24,
    following: 31,
  },
  'Meera Kapoor': {
    type: 'student',
    initials: 'MK',
    amber: true,
    role: 'Student · UK · Business',
    bio: 'Targeting Warwick and LSE, looking for SOP and interview advice.',
    followers: 9,
    following: 22,
  },
  'Tanvi Nanda': {
    type: 'student',
    initials: 'TN',
    amber: false,
    role: 'Student · Canada · Design',
    bio: 'Comparing design schools and portfolio routes for winter intake.',
    followers: 15,
    following: 27,
  },
  'Dr. Helen Park': {
    type: 'professor',
    initials: 'HP',
    amber: false,
    role: 'Professor · Stanford CS',
    bio: 'Shares occasional notes on research fit and lab matching for CS applicants.',
    followers: 890,
    following: 12,
  },
  'Prof. James Okonkwo': {
    type: 'professor',
    initials: 'JO',
    amber: true,
    role: 'Professor · UCL Bartlett',
    bio: 'Architecture admissions insights for portfolio-led applications.',
    followers: 640,
    following: 19,
  },
};

export const posts = [
  {
    id: 'priya-planning',
    author: 'Priya Sharma',
    time: '1d ago',
    tag: 'Application planning',
    following: false,
    saved: false,
    liked: false,
    disliked: false,
    likes: 12,
    dislikes: 0,
    body: 'Before you shortlist universities, write down your goals, budget and preferred course structure. A balanced list starts with what matters to you.',
    comments: [],
    image: '/assets/university-campus.png',
    imageAlt: 'University campus building surrounded by trees',
  },
  {
    id: 'priya-sop',
    author: 'Priya Sharma',
    time: '2d ago',
    tag: 'SOP tips',
    following: false,
    saved: false,
    liked: false,
    disliked: false,
    likes: 19,
    dislikes: 0,
    body: 'Your SOP should connect what you have done with what you want to learn next. Choose two specific experiences and explain what changed your thinking.',
    comments: [],
  },
  {
    id: 'priya-deadlines',
    author: 'Priya Sharma',
    time: '3d ago',
    tag: 'Application planning',
    following: false,
    saved: false,
    liked: false,
    disliked: false,
    likes: 26,
    dislikes: 0,
    body: 'Working toward the next intake? Keep transcripts, references and test results in one checklist. Give your referees enough time and check each university\u2019s requirements.',
    comments: [],
  },
  {
    id: 'p4',
    author: 'Aarav Reddy',
    time: '3d ago',
    tag: 'US STEM',
    following: true,
    saved: false,
    liked: false,
    disliked: false,
    likes: 19,
    dislikes: 1,
    body: 'How many safety schools should I keep if I only want California CS programs? My counselor suggested adding Midwest options but I am unsure how far to stretch.',
    comments: [
      {
        id: 'c7',
        author: 'Rohan Kulkarni',
        time: '3d ago',
        text: 'If funding is not locked, keep at least two non-California safeties. Reach-only California lists get stressful fast in this cycle.',
        replies: [
          {
            id: 'r7',
            author: 'Dr. Helen Park',
            time: '2d ago',
            text: 'Agreed from the faculty side. Research fit matters, but a realistic backup set protects students when admits cluster late.',
          },
        ],
      },
    ],
  },
  {
    id: 'p1',
    author: 'Rohan Kulkarni',
    time: '2h ago',
    tag: 'Canada pathways',
    following: true,
    saved: false,
    liked: false,
    disliked: false,
    likes: 24,
    dislikes: 2,
    body: 'Students applying for fall Canada intake: what is blocking you right now? SDS timeline, proof of funds format, or study plan? Reply with your stage and I will share the checklist piece that usually unblocks it.',
    comments: [
      {
        id: 'c1',
        author: 'Aarav Reddy',
        time: '1h ago',
        text: 'Proof of funds. My bank letter looks different from samples counselors share. Not sure if it will pass.',
        replies: [
          {
            id: 'r1',
            author: 'Rohan Kulkarni',
            time: '45m ago',
            text: 'Send the format your bank uses (no account numbers in public). Usually the issue is missing average balance language, not the letterhead.',
          },
          {
            id: 'r2',
            author: 'Jia Das',
            time: '30m ago',
            text: 'Same issue last month. Once the average-balance line was added, my counselor said it looked fine.',
          },
        ],
      },
      {
        id: 'c2',
        author: 'Tanvi Nanda',
        time: '50m ago',
        text: 'Study plan. I keep rewriting the same paragraph about why Canada.',
        replies: [],
      },
    ],
  },
  {
    id: 'p2',
    author: 'Meera Kapoor',
    time: 'Yesterday',
    tag: 'SOP help',
    following: false,
    saved: true,
    liked: true,
    disliked: false,
    likes: 41,
    dislikes: 1,
    body: 'Stuck on the "why this program" section for Warwick Business. Everything I write sounds generic. Has anyone found a simple structure that still feels personal?',
    comments: [
      {
        id: 'c3',
        author: 'Ananya Lal',
        time: 'Yesterday',
        text: 'Try this: one specific module or faculty theme, one past project of yours, one sentence on what you will contribute. Keep the first sentence under 25 words.',
        replies: [
          {
            id: 'r3',
            author: 'Meera Kapoor',
            time: '20h ago',
            text: 'That helped. Drafted it around the Behavioural Science module and it finally sounds like me.',
          },
        ],
      },
      {
        id: 'c4',
        author: 'Aarav Reddy',
        time: '18h ago',
        text: 'I used the same pattern for a CS SOP. Naming one lab made a big difference.',
        replies: [],
      },
      {
        id: 'c4b',
        author: 'Priya Sharma',
        time: '16h ago',
        text: 'Strong approach. If Warwick is the goal, name one module and one outcome from your past internship in the same breath.',
        replies: [
          {
            id: 'r3b',
            author: 'Meera Kapoor',
            time: '15h ago',
            text: 'Doing that now. Thank you Priya.',
          },
        ],
      },
    ],
  },
  {
    id: 'p3',
    author: 'Ananya Lal',
    time: '2d ago',
    tag: 'SOP craft',
    following: false,
    saved: false,
    liked: false,
    disliked: false,
    likes: 36,
    dislikes: 0,
    body: 'For students drafting SOPs this week: drop one sentence from your current opening below. I will reply with a tighter version that keeps your voice. No full essays in comments please, just the opening line.',
    comments: [
      {
        id: 'c5',
        author: 'Jia Das',
        time: '2d ago',
        text: 'Ever since my internship in Melbourne, I have been passionate about computer science and want to study in Australia.',
        replies: [
          {
            id: 'r4',
            author: 'Ananya Lal',
            time: '2d ago',
            text: 'Try: During my Melbourne internship I shipped a ranking feature that cut support tickets by 18%, and I want a CS masters that deepens that systems work.',
          },
          {
            id: 'r5',
            author: 'Jia Das',
            time: '1d ago',
            text: 'Much clearer. Thank you.',
          },
        ],
      },
      {
        id: 'c6',
        author: 'Tanvi Nanda',
        time: '1d ago',
        text: 'Design has always been my passion and I want to study in Canada to grow as a creative.',
        replies: [
          {
            id: 'r6',
            author: 'Prof. James Okonkwo',
            time: '1d ago',
            text: 'Lead with one portfolio project and the critique question it left you with. Passion lines alone rarely help admissions readers.',
          },
        ],
      },
    ],
  },
  {
    id: 'p5',
    author: 'Tanvi Nanda',
    time: '4d ago',
    tag: 'Portfolio',
    following: false,
    saved: false,
    liked: false,
    disliked: false,
    likes: 27,
    dislikes: 2,
    body: 'For design portfolios, is UCAS still worth it or should I apply direct to schools that want a custom brief? I have five projects and one is unfinished.',
    comments: [
      {
        id: 'c8',
        author: 'Prof. James Okonkwo',
        time: '4d ago',
        text: 'If a school asks for a custom brief, go direct. Use UCAS when you want one deadline rhythm across several equal options. Finish the fifth project enough to show process, even if the final polish is light.',
        replies: [
          {
            id: 'r8',
            author: 'Tanvi Nanda',
            time: '3d ago',
            text: 'That settles it. Direct for two schools, UCAS for the rest.',
          },
        ],
      },
    ],
  },
  {
    id: 'p6',
    author: 'Jia Das',
    time: '5d ago',
    tag: 'Visa timing',
    following: true,
    saved: true,
    liked: false,
    disliked: false,
    likes: 14,
    dislikes: 0,
    body: 'Should I book my Australia medical before the CoE arrives? Friends say yes to save time, but I am worried about the window expiring.',
    comments: [
      {
        id: 'c9',
        author: 'Ananya Lal',
        time: '5d ago',
        text: 'Wait until offer and deposit sequencing is clear. I have seen students lose medical slots when CoE lagged. Build a 10-day buffer into your tracker.',
        replies: [
          {
            id: 'r9',
            author: 'Jia Das',
            time: '4d ago',
            text: 'Got it. Holding off and updating my timeline.',
          },
          {
            id: 'r10',
            author: 'Meera Kapoor',
            time: '4d ago',
            text: 'Saving this. Same question for my UK timeline later.',
          },
        ],
      },
    ],
  },
];

// Seed counselor replies across the existing community conversations.
posts
  .filter((post) => post.author !== 'Priya Sharma')
  .slice(0, 3)
  .forEach((post, index) => {
    post.comments.push({
      id: `priya-guidance-${index}`,
      author: 'Priya Sharma',
      time: '1d ago',
      text: [
        'Start with course fit, then compare costs and entry requirements. Keep a balanced mix of options so you have choices when decisions arrive.',
        'Make a checklist for each university. Requirements and timelines vary, so confirm them on the university’s admissions page before you submit.',
        'Use a concrete example from your experience, explain what you learned, and connect it to the course you want to study.',
      ][index],
      replies: [],
    });
  });

export const socialGraph = {};

export function updateCommunityIdentity(previousName, name, username) {
  const existing = AUTHORS[previousName];
  if (previousName !== name) {
    if (existing) {
      AUTHORS[name] = { ...existing };
      delete AUTHORS[previousName];
    }
    if (socialGraph[previousName]) {
      socialGraph[name] = socialGraph[previousName];
      delete socialGraph[previousName];
    }
    Object.values(socialGraph).forEach((graph) => {
      for (const kind of ['followers', 'following']) {
        graph[kind] = graph[kind].map((person) => (person === previousName ? name : person));
      }
    });
    posts.forEach((post) => {
      if (post.author === previousName) post.author = name;
      post.comments.forEach((comment) => {
        if (comment.author === previousName) comment.author = name;
        (comment.replies || []).forEach((reply) => {
          if (reply.author === previousName) reply.author = name;
        });
      });
    });
  }
  buildSocialGraph(name);
  AUTHORS[name].username = username || AUTHORS[name].username;
  AUTHORS[name].initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function buildSocialGraph(meName) {
  AUTHORS[meName] ||= {
    type: 'counselor',
    initials: meName
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join(''),
    role: 'You · GradRight counselor',
    bio: 'Your counselor profile on GradRight Community.',
  };
  const names = Object.keys(AUTHORS);
  if (socialGraph[meName]) return;
  names.forEach(function (name, idx) {
    if (socialGraph[name]) return;
    const followers = names
      .filter(function (n) {
        return n !== name;
      })
      .slice(idx % 3, (idx % 3) + 4 + (idx % 2));
    const following = names
      .filter(function (n) {
        return n !== name;
      })
      .slice((idx + 2) % 4, ((idx + 2) % 4) + 3 + (idx % 3));
    // ensure me has a solid demo network
    if (name === meName) {
      socialGraph[name] = {
        followers: [
          'Aarav Reddy',
          'Jia Das',
          'Meera Kapoor',
          'Tanvi Nanda',
          'Rohan Kulkarni',
        ].filter(Boolean),
        following: [
          'Rohan Kulkarni',
          'Ananya Lal',
          'Dr. Helen Park',
          'Jia Das',
          'Meera Kapoor',
        ].filter(Boolean),
      };
    } else {
      socialGraph[name] = { followers: followers, following: following };
    }
    // sync counts
    AUTHORS[name].followers = socialGraph[name].followers.length;
    AUTHORS[name].following = socialGraph[name].following.length;
  });
}
