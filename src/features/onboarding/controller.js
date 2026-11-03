// Route-scoped workflow: subscriptions, timers and generated overlays are
// owned by createRouteScope and disposed when Next navigation leaves this screen.
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

  (function () {
    const s = GradRightSession.get();
    if (s) {
      const phoneEl = document.getElementById('phone');
      if (phoneEl) phoneEl.value = s.phoneDisplay;
      const nameEl = document.getElementById('name');
      if (nameEl && s.name) nameEl.value = s.name;
      const emailEl = document.getElementById('email');
      if (emailEl && s.email) emailEl.value = s.email;
      document.getElementById('review-name').textContent = s.name;
      document.getElementById('review-avatar').textContent = s.initials;
      document.getElementById('review-meta').textContent =
        s.phoneDisplay +
        (s.verified ? ' (admin verified)' : ' (pending admin)') +
        ' · email pending verify';
      document.getElementById('submit-dashboard').href = '/dashboard';
    }
  })();

  var skipBtn = document.getElementById('skip-btn');

  function selectedCountries() {
    return [...document.querySelectorAll('#countries .chip.selected')].map(function (el) {
      return el.textContent.trim();
    });
  }

  function updateReview() {
    var countries = selectedCountries();
    var served = (document.getElementById('students-served') || {}).value;
    var admits = (document.getElementById('admits') || {}).value;
    var parts = [];
    if (countries.length)
      parts.push(
        countries.slice(0, 6).join(', ') +
          (countries.length > 6 ? ' +' + (countries.length - 6) : ''),
      );
    if (served) parts.push(served + ' students served');
    if (admits) parts.push(admits + ' admits');
    document.getElementById('review-background').textContent = parts.length
      ? parts.join(' · ')
      : 'No background added yet';
    var count = (window.uploadedDocs && uploadedDocs.length) || 0;
    document.getElementById('review-docs').textContent = count
      ? count + ' file' + (count === 1 ? '' : 's') + ' ready to submit'
      : 'No documents uploaded yet';
    document.getElementById('review-video').textContent = window.introVideoName
      ? window.introVideoName + ' ready to show on your profile'
      : 'No intro video yet · you can add one later from profile';
  }

  function goStep(n) {
    document.querySelectorAll('.step').forEach((el) => (el.hidden = true));
    document.getElementById('step-' + n).hidden = false;
    document.querySelectorAll('#progress .bar').forEach((bar) => {
      bar.classList.toggle('done', Number(bar.dataset.step) <= n);
    });
    if (skipBtn) {
      skipBtn.hidden = !(n === 2 || n === 3);
      skipBtn.onclick = function () {
        goStep(n === 2 ? 3 : 4);
      };
    }
    if (n === 4) updateReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function verifyEmail() {
    const btn = document.getElementById('verify-email-btn');
    const hint = document.getElementById('email-hint');
    btn.textContent = 'Sent';
    btn.disabled = true;
    hint.innerHTML =
      '<span class="verified-tag">Verification link sent</span> · check inbox (demo)';
    setTimeout(() => {
      hint.innerHTML = '<span class="verified-tag">Email verified</span>';
      btn.textContent = 'Verified';
    }, 1200);
  }

  function addCountry() {
    const input = document.getElementById('custom-country');
    const name = input.value.trim();
    if (!name) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip selected';
    btn.textContent = name;
    btn.onclick = function () {
      this.classList.toggle('selected');
    };
    document.getElementById('countries').appendChild(btn);
    input.value = '';
  }

  const docInput = document.getElementById('doc-input');
  const docList = document.getElementById('doc-list');
  const uploadZone = document.getElementById('upload-zone');
  const uploadedDocs = [];
  window.uploadedDocs = uploadedDocs;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function renderDocs() {
    docList.innerHTML = '';
    uploadedDocs.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'doc-file';

      const icon = document.createElement('span');
      icon.textContent = '📄';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.style.flex = '1';

      const nameEl = document.createElement('strong');
      nameEl.style.fontSize = '0.85rem';
      nameEl.textContent = file.name;

      const sizeEl = document.createElement('span');
      sizeEl.style.fontSize = '0.75rem';
      sizeEl.style.color = 'var(--muted)';
      sizeEl.textContent = formatSize(file.size) + ' · Ready to submit';

      meta.appendChild(nameEl);
      meta.appendChild(document.createElement('br'));
      meta.appendChild(sizeEl);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-ghost btn-sm';
      remove.textContent = 'Remove';
      scope.listen(remove, 'click', () => {
        uploadedDocs.splice(index, 1);
        renderDocs();
      });

      row.appendChild(icon);
      row.appendChild(meta);
      row.appendChild(remove);
      docList.appendChild(row);
    });
  }

  function addFiles(fileList) {
    [...fileList].forEach((file) => {
      const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
      const okSize = file.size <= 10 * 1024 * 1024;
      if (!okType) {
        alert('Only PDF, JPG, or PNG files are allowed.');
        return;
      }
      if (!okSize) {
        alert('"' + file.name + '" is over 10 MB.');
        return;
      }
      if (uploadedDocs.some((f) => f.name === file.name && f.size === file.size)) return;
      uploadedDocs.push(file);
    });
    renderDocs();
  }

  scope.listen(uploadZone, 'click', () => docInput.click());
  scope.listen(uploadZone, 'keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      docInput.click();
    }
  });
  scope.listen(docInput, 'change', () => {
    if (docInput.files && docInput.files.length) addFiles(docInput.files);
    docInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    scope.listen(uploadZone, evt, (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = 'var(--brand)';
      uploadZone.style.background = 'var(--brand-soft)';
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    scope.listen(uploadZone, evt, (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '';
      uploadZone.style.background = '';
    });
  });
  scope.listen(uploadZone, 'drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  const videoInput = document.getElementById('video-input');
  const videoZone = document.getElementById('video-zone');
  const videoPreview = document.getElementById('video-preview');
  const videoEl = document.getElementById('video-preview-el');
  const videoName = document.getElementById('video-preview-name');
  const videoMeta = document.getElementById('video-preview-meta');
  let introVideoUrl = null;
  window.introVideoName = '';

  function renderIntroVideo(file) {
    if (introVideoUrl) {
      videoZone.hidden = true;
      videoPreview.hidden = false;
      if (videoEl.src !== introVideoUrl) videoEl.src = introVideoUrl;
      videoName.textContent = file ? file.name : window.introVideoName || 'intro.mp4';
      videoMeta.textContent = file
        ? formatSize(file.size) + ' · Ready · you can change this later from profile'
        : 'Ready · you can change this later from profile';
    } else {
      videoZone.hidden = false;
      videoPreview.hidden = true;
      videoEl.removeAttribute('src');
      videoEl.load();
    }
  }

  function acceptIntroVideo(file) {
    const type = String(file.type || '').split(';')[0];
    const okType =
      /^video\/(mp4|webm|quicktime|x-m4v)$/i.test(type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (!okType) {
      alert('Please choose an MP4, MOV, or WEBM video.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Intro video must be under 50 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    let settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      if (!ok) {
        URL.revokeObjectURL(url);
        alert('Intro video should be 2 minutes or shorter.');
        return;
      }
      if (introVideoUrl && introVideoUrl.startsWith('blob:')) URL.revokeObjectURL(introVideoUrl);
      introVideoUrl = url;
      window.introVideoName = file.name;
      renderIntroVideo(file);
    }
    probe.onloadedmetadata = function () {
      const seconds = probe.duration;
      finish(!(Number.isFinite(seconds) && seconds > 120));
    };
    probe.onerror = function () {
      finish(true);
    };
    probe.src = url;
  }

  function openVideoPicker() {
    videoInput.click();
  }

  function openIntroRecorder() {
    if (!window.GradRightIntroRecorder) {
      openVideoPicker();
      return;
    }
    GradRightIntroRecorder.open({
      onSave: acceptIntroVideo,
      onUpload: openVideoPicker,
    });
  }

  scope.listen(document.getElementById('video-upload-btn'), 'click', openVideoPicker);
  scope.listen(document.getElementById('video-record-btn'), 'click', openIntroRecorder);
  scope.listen(document.getElementById('video-record-again'), 'click', openIntroRecorder);
  scope.listen(document.getElementById('video-change'), 'click', openVideoPicker);
  scope.listen(document.getElementById('video-remove'), 'click', () => {
    if (introVideoUrl && introVideoUrl.startsWith('blob:')) URL.revokeObjectURL(introVideoUrl);
    introVideoUrl = null;
    window.introVideoName = '';
    videoInput.value = '';
    renderIntroVideo(null);
  });
  scope.listen(videoInput, 'change', () => {
    const file = videoInput.files && videoInput.files[0];
    videoInput.value = '';
    if (file) acceptIntroVideo(file);
  });
  ['dragenter', 'dragover'].forEach((evt) => {
    scope.listen(videoZone, evt, (e) => {
      e.preventDefault();
      videoZone.classList.add('is-drag');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    scope.listen(videoZone, evt, (e) => {
      e.preventDefault();
      videoZone.classList.remove('is-drag');
    });
  });
  scope.listen(videoZone, 'drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files[0]) acceptIntroVideo(e.dataTransfer.files[0]);
  });

  window.goStep = goStep;
  window.addCountry = addCountry;
  window.verifyEmail = verifyEmail;
}
