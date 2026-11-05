import { loadTestimonialVideo } from './testimonial-media';
export function initialize(scope) {
  const {
    document,
    window,
    location,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame,
    cancelAnimationFrame,
    URL,
    MutationObserver,
    ResizeObserver,
    IntersectionObserver,
    fetch,
  } = scope;
  /**
   * Counselor-collected testimonials (quote, uploaded clip, or YouTube).
   */
  (function () {
    var KEY = 'gradright_testimonials_v2';

    var DEFAULT = [
      {
        id: 't-isha',
        name: 'Isha Menon',
        role: 'Student · Ashoka University',
        photo: '',
        initials: 'IM',
        amber: true,
        kind: 'video',
        text: '',
        video: '',
        youtube: 'NWv1VdDeoRY',
      },
      {
        id: 't-rohan',
        name: 'Rohan Desai',
        role: 'Parent · Cathedral & John Connon',
        photo: '',
        initials: 'RD',
        amber: false,
        kind: 'video',
        text: '',
        video: '',
        youtube: 'Unzc731iCUY',
      },
      {
        id: 't-aarav',
        name: 'Aarav Reddy',
        role: 'Student · IIT Bombay',
        photo: '',
        initials: 'AR',
        amber: true,
        kind: 'text',
        text: 'Priya made reach vs match clear for my parents. We locked two safeties in one session.',
        video: '',
        youtube: '',
      },
      {
        id: 't-meera',
        name: 'Meera Kapoor',
        role: 'Parent · DPS RK Puram',
        photo: '',
        initials: 'MK',
        amber: false,
        kind: 'text',
        text: 'Fee and intake timing were explained without the jargon. We knew what to do next.',
        video: '',
        youtube: '',
      },
      {
        id: 't-ananya',
        name: 'Ananya Rao',
        role: 'Student · University of Toronto',
        photo: '',
        initials: 'AR',
        amber: true,
        kind: 'video',
        text: 'The application plan made every deadline feel manageable. I always knew what to focus on next.',
        video: '',
        youtube: 'ysz5S6PUM-U',
      },
      {
        id: 't-kabir',
        name: 'Kabir Malhotra',
        role: 'Parent · The Doon School',
        photo: '',
        initials: 'KM',
        amber: false,
        kind: 'video',
        text: 'We got clear, practical guidance on universities, costs, and timelines. It made the process easier for our whole family.',
        video: '',
        youtube: 'jNQXAC9IVRw',
      },
      {
        id: 't-sana',
        name: 'Sana Iyer',
        role: 'Student · University of Edinburgh',
        photo: '',
        initials: 'SI',
        amber: true,
        kind: 'video',
        text: 'My essays sound like me, and the feedback helped me explain my goals with confidence.',
        video: '',
        youtube: 'M7lc1UVf-VE',
      },
      {
        id: 't-priya',
        name: 'Priya Nair',
        role: 'Student · NYU',
        photo: '',
        initials: 'PN',
        amber: true,
        kind: 'text',
        text: 'The shortlist finally felt clear. I knew which applications deserved my time.',
        video: '',
        youtube: '',
      },
      {
        id: 't-dev',
        name: 'Dev Shah',
        role: 'Parent · Modern School',
        photo: '',
        initials: 'DS',
        amber: false,
        kind: 'text',
        text: 'We left each meeting with a plan and a realistic view of the costs.',
        video: '',
        youtube: '',
      },
      {
        id: 't-zoya',
        name: 'Zoya Fernandes',
        role: 'Student · King’s College London',
        photo: '',
        initials: 'ZF',
        amber: true,
        kind: 'video',
        text: '',
        video: '',
        youtube: 'M7lc1UVf-VE',
      },
      {
        id: 't-vihaan',
        name: 'Vihaan Kapoor',
        role: 'Student · University of Michigan',
        photo: '',
        initials: 'VK',
        amber: true,
        kind: 'video',
        text: 'The essay feedback helped me keep my own voice while making my story clearer.',
        video: '',
        youtube: 'NWv1VdDeoRY',
      },
      {
        id: 't-nisha',
        name: 'Nisha Verma',
        role: 'Parent · Greenwood High',
        photo: '',
        initials: 'NV',
        amber: false,
        kind: 'video',
        text: 'The timeline and regular check-ins made a complicated process feel manageable.',
        video: '',
        youtube: 'Unzc731iCUY',
      },
    ];

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function initialsFrom(name) {
      var parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!parts.length) return '??';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    function parseYoutubeId(value) {
      var s = String(value || '').trim();
      if (!s) return '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
      var m = s.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|watch\?.*?v=))([a-zA-Z0-9_-]{11})/,
      );
      return m ? m[1] : '';
    }

    function safeLink(value) {
      try {
        var url = new URL(String(value || '').trim());
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
      } catch {
        return '';
      }
    }

    function normalize(item, i) {
      var name = (item && item.name) || 'Student';
      var kind = item && item.kind === 'video' ? 'video' : 'text';
      var youtube = parseYoutubeId((item && (item.youtube || item.video)) || '');
      var video =
        item && item.video && /^(data:video\/|media:)/.test(String(item.video)) ? item.video : '';
      return {
        id: (item && item.id) || 't-' + (i + 1) + '-' + Date.now(),
        name: name,
        role: (item && item.role) || '',
        photo: (item && item.photo) || '',
        initials: (item && item.initials) || initialsFrom(name),
        amber: !!(item && item.amber),
        kind: kind,
        text: (item && item.text) || '',
        video: video,
        youtube: youtube,
        link: safeLink(item && item.link),
      };
    }

    function get() {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length) {
            var existing = saved.map(normalize);
            var ids = new Set(existing.map(function (item) {
              return item.id;
            }));
            return existing.concat(
              DEFAULT.filter(function (item) { return !ids.has(item.id); }).map(normalize),
            );
          }
          if (Array.isArray(saved)) return [];
        }
      } catch (e) {}
      return clone(DEFAULT).map(normalize);
    }

    function set(list) {
      var next = (list || []).map(normalize);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (e) {
        return { ok: false, error: e, items: next };
      }
      return { ok: true, items: next };
    }

    function personEl(item) {
      var person = document.createElement('div');
      person.className = 'testi-person';

      if (item.photo) {
        var wrap = document.createElement('span');
        wrap.className = 'testi-avatar';
        var img = document.createElement('img');
        img.src = item.photo;
        img.alt = '';
        wrap.appendChild(img);
        person.appendChild(wrap);
      } else {
        var av = document.createElement('span');
        av.className = 'avatar' + (item.amber ? ' amber' : '');
        av.textContent = item.initials || initialsFrom(item.name);
        person.appendChild(av);
      }

      var who = document.createElement('div');
      who.className = 'testi-who';
      var name = document.createElement('strong');
      name.textContent = item.name;
      var role = document.createElement('span');
      role.textContent = item.role || '';
      who.appendChild(name);
      who.appendChild(role);
      person.appendChild(who);
      return person;
    }

    function mediaEl(item) {
      if (item.kind === 'video' && item.youtube) {
        var wrap = document.createElement('div');
        wrap.className = 'testi-yt';
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/' + item.youtube;
        iframe.title = (item.name || 'Testimonial') + ' video';
        iframe.setAttribute(
          'allow',
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        );
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');
        wrap.appendChild(iframe);
        return wrap;
      }
      if (item.kind === 'video' && item.video) {
        var vid = document.createElement('video');
        vid.className = 'testi-video';
        vid.controls = true;
        vid.setAttribute('playsinline', '');
        if (item.video.startsWith('media:')) {
          loadTestimonialVideo(item.video)
            .then(function (file) {
              if (file && vid.isConnected) vid.src = URL.createObjectURL(file);
            })
            .catch(function () {
              vid.title = 'Video unavailable. Please upload it again.';
            });
        } else vid.src = item.video;
        return vid;
      }
      if (item.link) {
        if (/\.(mp4|webm|mov)(?:[?#]|$)/i.test(item.link)) {
          var externalVideo = document.createElement('video');
          externalVideo.className = 'testi-video';
          externalVideo.controls = true;
          externalVideo.src = item.link;
          return externalVideo;
        }
        var link = document.createElement('a');
        link.className = 'btn btn-secondary';
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Watch video ↗';
        return link;
      }
      if (item.text) {
        var quote = document.createElement('p');
        quote.className = 'testi-quote';
        quote.textContent = item.text;
        return quote;
      }
      return null;
    }

    function cardEl(item, opts) {
      opts = opts || {};
      var article = document.createElement('article');
      article.className =
        'testi-card' +
        (opts.preview ? ' preview-testi-card' : '') +
        (opts.compact ? ' is-compact' : '') +
        (item.kind === 'video' ? ' is-video' : '');
      article.setAttribute('data-testi-id', item.id);

      var head = document.createElement('div');
      head.className = 'testi-card-head';
      head.appendChild(personEl(item));

      if (opts.actions) {
        var actions = document.createElement('div');
        actions.className = 'testi-actions-menu c-menu-wrap';
        actions.innerHTML =
          '<details><summary aria-label="Testimonial actions" title="Testimonial actions">⋮</summary>' +
          '<div class="c-menu"><button type="button" data-testi-edit>Edit</button>' +
          '<button class="danger" type="button" data-testi-delete>Delete</button></div></details>';
        head.appendChild(actions);
      } else {
        var kind = document.createElement('span');
        kind.className = 'pill';
        kind.textContent =
          item.kind === 'video' ? (item.text ? 'Quote + Video' : 'Video') : 'Quote';
        head.appendChild(kind);
      }

      article.appendChild(head);
      var media = mediaEl(item);
      var hasMedia = !!(item.video || item.youtube || item.link);
      if (media && item.text && hasMedia) {
        var content = document.createElement('div');
        content.className = 'testi-card-content';
        var caption = document.createElement('p');
        caption.className = 'testi-quote';
        caption.textContent = item.text;
        content.appendChild(caption);
        content.appendChild(media);
        article.appendChild(content);
      } else if (media) {
        article.appendChild(media);
      } else if (item.text) {
        var quote = document.createElement('p');
        quote.className = 'testi-quote';
        quote.textContent = item.text;
        article.appendChild(quote);
      }
      return article;
    }

    function renderList(el, opts) {
      if (!el) return get();
      opts = opts || {};
      var items = Array.isArray(opts.items) ? opts.items.map(normalize) : get();
      el.textContent = '';
      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'hint-text';
        empty.textContent = opts.empty || 'No testimonials yet.';
        el.appendChild(empty);
        return items;
      }
      items.forEach(function (item) {
        el.appendChild(cardEl(item, opts));
      });
      return items;
    }

    window.GradRightTestimonials = {
      KEY: KEY,
      DEFAULT: clone(DEFAULT),
      get: get,
      set: set,
      initialsFrom: initialsFrom,
      parseYoutubeId: parseYoutubeId,
      safeLink: safeLink,
      renderList: renderList,
    };
  })();
}
