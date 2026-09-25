(function () {
  const MAX_SECONDS = 120;

  let opts = null;
  let stream = null;
  let recorder = null;
  let chunks = [];
  let recordedBlob = null;
  let recordedUrl = null;
  let tick = null;
  let startedAt = 0;
  let phase = 'idle';

  function $(id) {
    return document.getElementById(id);
  }

  function pickMime() {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (let i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return '';
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function ensureModal() {
    if ($('intro-record-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'intro-record-modal';
    wrap.className = 'intro-record-overlay';
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="intro-record-sheet" role="dialog" aria-modal="true" aria-labelledby="intro-record-title">' +
      '<button type="button" class="btn btn-ghost btn-sm intro-record-close" id="intro-record-close" aria-label="Close recorder">✕</button>' +
      '<h3 id="intro-record-title">Record intro video</h3>' +
      '<p class="hint-text" id="intro-record-hint">Allow camera and microphone when the browser asks. Up to 2 minutes.</p>' +
      '<div class="intro-record-stage">' +
      '<video id="intro-record-live" autoplay muted playsinline></video>' +
      '<video id="intro-record-play" controls playsinline hidden></video>' +
      '<div class="intro-record-status" id="intro-record-status">Starting camera…</div>' +
      '</div>' +
      '<div class="intro-record-meter">' +
      '<span id="intro-record-dot" hidden></span>' +
      '<strong id="intro-record-timer">0:00</strong>' +
      '<span>/ 2:00</span>' +
      '</div>' +
      '<div class="intro-record-actions" id="intro-record-actions"></div>' +
      '</div>';
    document.body.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) close();
    });
    $('intro-record-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('intro-record-modal').hidden) close();
    });
  }

  function setHint(text) {
    $('intro-record-hint').textContent = text;
  }

  function setStatus(text, show) {
    const el = $('intro-record-status');
    el.textContent = text || '';
    el.hidden = !show;
  }

  function setActions(buttons) {
    const row = $('intro-record-actions');
    row.innerHTML = '';
    buttons.forEach(function (b) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = b.primary ? 'btn btn-primary' : 'btn btn-secondary';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      row.appendChild(btn);
    });
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    const live = $('intro-record-live');
    if (live) live.srcObject = null;
  }

  function clearTick() {
    if (tick) {
      clearInterval(tick);
      tick = null;
    }
  }

  function clearRecorded() {
    recordedBlob = null;
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrl = null;
    }
    const play = $('intro-record-play');
    if (play) {
      play.removeAttribute('src');
      play.load();
    }
  }

  function showLive(on) {
    $('intro-record-live').hidden = !on;
    $('intro-record-play').hidden = on;
  }

  function setDot(on) {
    $('intro-record-dot').hidden = !on;
  }

  function setTimer(seconds) {
    $('intro-record-timer').textContent = formatTime(seconds);
  }

  function renderIdle() {
    phase = 'ready';
    setHint('Look at the camera and keep it short. Students see this on your profile.');
    setStatus('', false);
    setDot(false);
    setTimer(0);
    showLive(true);
    setActions([
      { label: 'Start recording', primary: true, onClick: startRecording },
      { label: 'Cancel', primary: false, onClick: close },
    ]);
  }

  function localHttpUrl() {
    const page = (location.pathname.split('/').pop() || 'profile.html');
    return 'http://127.0.0.1:8765/' + page;
  }

  function isFilePage() {
    return location.protocol === 'file:';
  }

  function renderDenied(message, extra) {
    extra = extra || {};
    phase = 'denied';
    stopTracks();
    showLive(true);
    setStatus(message, true);
    setHint(extra.hint || 'Camera or microphone access is needed to record. You can also upload a file instead.');
    setDot(false);
    const actions = [];
    if (extra.openLocal) {
      actions.push({
        label: 'Open on localhost',
        primary: true,
        onClick: function () {
          location.href = extra.openLocal;
        },
      });
    } else {
      actions.push({ label: 'Try again', primary: true, onClick: startCamera });
    }
    actions.push({
      label: 'Upload instead',
      primary: false,
      onClick: function () {
        close();
        if (opts && typeof opts.onUpload === 'function') opts.onUpload();
      },
    });
    setActions(actions);
  }

  function renderRecording() {
    phase = 'recording';
    setHint('Recording… you can stop anytime. Auto-stops at 2 minutes.');
    setStatus('', false);
    setDot(true);
    showLive(true);
    setActions([
      { label: 'Stop recording', primary: true, onClick: stopRecording },
      { label: 'Cancel', primary: false, onClick: close },
    ]);
  }

  function renderReview() {
    phase = 'review';
    setHint('Play it back. Use this clip, or record again.');
    setStatus('', false);
    setDot(false);
    showLive(false);
    const play = $('intro-record-play');
    play.src = recordedUrl;
    setActions([
      { label: 'Use this video', primary: true, onClick: useRecording },
      { label: 'Record again', primary: false, onClick: retake },
    ]);
  }

  function startCamera() {
    phase = 'starting';
    setStatus('Asking for camera and microphone…', true);
    setHint('Allow camera and microphone when the browser asks. Up to 2 minutes.');
    setActions([]);
    if (isFilePage()) {
      renderDenied(
        'Chrome blocks camera on a file:// page. Open this screen from localhost, then Allow when asked.',
        {
          hint: 'Use http://127.0.0.1:8765 — recording cannot run from a saved HTML file.',
          openLocal: localHttpUrl(),
        }
      );
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      renderDenied('This browser cannot record video. Upload a file instead.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then(function (next) {
        stream = next;
        const live = $('intro-record-live');
        live.srcObject = stream;
        live.play().catch(function () {});
        renderIdle();
      })
      .catch(function (err) {
        const name = err && err.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          renderDenied('Camera or microphone was blocked. Allow access in the browser to record.');
          return;
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          renderDenied('No camera or microphone was found on this device.');
          return;
        }
        renderDenied('Could not start the camera. Check permissions, or upload a file instead.');
      });
  }

  function startRecording() {
    if (!stream || !window.MediaRecorder) {
      renderDenied('Recording is not supported in this browser. Upload a file instead.');
      return;
    }
    chunks = [];
    clearRecorded();
    const mime = pickMime();
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      renderDenied('Could not start the recorder. Upload a file instead.');
      return;
    }
    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onstop = function () {
      const type = (recorder && recorder.mimeType) || (chunks[0] && chunks[0].type) || 'video/webm';
      recordedBlob = new Blob(chunks, { type: type });
      recordedUrl = URL.createObjectURL(recordedBlob);
      renderReview();
    };
    recorder.start(250);
    startedAt = Date.now();
    setTimer(0);
    clearTick();
    tick = setInterval(function () {
      const elapsed = (Date.now() - startedAt) / 1000;
      setTimer(elapsed);
      if (elapsed >= MAX_SECONDS) stopRecording();
    }, 200);
    renderRecording();
  }

  function stopRecording() {
    clearTick();
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    recorder = null;
  }

  function retake() {
    clearRecorded();
    setTimer(0);
    if (stream) {
      renderIdle();
      return;
    }
    startCamera();
  }

  function useRecording() {
    if (!recordedBlob || !opts || typeof opts.onSave !== 'function') {
      close();
      return;
    }
    const type = recordedBlob.type || 'video/webm';
    const ext = type.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    const file = new File([recordedBlob], 'intro-recording.' + ext, { type: type });
    const save = opts.onSave;
    close();
    save(file);
  }

  function close() {
    clearTick();
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (e) {}
    }
    recorder = null;
    stopTracks();
    clearRecorded();
    phase = 'idle';
    const modal = $('intro-record-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('intro-record-open');
    opts = null;
  }

  function open(nextOpts) {
    opts = nextOpts || {};
    ensureModal();
    setTimer(0);
    setDot(false);
    showLive(true);
    $('intro-record-modal').hidden = false;
    document.body.classList.add('intro-record-open');
    startCamera();
  }

  window.GradRightIntroRecorder = {
    open: open,
    close: close,
  };
})();
