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
  document.documentElement.classList.add('icons-ready');

  /**
   * GradRight Counselor — demo session
   *
   *   Sign up  → not verified (pending admin)
   *   Log in   → verified (live dashboard)
   */
  (function () {
    const STORAGE_KEY = 'gradright_counselor_session';

    const DEFAULT_PROFILE = {
      name: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
      initials: 'PS',
    };

    function digitsOnly(value) {
      return String(value || '').replace(/\D/g, '');
    }

    /** Last 10 digits — ignores +91 / spaces */
    function normalizePhone(value) {
      const digits = digitsOnly(value);
      if (digits.length >= 10) return digits.slice(-10);
      return digits;
    }

    function formatPhone(value) {
      const d = normalizePhone(value);
      if (d.length !== 10) return value || '';
      return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    }

    function resolveAccount(phone, extras) {
      const key = normalizePhone(phone);
      const extra = extras || {};
      return {
        phone: key,
        phoneDisplay: formatPhone(key),
        verified: extra.verified != null ? !!extra.verified : false,
        name: extra.name || DEFAULT_PROFILE.name,
        email: extra.email || DEFAULT_PROFILE.email,
        emailVerified: extra.emailVerified != null ? !!extra.emailVerified : false,
        addresses: Array.isArray(extra.addresses) ? extra.addresses : [],
        photo: extra.photo || '',
        username: extra.username || '',
        secondaryEmail: extra.secondaryEmail || '',
        communityOriginalName: extra.communityOriginalName || extra.name || DEFAULT_PROFILE.name,
        initials: extra.initials || DEFAULT_PROFILE.initials,
      };
    }

    function get() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.phone) return null;
        return resolveAccount(data.phone, data);
      } catch (e) {
        return null;
      }
    }

    function set(phone, extras) {
      const payload = resolveAccount(phone, extras);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      try {
        sessionStorage.removeItem('gradright_sidebar_html');
        sessionStorage.removeItem('gradright_sidebar_meta');
      } catch (e) {}
      return payload;
    }

    function clear() {
      localStorage.removeItem(STORAGE_KEY);
      try {
        sessionStorage.removeItem('gradright_sidebar_html');
        sessionStorage.removeItem('gradright_sidebar_meta');
      } catch (e) {}
    }

    function isVerified() {
      const s = get();
      return !!(s && s.verified);
    }

    /** Logged in, still waiting on admin approval. No session = live demo. */
    function isPending() {
      const s = get();
      return !!(s && !s.verified);
    }

    window.GradRightSession = {
      DEFAULT_PROFILE,
      normalizePhone,
      formatPhone,
      resolveAccount,
      get,
      set,
      clear,
      isVerified,
      isPending,
    };
  })();

  /** Connect fee from Profile → Services & fee. Dashboard earnings = fee × connects. */
  (function () {
    const KEY = 'gradright_connect_fee';
    const HISTORY_KEY = KEY + '_history';
    const DEFAULT = 1999;
    const MAX = 9900000;

    function get() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw == null || raw === '') return DEFAULT;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return Math.min(MAX, Math.round(n * 100) / 100);
      } catch (e) {}
      return DEFAULT;
    }

    function set(value) {
      if (value === '' || value == null) return get();
      const n = Number(value);
      const fee = Number.isFinite(n) && n > 0 ? Math.min(MAX, Math.round(n * 100) / 100) : DEFAULT;
      const previous = get();
      try {
        localStorage.setItem(KEY, String(fee));
        if (fee !== previous) {
          const history = getHistory();
          history.unshift({ amount: fee, previousAmount: previous, changedAt: new Date().toISOString() });
          localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        }
      } catch (e) {}
      return fee;
    }

    function getHistory() {
      try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        return Array.isArray(history) ? history : [];
      } catch (e) {
        return [];
      }
    }

    function format(value) {
      return '₹' + Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }

    window.GradRightFee = { KEY, HISTORY_KEY, DEFAULT, MAX, get, set, getHistory, format };
  })();

  /** Counselor services on the profile. Each service is one Calendar event type. Students pick one when they book. */
  (function () {
    var KEY = 'gradright_services_v1';
    var DEFAULT = [
      {
        id: 'college-shortlisting',
        title: 'College shortlisting',
        description: 'Reach / match / safety lists for the student’s profile',
      },
      {
        id: 'sop-review',
        title: 'SOP & essay review',
        description: 'Structure, voice, and program-fit feedback',
      },
      {
        id: 'visa-readiness',
        title: 'Visa readiness',
        description: 'Document checklist and interview practice',
      },
      {
        id: 'application-strategy',
        title: 'Application strategy',
        description: 'Build a balanced school list and application timeline',
      },
      {
        id: 'interview-coaching',
        title: 'Interview coaching',
        description: 'Practice interview questions, structure, and delivery',
      },
      {
        id: 'scholarship-planning',
        title: 'Scholarship planning',
        description: 'Identify funding options and organize key deadlines',
      },
      {
        id: 'parent-consultation',
        title: 'Parent consultation',
        description: 'Align family priorities, budget, and next steps',
      },
      {
        id: 'decision-support',
        title: 'Decision and enrollment support',
        description: 'Compare offers and plan the enrollment process',
      },
    ];

    function slugify(text) {
      return (
        String(text || 'service')
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'service'
      );
    }

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function get() {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length) {
            var ids = new Set(saved.map(function (service) {
              return service && service.id;
            }));
            return saved.concat(DEFAULT.filter(function (service) {
              return !ids.has(service.id);
            }));
          }
        }
      } catch (e) {}
      return clone(DEFAULT);
    }

    function set(list) {
      var next = (list || []).map(function (s, i) {
        return {
          id: s.id || slugify(s.title) || 'service-' + (i + 1),
          title: s.title || 'Service',
          description: s.description || '',
        };
      });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (e) {}
      if (window.GradRightCal && GradRightCal.syncEventTypesFromServices) {
        GradRightCal.syncEventTypesFromServices();
      }
      return next;
    }

    window.GradRightServices = { KEY, DEFAULT: clone(DEFAULT), get, set, slugify };
  })();
}
