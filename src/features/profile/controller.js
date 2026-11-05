import { saveTestimonialVideo, loadTestimonialVideo } from '@/lib/domain/testimonial-media';
import { readPublicIdentity, savePublicIdentity } from '@/lib/domain/public-identity';
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

  window.GradRightProfileDirty = window.GradRightProfileDirty || {};
  window.GradRightProfileDirty.refresh = function (mode) {
    const fn = window.GradRightProfileDirty[mode];
    if (typeof fn === 'function') {
      fn();
      return;
    }
    const bar = document.getElementById('unsaved-bar');
    if (bar) bar.hidden = true;
    document.body.classList.remove('has-unsaved');
  };

  function showProfileTab(mode) {
    const panels = {
      edit: document.getElementById('panel-edit'),
      services: document.getElementById('panel-services'),
      testimonials: document.getElementById('panel-testimonials'),
      preview: document.getElementById('panel-preview'),
    };
    Object.keys(panels).forEach(function (key) {
      if (panels[key]) panels[key].hidden = key !== mode;
    });
    document.querySelectorAll('[data-profile-tab]').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-profile-tab') === mode);
    });
    const cal = document.getElementById('tab-calendar');
    if (cal) cal.classList.remove('active');
    const bar = document.getElementById('unsaved-bar');
    if (bar && mode === 'preview') {
      bar.hidden = true;
      document.body.classList.remove('has-unsaved');
      return;
    }
    const dirty = window.GradRightProfileDirty;
    if (dirty && typeof dirty.refresh === 'function') dirty.refresh(mode);
  }

  document.querySelectorAll('[data-profile-tab]').forEach(function (tab) {
    scope.listen(tab, 'click', function () {
      showProfileTab(tab.getAttribute('data-profile-tab'));
    });
  });

  (function bootProfileTabs() {
    const tab = new URLSearchParams(location.search).get('tab') || 'edit';
    if (tab === 'calendar') {
      location.replace('/calendar');
      return;
    }
    if (tab === 'services' || tab === 'testimonials' || tab === 'preview' || tab === 'edit')
      showProfileTab(tab);
    else showProfileTab('edit');
  })();

  (function bindServices() {
    const fee = document.getElementById('fee');
    const feeDisplay = document.getElementById('fee-display');
    if (fee) {
      function persistFee(value) {
        if (window.GradRightFee) return GradRightFee.set(value);
        if (value === '' || value == null) return 1999;
        const n = Math.round(Number(value));
        if (!Number.isFinite(n) || n < 0) return 1999;
        try {
          localStorage.setItem('gradright_connect_fee', String(n));
        } catch (e) {}
        return n;
      }
      const current = window.GradRightFee
        ? GradRightFee.get()
        : (function () {
            try {
              const n = Number(localStorage.getItem('gradright_connect_fee'));
              if (Number.isFinite(n) && n >= 0) return n;
            } catch (e) {}
            return Number(fee.value || 1999);
          })();
      fee.value = current;
      function paintFee(n) {
        const label = window.GradRightFee
          ? GradRightFee.format(n)
          : '₹' + Number(n || 0).toLocaleString('en-IN');
        if (feeDisplay) feeDisplay.textContent = label;
        document.querySelectorAll('.fee').forEach(function (el) {
          el.textContent = label + ' connect';
        });
        document.querySelectorAll('[data-connect-fee]').forEach(function (el) {
          el.textContent = label;
        });
      }
      paintFee(current);
      let savedFee = current;
      scope.listen(fee, 'input', function () {
        const n = Math.round(Number(fee.value));
        paintFee(Number.isFinite(n) && n >= 0 ? n : savedFee);
        markServicesDirty();
      });
      fee._savedFee = function () {
        return savedFee;
      };
      fee._commitFee = function () {
        savedFee = persistFee(fee.value);
        fee.value = savedFee;
        paintFee(savedFee);
        return savedFee;
      };
      fee._restoreFee = function () {
        fee.value = savedFee;
        paintFee(savedFee);
      };
    }
    const toggle = document.getElementById('toggle-new-service');
    const form = document.getElementById('new-service');
    const serviceDialog = document.getElementById('service-dialog');
    const nameInput = document.getElementById('service-name');
    const descInput = document.getElementById('service-desc');
    const list = document.getElementById('service-list');
    const unsavedBar = document.getElementById('unsaved-bar');
    const saveBtn = document.getElementById('save-btn');
    const discardBtn = document.getElementById('discard-btn');
    let editing = null;
    let services = window.GradRightServices ? GradRightServices.get() : [];
    let savedServices = JSON.stringify(services);

    function serviceCard(s) {
      return (
        '<article class="service" data-service-id="' +
        s.id +
        '"><div class="service-row"><div><h3></h3><p class="service-teaser"></p></div>' +
        '<div class="service-actions">' +
        '<button class="btn btn-secondary btn-sm" type="button" data-service-edit>Edit</button>' +
        '<button class="btn btn-danger btn-sm" type="button" data-service-delete>Delete</button>' +
        '</div></div></article>'
      );
    }

    function paintPreviewServices() {
      const names = (services || [])
        .map(function (s) {
          return (s && s.title) || '';
        })
        .filter(Boolean);
      const items = names.length
        ? names
        : ['College shortlisting', 'SOP & essay review', 'Visa readiness'];
      document.querySelectorAll('[data-preview-services]').forEach(function (el) {
        el.textContent = '';
        items.forEach(function (title) {
          const pill = document.createElement('span');
          pill.className = 'pill';
          pill.textContent = title;
          el.appendChild(pill);
        });
      });
    }

    function paintServices() {
      if (!list) return;
      list.innerHTML = services.map(serviceCard).join('');
      Array.prototype.forEach.call(list.querySelectorAll('.service'), function (card, i) {
        const s = services[i];
        if (!s) return;
        card.querySelector('h3').textContent = s.title;
        card.querySelector('.service-teaser').textContent = s.description;
      });
      paintPreviewServices();
    }

    paintServices();

    function serviceFormDirty() {
      if (!form || !form.classList.contains('open')) return false;
      const name = (nameInput && nameInput.value.trim()) || '';
      const desc = (descInput && descInput.value.trim()) || '';
      if (!editing) return !!(name || desc);
      const origName = ((editing.querySelector('h3') || {}).textContent || '').trim();
      const origDesc = ((editing.querySelector('.service-teaser') || {}).textContent || '').trim();
      return name !== origName || desc !== origDesc;
    }

    function markServicesDirty() {
      const panel = document.getElementById('panel-services');
      if (panel && panel.hidden) return false;
      const feeEl = document.getElementById('fee');
      const feeChanged =
        feeEl && feeEl._savedFee ? Number(feeEl.value) !== Number(feeEl._savedFee()) : false;
      const listChanged = JSON.stringify(services) !== savedServices;
      const dirty = feeChanged || listChanged || serviceFormDirty();
      if (unsavedBar) unsavedBar.hidden = !dirty;
      document.body.classList.toggle('has-unsaved', dirty);
      return dirty;
    }
    window.GradRightProfileDirty.services = markServicesDirty;

    function closeServiceForm() {
      editing = null;
      if (form) form.classList.remove('open');
      serviceDialog?.close();
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      markServicesDirty();
    }

    function openServiceForm(card) {
      editing = card || null;
      if (nameInput)
        nameInput.value = card ? (card.querySelector('h3') || {}).textContent || '' : '';
      if (descInput)
        descInput.value = card
          ? (card.querySelector('.service-teaser') || {}).textContent || ''
          : '';
      if (form) form.classList.add('open');
      const title = document.getElementById('service-dialog-title');
      if (title) title.textContent = card ? 'Edit service' : 'New service';
      const applyButton = document.getElementById('service-dialog-apply');
      if (applyButton) applyButton.textContent = card ? 'Save changes' : 'Create service';
      serviceDialog?.showModal();
      if (nameInput) nameInput.focus();
      markServicesDirty();
    }

    function commitServiceForm() {
      if (!form || !form.classList.contains('open') || !list) return true;
      const name = (nameInput && nameInput.value.trim()) || '';
      const desc = (descInput && descInput.value.trim()) || '';
      if (!name && !desc) {
        closeServiceForm();
        return true;
      }
      if (!name) {
        if (nameInput) nameInput.focus();
        return false;
      }
      if (editing) {
        const id = editing.getAttribute('data-service-id');
        services = services.map(function (s) {
          if (s.id !== id) return s;
          return { id: s.id, title: name, description: desc };
        });
      } else {
        const slug = window.GradRightServices
          ? GradRightServices.slugify(name)
          : name.toLowerCase().replace(/\s+/g, '-');
        let id = slug;
        if (
          services.some(function (s) {
            return s.id === id;
          })
        )
          id = slug + '-' + Date.now().toString(36);
        services.push({ id: id, title: name, description: desc });
      }
      paintServices();
      editing = null;
      form.classList.remove('open');
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      return true;
    }

    scope.listen(document.getElementById('service-dialog-cancel'), 'click', closeServiceForm);
    let startedOutsideServiceDialog = false;
    function outsideServiceDialog(event) {
      const bounds = serviceDialog.getBoundingClientRect();
      return (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      );
    }
    scope.listen(serviceDialog, 'pointerdown', function (event) {
      startedOutsideServiceDialog = event.target === serviceDialog && outsideServiceDialog(event);
    });
    scope.listen(serviceDialog, 'click', function (event) {
      if (
        startedOutsideServiceDialog &&
        event.target === serviceDialog &&
        outsideServiceDialog(event) &&
        !serviceFormDirty()
      )
        closeServiceForm();
      startedOutsideServiceDialog = false;
    });
    scope.listen(serviceDialog, 'cancel', function (event) {
      event.preventDefault();
      closeServiceForm();
    });
    scope.listen(document.getElementById('service-dialog-apply'), 'click', function () {
      if (commitServiceForm()) {
        serviceDialog?.close();
        markServicesDirty();
      }
    });
    if (toggle && form) {
      scope.listen(toggle, 'click', function () {
        if (form.classList.contains('open') && !editing) closeServiceForm();
        else openServiceForm(null);
      });
    }
    if (nameInput) scope.listen(nameInput, 'input', markServicesDirty);
    if (descInput) scope.listen(descInput, 'input', markServicesDirty);
    if (list) {
      scope.listen(list, 'click', function (e) {
        const edit = e.target.closest('[data-service-edit]');
        if (edit) {
          e.preventDefault();
          openServiceForm(edit.closest('.service'));
          return;
        }
        const del = e.target.closest('[data-service-delete]');
        if (del) {
          e.preventDefault();
          const card = del.closest('.service');
          if (card) {
            const id = card.getAttribute('data-service-id');
            services = services.filter(function (s) {
              return s.id !== id;
            });
            paintServices();
          }
          markServicesDirty();
        }
      });
    }
    if (saveBtn) {
      scope.listen(saveBtn, 'click', function () {
        const servicesOpen =
          document.getElementById('panel-services') &&
          !document.getElementById('panel-services').hidden;
        if (!servicesOpen) return;
        if (!commitServiceForm()) return;
        const feeEl = document.getElementById('fee');
        if (feeEl && feeEl._commitFee) feeEl._commitFee();
        if (window.GradRightServices) services = GradRightServices.set(services);
        savedServices = JSON.stringify(services);
        paintServices();
        markServicesDirty();
      });
    }
    if (discardBtn) {
      scope.listen(discardBtn, 'click', function () {
        const servicesOpen =
          document.getElementById('panel-services') &&
          !document.getElementById('panel-services').hidden;
        if (!servicesOpen) return;
        const feeEl = document.getElementById('fee');
        if (feeEl && feeEl._restoreFee) feeEl._restoreFee();
        services = JSON.parse(savedServices);
        paintServices();
        editing = null;
        if (form) form.classList.remove('open');
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        markServicesDirty();
      });
    }
  })();

  (function bindTestimonials() {
    const store = window.GradRightTestimonials;
    if (!store) return;

    const modal = document.getElementById('testi-modal');
    const form = document.getElementById('new-testimonial');
    const toggle = document.getElementById('toggle-new-testimonial');
    const list = document.getElementById('testi-list');
    const previewList = document.getElementById('preview-testi-list');
    const fullList = document.getElementById('preview-full-testi');
    const mobileList = document.getElementById('preview-mobile-testi');
    const titleEl = document.getElementById('testi-modal-title');
    const nameInput = document.getElementById('testi-name');
    const roleInput = document.getElementById('testi-role');
    const textInput = document.getElementById('testi-text');
    const textWrap = document.getElementById('testi-text-wrap');
    const videoWrap = document.getElementById('testi-video-wrap');
    const youtubeInput = document.getElementById('testi-youtube');
    const ytPreview = document.getElementById('testi-yt-preview');
    const ytFrame = document.getElementById('testi-yt-frame');
    const videoInput = document.getElementById('testi-video-input');
    const videoZone = document.getElementById('testi-video-zone');
    const videoLabel = document.getElementById('testi-video-label');
    const videoPreview = document.getElementById('testi-video-preview');
    const videoHint = document.getElementById('testi-video-hint');
    const photoInput = document.getElementById('testi-photo-input');
    const photoZone = document.getElementById('testi-photo-zone');
    const photoEmpty = document.getElementById('testi-photo-empty');
    const photoImg = document.getElementById('testi-photo-img');
    const saveBtn = document.getElementById('testi-save');

    const unsavedBar = document.getElementById('unsaved-bar');
    const saveBarBtn = document.getElementById('save-btn');
    const discardBarBtn = document.getElementById('discard-btn');
    let items = store.get();
    let savedItems = JSON.stringify(items);
    let editingId = null;
    const draft = { photo: '', video: '', youtube: '', link: '', kind: 'text' };

    function testiFormDirty() {
      if (!modal || modal.hidden) return false;
      const name = (nameInput && nameInput.value.trim()) || '';
      const role = (roleInput && roleInput.value.trim()) || '';
      const text = (textInput && textInput.value.trim()) || '';
      if (!editingId)
        return !!(
          name ||
          role ||
          text ||
          draft.photo ||
          draft.video ||
          draft.youtube ||
          draft.link
        );
      const orig =
        items.find(function (t) {
          return t.id === editingId;
        }) || {};
      return (
        name !== (orig.name || '') ||
        role !== (orig.role || '') ||
        text !== (orig.text || '') ||
        (draft.photo || '') !== (orig.photo || '') ||
        (draft.video || '') !== (orig.video || '') ||
        (draft.youtube || '') !== (orig.youtube || '') ||
        (draft.link || '') !== (orig.link || '') ||
        draft.kind !== (orig.kind || 'text')
      );
    }

    function markTestimonialsDirty() {
      const hasName = Boolean(nameInput?.value.trim());
      const hasContent = Boolean(
        textInput?.value.trim() || draft.video || draft.youtube || draft.link,
      );
      const validLink = !youtubeInput?.value.trim() || Boolean(draft.youtube || draft.link);
      if (saveBtn)
        saveBtn.disabled =
          !hasName || !hasContent || !validLink || Boolean(editingId && !testiFormDirty());
      const panel = document.getElementById('panel-testimonials');
      if (panel && panel.hidden) return false;
      const dirty = JSON.stringify(items) !== savedItems;
      const showBar = dirty && (!modal || modal.hidden);
      if (unsavedBar) unsavedBar.hidden = !showBar;
      document.body.classList.toggle('has-unsaved', showBar);
      return dirty;
    }
    window.GradRightProfileDirty.testimonials = markTestimonialsDirty;

    function setKind(kind) {
      draft.kind = kind === 'video' ? 'video' : 'text';
      document.querySelectorAll('[data-testi-kind]').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-testi-kind') === draft.kind);
      });
      if (textWrap) textWrap.hidden = false;
      if (videoWrap) videoWrap.hidden = false;
      markTestimonialsDirty();
    }

    function paintPhoto(src) {
      draft.photo = src || '';
      const removePhoto = document.getElementById('testi-photo-remove');
      if (removePhoto) removePhoto.hidden = !draft.photo;
      if (!photoImg) return;
      if (draft.photo) {
        photoImg.src = draft.photo;
        photoImg.hidden = false;
        if (photoZone) photoZone.classList.add('has-photo');
        if (photoEmpty) photoEmpty.hidden = true;
      } else {
        photoImg.removeAttribute('src');
        photoImg.hidden = true;
        if (photoZone) photoZone.classList.remove('has-photo');
        if (photoEmpty) photoEmpty.hidden = false;
      }
      markTestimonialsDirty();
    }

    function paintYoutube(value) {
      draft.youtube = store.parseYoutubeId(value);
      draft.link = draft.youtube ? '' : store.safeLink(value);
      youtubeInput?.setCustomValidity(
        value.trim() && !draft.youtube && !draft.link ? 'Enter a valid http or https link.' : '',
      );
      if (ytPreview && ytFrame) {
        if (draft.youtube) {
          ytFrame.src = 'https://www.youtube.com/embed/' + draft.youtube;
          ytPreview.hidden = false;
        } else {
          ytFrame.removeAttribute('src');
          ytPreview.hidden = true;
        }
      }
      markTestimonialsDirty();
    }

    function paintVideo(src, fileName) {
      draft.video = src || '';
      if (videoLabel)
        videoLabel.textContent = draft.video ? fileName || 'Video selected' : 'Upload video';
      if (!videoPreview) return;
      if (draft.video) {
        if (draft.video.startsWith('media:')) {
          const expected = draft.video;
          loadTestimonialVideo(expected)
            .then((file) => {
              if (file && draft.video === expected) videoPreview.src = URL.createObjectURL(file);
            })
            .catch(() => {
              videoHint.hidden = false;
              videoHint.textContent = 'Could not load this video. Please upload it again.';
            });
        } else videoPreview.src = draft.video;
        videoPreview.hidden = false;
      } else {
        videoPreview.removeAttribute('src');
        videoPreview.hidden = true;
      }
      markTestimonialsDirty();
    }

    function closeModal() {
      if (modal) modal.hidden = true;
      document.body.classList.remove('cal-modal-open');
    }

    function resetForm() {
      editingId = null;
      if (nameInput) nameInput.value = '';
      if (roleInput) roleInput.value = '';
      if (textInput) textInput.value = '';
      if (youtubeInput) youtubeInput.value = '';
      if (videoInput) videoInput.value = '';
      if (photoInput) photoInput.value = '';
      paintPhoto('');
      paintVideo('');
      paintYoutube('');
      setKind('text');
      if (saveBtn) saveBtn.textContent = 'Create testimonial';
      if (titleEl) titleEl.textContent = 'Add testimonial';
      closeModal();
      markTestimonialsDirty();
    }

    function openForm(item) {
      if (item) {
        editingId = item.id;
        if (nameInput) nameInput.value = item.name || '';
        if (roleInput) roleInput.value = item.role || '';
        if (textInput) textInput.value = item.text || '';
        if (youtubeInput)
          youtubeInput.value = item.youtube
            ? 'https://www.youtube.com/watch?v=' + item.youtube
            : item.link || '';
        paintPhoto(item.photo || '');
        paintVideo(item.video || '');
        paintYoutube(item.youtube || item.link || '');
        setKind(item.kind || 'text');
        if (saveBtn) saveBtn.textContent = 'Save changes';
        if (titleEl) titleEl.textContent = 'Edit testimonial';
      } else {
        editingId = null;
        if (nameInput) nameInput.value = '';
        if (roleInput) roleInput.value = '';
        if (textInput) textInput.value = '';
        if (youtubeInput) youtubeInput.value = '';
        if (videoInput) videoInput.value = '';
        if (photoInput) photoInput.value = '';
        paintPhoto('');
        paintVideo('');
        paintYoutube('');
        setKind('text');
        if (saveBtn) saveBtn.textContent = 'Create testimonial';
        if (titleEl) titleEl.textContent = 'Add testimonial';
      }
      if (modal) modal.hidden = false;
      document.body.classList.add('cal-modal-open');
      if (nameInput) nameInput.focus();
      markTestimonialsDirty();
    }

    function paint() {
      store.renderList(list, {
        items: items,
        actions: true,
        empty:
          'No testimonials yet. Add a quote or video from a student, parent, or university contact.',
      });
      const previewOpts = {
        items: items,
        preview: true,
        empty: 'No testimonials yet. Add them on the Testimonials tab.',
      };
      store.renderList(previewList, previewOpts);
      store.renderList(fullList, previewOpts);
      store.renderList(mobileList, Object.assign({ compact: true }, previewOpts));
      markTestimonialsDirty();
    }

    paint();

    document.querySelectorAll('[data-testi-kind]').forEach(function (btn) {
      scope.listen(btn, 'click', function () {
        setKind(btn.getAttribute('data-testi-kind'));
      });
    });

    if (toggle)
      scope.listen(toggle, 'click', function () {
        openForm(null);
      });
    document.querySelectorAll('[data-close-testi]').forEach(function (el) {
      scope.listen(el, 'click', function () {
        if (el.classList.contains('cal-modal-backdrop') && testiFormDirty()) return;
        resetForm();
      });
    });

    scope.listen(document.getElementById('testi-photo-remove'), 'click', function () {
      paintPhoto('');
      if (photoInput) photoInput.value = '';
      const hint = document.getElementById('testi-photo-hint');
      if (hint) hint.hidden = true;
    });
    if (photoZone && photoInput) {
      scope.listen(photoZone, 'click', function () {
        photoInput.click();
      });
      let photoVersion = 0;
      scope.listen(photoInput, 'change', async function () {
        const file = photoInput.files?.[0];
        if (!file) return;
        const hint = document.getElementById('testi-photo-hint');
        const version = ++photoVersion;
        function photoError(message) {
          hint.hidden = false;
          hint.textContent = message;
        }
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
          photoError('Choose a JPG, PNG or WebP image.');
          photoInput.value = '';
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          photoError('Choose an image under 10 MB.');
          photoInput.value = '';
          return;
        }
        hint.hidden = false;
        hint.textContent = 'Uploading photo…';
        let bitmap;
        try {
          bitmap = await createImageBitmap(file);
          const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          if (version !== photoVersion || modal.hidden) return;
          paintPhoto(canvas.toDataURL('image/jpeg', 0.85));
          hint.hidden = true;
        } catch {
          photoError('Could not read this image. Try another JPG, PNG or WebP.');
        } finally {
          bitmap?.close();
          photoInput.value = '';
        }
      });
    }

    if (youtubeInput) {
      scope.listen(youtubeInput, 'input', function () {
        paintYoutube(youtubeInput.value);
      });
    }

    if (videoZone && videoInput) {
      scope.listen(videoZone, 'click', function () {
        videoInput.click();
      });
    }
    if (videoInput) {
      let uploadVersion = 0;
      scope.listen(videoInput, 'change', async function () {
        const file = videoInput.files?.[0];
        if (!file) return;
        const version = ++uploadVersion;
        if (!/\.(mp4|webm|mov|m4v)$/i.test(file.name) && !file.type.startsWith('video/')) {
          videoHint.hidden = false;
          videoHint.textContent = 'Choose an MP4, WebM or MOV video.';
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          videoHint.hidden = false;
          videoHint.textContent = 'Choose a video under 50 MB.';
          return;
        }
        videoLabel.textContent = 'Uploading…';
        saveBtn.disabled = true;
        try {
          const id = await saveTestimonialVideo(file);
          if (version !== uploadVersion || modal.hidden) return;
          videoHint.hidden = true;
          paintVideo(id, file.name);
        } catch {
          videoHint.hidden = false;
          videoHint.textContent =
            'Could not upload the video. Check browser storage and try again.';
          videoLabel.textContent = 'Upload video';
          markTestimonialsDirty();
        } finally {
          videoInput.value = '';
        }
      });
    }

    if (list) {
      scope.listen(list, 'click', function (e) {
        const edit = e.target.closest('[data-testi-edit]');
        if (edit) {
          const card = edit.closest('.testi-card');
          const id = card.getAttribute('data-testi-id');
          card.querySelector('.testi-actions-menu details')?.removeAttribute('open');
          const item = items.find(function (t) {
            return t.id === id;
          });
          if (item) openForm(item);
          return;
        }
        const del = e.target.closest('[data-testi-delete]');
        if (del) {
          const card = del.closest('.testi-card');
          const id = card.getAttribute('data-testi-id');
          card.querySelector('.testi-actions-menu details')?.removeAttribute('open');
          items = items.filter(function (t) {
            return t.id !== id;
          });
          if (editingId === id) resetForm();
          paint();
        }
      });
    }

    if (form) {
      scope.listen(form, 'submit', function (e) {
        e.preventDefault();
        const name = (nameInput && nameInput.value.trim()) || '';
        const role = (roleInput && roleInput.value.trim()) || '';
        const text = (textInput && textInput.value.trim()) || '';
        if (!name) {
          if (nameInput) nameInput.focus();
          return;
        }
        if (!text && !draft.youtube && !draft.video && !draft.link) {
          if (textInput) textInput.focus();
          return;
        }
        const next = {
          id: editingId || 't-' + Date.now().toString(36),
          name: name,
          role: role,
          photo: draft.photo,
          initials: store.initialsFrom(name),
          amber: false,
          kind: draft.video || draft.youtube || draft.link ? 'video' : 'text',
          text: draft.kind === 'text' ? text : text,
          video: draft.video,
          youtube: draft.youtube,
          link: draft.link,
        };
        if (editingId) {
          items = items.map(function (t) {
            return t.id === editingId ? next : t;
          });
        } else {
          items = [next].concat(items);
        }
        resetForm();
        paint();
      });
    }

    [nameInput, roleInput, textInput].forEach(function (el) {
      if (el) scope.listen(el, 'input', markTestimonialsDirty);
    });

    if (saveBarBtn) {
      scope.listen(saveBarBtn, 'click', function () {
        const open =
          document.getElementById('panel-testimonials') &&
          !document.getElementById('panel-testimonials').hidden;
        if (!open) return;
        if (modal && !modal.hidden) {
          if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
          else if (form)
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        const saved = store.set(items);
        if (!saved.ok) {
          if (videoHint) {
            videoHint.hidden = false;
            videoHint.textContent = 'Could not save the testimonial. Browser storage may be full.';
          }
          return;
        }
        items = saved.items;
        savedItems = JSON.stringify(items);
        paint();
      });
    }
    if (discardBarBtn) {
      scope.listen(discardBarBtn, 'click', function () {
        const open =
          document.getElementById('panel-testimonials') &&
          !document.getElementById('panel-testimonials').hidden;
        if (!open) return;
        items = JSON.parse(savedItems);
        resetForm();
        paint();
      });
    }
  })();

  (function () {
    const form = document.getElementById('profile-form');
    const unsavedBar = document.getElementById('unsaved-bar');
    const countriesEl = document.getElementById('countries');
    const emailBtn = document.getElementById('verify-email-btn');
    const emailHint = document.getElementById('email-hint');

    const photoInput = document.getElementById('photo-input');
    const photoZone = document.getElementById('photo-zone');
    const photoPreview = document.getElementById('photo-preview');
    const photoImg = document.getElementById('photo-preview-img');
    const photoName = document.getElementById('photo-preview-name');

    const videoInput = document.getElementById('video-input');
    const videoZone = document.getElementById('video-zone');
    const videoPreview = document.getElementById('video-preview');
    const videoEl = document.getElementById('video-preview-el');
    const videoName = document.getElementById('video-preview-name');
    const videoMeta = document.getElementById('video-preview-meta');

    const docInput = document.getElementById('doc-input');
    const docZone = document.getElementById('doc-zone');
    const docList = document.getElementById('doc-list');
    const docPreview = document.getElementById('doc-preview');
    const docPreviewTitle = document.getElementById('doc-preview-title');
    const docPreviewMeta = document.getElementById('doc-preview-meta');
    const docPreviewBody = document.getElementById('doc-preview-body');

    // Sample preview assets (inline SVG data URLs)
    const sampleIdSvg =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">' +
          '<rect width="640" height="400" fill="#f3f2f5"/>' +
          '<rect x="32" y="32" width="576" height="336" rx="16" fill="#fff" stroke="#bbbacc"/>' +
          '<circle cx="140" cy="160" r="52" fill="#dad2ff"/>' +
          '<rect x="220" y="120" width="280" height="18" rx="4" fill="#3c3a53"/>' +
          '<rect x="220" y="156" width="200" height="12" rx="3" fill="#85849a"/>' +
          '<rect x="220" y="186" width="240" height="12" rx="3" fill="#bbbacc"/>' +
          '<text x="48" y="340" font-family="Inter,sans-serif" font-size="18" fill="#6b6a83">Aadhaar / Government ID</text>' +
          '</svg>',
      );

    const sampleCertSvg =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">' +
          '<rect width="640" height="400" fill="#f4f2ff"/>' +
          '<rect x="48" y="40" width="544" height="320" rx="12" fill="#fff" stroke="#beaeff"/>' +
          '<text x="320" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" fill="#4911a1">Certificate of Counseling</text>' +
          '<text x="320" y="170" text-anchor="middle" font-family="Inter,sans-serif" font-size="16" fill="#53516b">Awarded to Priya Sharma</text>' +
          '<text x="320" y="220" text-anchor="middle" font-family="Inter,sans-serif" font-size="14" fill="#85849a">Higher-education guidance · 2024</text>' +
          '<circle cx="320" cy="290" r="28" fill="#782bff" opacity="0.85"/>' +
          '</svg>',
      );

    let emailVerified = false;
    let photoUrl = null;
    let photoFileName = null;
    let videoUrl = null;
    let videoFileName = null;
    let videoFileSize = 0;
    const seedDocs = [
      {
        id: 'doc-1',
        name: 'Aadhaar_card.jpg',
        size: 842000,
        type: 'image/jpeg',
        url: sampleIdSvg,
        seeded: true,
      },
      {
        id: 'doc-2',
        name: 'Counseling_certificate.pdf',
        size: 1240000,
        type: 'application/pdf',
        url: sampleCertSvg,
        seeded: true,
        pdfPreview: true,
      },
    ];

    let docs = seedDocs.map((d) => Object.assign({}, d));

    let baseline = null;
    let savedState = null;
    let dirty = false;

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function selectedCountries() {
      return window.GradRightCountriesDraft?.get() || [];
    }

    function snapshot() {
      return JSON.stringify({
        publicDetails: window.GradRightPublicProfileDraft?.get() || {},
        name: document.getElementById('field-name').value,
        email: window.GradRightSession?.get()?.email || '',
        address: document.getElementById('field-address').value,
        students: document.getElementById('field-students').value,
        admits: document.getElementById('field-admits').value,
        bio: document.getElementById('field-bio').value,
        countries: selectedCountries(),
        emailVerified: emailVerified,
        photo: photoFileName || '',
        video: videoFileName || '',
        docs: docs.map((d) => d.name + ':' + d.size).join('|'),
      });
    }

    function setDirty(next) {
      dirty = next;
      if (next) {
        const status = document.getElementById('profile-save-status');
        if (status) status.hidden = true;
      }
      const panel = document.getElementById('panel-edit');
      if (panel && panel.hidden) return dirty;
      unsavedBar.hidden = !dirty;
      document.body.classList.toggle('has-unsaved', dirty);
      return dirty;
    }

    function checkDirty() {
      updateSectionStatuses();
      if (!baseline) return false;
      return setDirty(snapshot() !== baseline);
    }
    window.GradRightProfileDirty.edit = checkDirty;

    function updateSectionStatuses() {
      const videoStatus = document.getElementById('profile-video-status');
      const documentsStatus = document.getElementById('profile-documents-status');
      const backgroundStatus = document.getElementById('profile-background-status');
      const complete = Boolean(
        selectedCountries().length &&
        document.getElementById('field-students').value.trim() &&
        document.getElementById('field-admits').value.trim(),
      );
      if (videoStatus) {
        videoStatus.textContent = videoUrl ? 'Added' : 'Not added';
        videoStatus.className = 'pill ' + (videoUrl ? 'ok' : 'warn');
      }
      if (documentsStatus) {
        documentsStatus.textContent = docs.length ? docs.length + ' on file' : 'Not added';
        documentsStatus.className = 'pill ' + (docs.length ? 'ok' : 'warn');
      }
      if (backgroundStatus) {
        backgroundStatus.textContent = complete ? 'Complete' : 'Needs details';
        backgroundStatus.className = 'pill ' + (complete ? 'ok' : 'warn');
      }
    }

    function updateMissing() {
      updateSectionStatuses();
      const list = document.getElementById('missing-list');
      const photoPill = list.querySelector('[data-miss="photo"]');
      const emailPill = list.querySelector('[data-miss="email"]');
      const docsPill = list.querySelector('[data-miss="docs"]');
      const videoPill = list.querySelector('[data-miss="video"]');

      if (photoUrl) {
        photoPill.classList.remove('warn');
        photoPill.classList.add('ok');
        photoPill.textContent = 'Photo added';
      } else {
        photoPill.classList.add('warn');
        photoPill.classList.remove('ok');
        photoPill.textContent = 'Photo needed';
      }

      if (docs.length) {
        docsPill.classList.remove('warn');
        docsPill.classList.add('ok');
        docsPill.textContent = docs.length + ' document' + (docs.length === 1 ? '' : 's');
      } else {
        docsPill.classList.add('warn');
        docsPill.classList.remove('ok');
        docsPill.textContent = 'Documents needed';
      }

      if (videoPill) {
        if (videoUrl) {
          videoPill.hidden = false;
          videoPill.classList.remove('warn');
          videoPill.classList.add('ok');
          videoPill.textContent = 'Intro video';
        } else {
          videoPill.hidden = true;
        }
      }
    }

    function setAvatarPhoto(el, url, initials) {
      if (!el) return;
      if (url) {
        el.style.backgroundImage = 'url(' + url + ')';
        el.classList.add('has-photo');
        el.textContent = '';
      } else {
        el.style.backgroundImage = '';
        el.classList.remove('has-photo');
        el.textContent = initials || 'PS';
      }
    }

    function syncPreviewCopy(name, bio) {
      const safeName = name || 'Priya Sharma';
      const safeBio = bio || '';
      const students = document.getElementById('field-students').value || '120';
      const admits = document.getElementById('field-admits').value || '85';
      document.getElementById('hero-name').textContent = safeName;
      document.querySelectorAll('.preview-name').forEach((el) => {
        el.textContent = safeName;
      });
      document.querySelectorAll('.preview-bio').forEach((el) => {
        el.textContent = safeBio;
      });
      document.querySelectorAll('.preview-students').forEach((el) => {
        el.textContent = students + '+';
      });
      document.querySelectorAll('.preview-admits').forEach((el) => {
        el.textContent = admits + '+';
      });
      const heroBio = document.getElementById('preview-hero-bio');
      if (heroBio) {
        heroBio.textContent = safeBio;
      }
    }

    function syncAvatars(url) {
      const initials = 'PS';
      document.querySelectorAll('.preview-avatar').forEach((el) => {
        setAvatarPhoto(el, url, initials);
      });
    }

    function renderPhoto() {
      const empty = document.getElementById('photo-empty');
      if (photoUrl) {
        photoZone.classList.add('has-photo');
        photoPreview.hidden = false;
        photoImg.hidden = false;
        photoImg.src = photoUrl;
        if (empty) empty.hidden = true;
        if (photoName) photoName.textContent = photoFileName || 'photo.jpg';
      } else {
        photoZone.classList.remove('has-photo');
        photoPreview.hidden = true;
        photoImg.hidden = true;
        photoImg.removeAttribute('src');
        if (empty) empty.hidden = false;
      }
      syncAvatars(photoUrl);
      updateMissing();
    }

    function syncIntroVideo(url) {
      document.querySelectorAll('.preview-intro-video').forEach((wrap) => {
        wrap.hidden = !url;
      });
      document.querySelectorAll('.preview-intro-video-el').forEach((el) => {
        if (url) {
          if (el.src !== url) el.src = url;
        } else {
          el.removeAttribute('src');
          el.load();
        }
      });
    }

    function renderVideo() {
      document.getElementById('video-placeholder').hidden = Boolean(videoUrl);
      document.getElementById('video-details').hidden = !videoUrl;
      if (videoUrl) {
        videoZone.hidden = true;
        videoPreview.hidden = false;
        if (videoEl.src !== videoUrl) videoEl.src = videoUrl;
        videoName.textContent = videoFileName || 'intro.mp4';
        videoMeta.textContent =
          (videoFileSize ? formatSize(videoFileSize) + ' · ' : '') +
          'Ready · shown on your student profile';
      } else {
        videoZone.hidden = false;
        videoPreview.hidden = true;
        videoEl.removeAttribute('src');
        videoEl.load();
      }
      syncIntroVideo(videoUrl);
      updateMissing();
    }

    function acceptIntroVideo(file, done) {
      const type = String(file.type || '').split(';')[0];
      const okType =
        /^video\/(mp4|webm|quicktime|x-m4v)$/i.test(type) ||
        /\.(mp4|webm|mov|m4v)$/i.test(file.name);
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
        done({ url: url, name: file.name, size: file.size });
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

    function renderDocs() {
      docList.innerHTML = '';
      docs.forEach((doc, index) => {
        const row = document.createElement('div');
        row.className = 'doc-file';

        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'doc-thumb';
        thumb.setAttribute('aria-label', 'Preview ' + doc.name);
        if (doc.type.startsWith('image/') || doc.pdfPreview) {
          const img = document.createElement('img');
          img.src = doc.url;
          img.alt = '';
          thumb.appendChild(img);
        } else {
          thumb.innerHTML = '<span class="doc-thumb-icon">📄</span>';
        }
        scope.listen(thumb, 'click', () => openDocPreview(doc));

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.style.flex = '1';

        const nameEl = document.createElement('strong');
        nameEl.style.fontSize = '0.85rem';
        nameEl.textContent = doc.name;

        const sizeEl = document.createElement('span');
        sizeEl.style.fontSize = '0.75rem';
        sizeEl.style.color = 'var(--muted)';
        sizeEl.textContent =
          formatSize(doc.size) + (doc.seeded ? ' · On file' : ' · Ready to submit');

        meta.appendChild(nameEl);
        meta.appendChild(document.createElement('br'));
        meta.appendChild(sizeEl);

        const actions = document.createElement('div');
        actions.className = 'doc-file-actions';

        const previewBtn = document.createElement('button');
        previewBtn.type = 'button';
        previewBtn.className = 'btn btn-ghost btn-sm';
        previewBtn.textContent = 'Preview';
        scope.listen(previewBtn, 'click', () => openDocPreview(doc));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-ghost btn-sm';
        remove.textContent = 'Remove';
        scope.listen(remove, 'click', () => {
          if (doc.url && doc.url.startsWith('blob:')) URL.revokeObjectURL(doc.url);
          docs.splice(index, 1);
          renderDocs();
          checkDirty();
        });

        actions.appendChild(previewBtn);
        actions.appendChild(remove);
        row.appendChild(thumb);
        row.appendChild(meta);
        row.appendChild(actions);
        docList.appendChild(row);
      });
      updateMissing();
    }

    function openDocPreview(doc) {
      docPreviewTitle.textContent = doc.name;
      docPreviewMeta.textContent = formatSize(doc.size) + ' · ' + (doc.type || 'file');
      docPreviewBody.innerHTML = '';

      if (doc.type.startsWith('image/') || doc.pdfPreview) {
        const img = document.createElement('img');
        img.src = doc.url;
        img.alt = doc.name;
        docPreviewBody.appendChild(img);
        if (doc.pdfPreview) {
          const note = document.createElement('p');
          note.className = 'hint-text';
          note.style.marginTop = '0.75rem';
          note.textContent = 'PDF preview. Download is unavailable.';
          docPreviewBody.appendChild(note);
        }
      } else {
        const box = document.createElement('div');
        box.className = 'doc-preview-fallback';
        box.innerHTML =
          '<div class="doc-thumb-icon" style="font-size:2rem;">📄</div><p>Preview not available for this file type.</p>';
        docPreviewBody.appendChild(box);
      }

      docPreview.hidden = false;
    }

    function closeDocPreview() {
      docPreview.hidden = true;
      docPreviewBody.innerHTML = '';
    }

    function captureState() {
      return {
        publicDetails: window.GradRightPublicProfileDraft?.get() || {},
        name: document.getElementById('field-name').value,
        email: window.GradRightSession?.get()?.email || '',
        address: document.getElementById('field-address').value,
        students: document.getElementById('field-students').value,
        admits: document.getElementById('field-admits').value,
        bio: document.getElementById('field-bio').value,
        countries: selectedCountries(),
        emailVerified: emailVerified,
        photoUrl: photoUrl,
        photoFileName: photoFileName,
        videoUrl: videoUrl,
        videoFileName: videoFileName,
        videoFileSize: videoFileSize,
        docs: docs.map((d) => Object.assign({}, d)),
        emailBtnText: emailBtn?.textContent,
        emailBtnDisabled: emailBtn?.disabled,
        emailHint: emailHint?.innerHTML,
      };
    }

    function restoreState(state) {
      window.GradRightPublicProfileDraft?.restore(state.publicDetails);
      document.getElementById('field-name').value = state.name;

      document.getElementById('field-address').value = state.address;
      document.getElementById('field-students').value = state.students;
      document.getElementById('field-admits').value = state.admits;
      document.getElementById('field-bio').value = state.bio;

      window.GradRightCountriesDraft?.restore(state.countries);

      emailVerified = state.emailVerified;
      if (emailBtn) emailBtn.textContent = state.emailBtnText;
      if (emailBtn) emailBtn.disabled = state.emailBtnDisabled;
      if (emailHint) emailHint.innerHTML = state.emailHint;

      docs.forEach((d) => {
        if (d.url && d.url.startsWith('blob:') && !state.docs.some((s) => s.url === d.url)) {
          URL.revokeObjectURL(d.url);
        }
      });
      if (photoUrl && photoUrl.startsWith('blob:') && photoUrl !== state.photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      if (videoUrl && videoUrl.startsWith('blob:') && videoUrl !== state.videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      photoUrl = state.photoUrl;
      photoFileName = state.photoFileName;
      videoUrl = state.videoUrl;
      videoFileName = state.videoFileName;
      videoFileSize = state.videoFileSize || 0;
      docs = state.docs.map((d) => Object.assign({}, d));

      syncPreviewCopy(state.name, state.bio);
      renderPhoto();
      renderVideo();
      renderDocs();
    }

    // Form field changes
    scope.listen(form, 'input', () => {
      syncPreviewCopy(
        document.getElementById('field-name').value.trim(),
        document.getElementById('field-bio').value,
      );
      checkDirty();
    });

    // Photo upload
    function openPhotoPicker() {
      photoInput.click();
    }

    scope.listen(photoZone, 'click', openPhotoPicker);
    scope.listen(document.getElementById('photo-change'), 'click', openPhotoPicker);
    scope.listen(document.getElementById('photo-remove'), 'click', () => {
      if (photoUrl && photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
      photoUrl = null;
      photoFileName = null;
      photoInput.value = '';
      renderPhoto();
      checkDirty();
    });

    scope.listen(photoInput, 'change', () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
        alert('Please choose a JPG, PNG, or WEBP image.');
        photoInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo must be under 5 MB.');
        photoInput.value = '';
        return;
      }
      if (photoUrl && photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(file);
      photoFileName = file.name;
      renderPhoto();
      checkDirty();
      photoInput.value = '';
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      scope.listen(photoZone, evt, (e) => {
        e.preventDefault();
        photoZone.classList.add('is-drag');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      scope.listen(photoZone, evt, (e) => {
        e.preventDefault();
        photoZone.classList.remove('is-drag');
      });
    });
    scope.listen(photoZone, 'drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files[0]) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        photoInput.files = dt.files;
        photoInput.dispatchEvent(new Event('change'));
      }
    });

    // Intro video
    function openVideoPicker() {
      videoInput.click();
    }

    function applyIntroVideo(file) {
      acceptIntroVideo(file, (next) => {
        if (videoUrl && videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
        videoUrl = next.url;
        videoFileName = next.name;
        videoFileSize = next.size;
        renderVideo();
        checkDirty();
      });
    }

    function openIntroRecorder() {
      if (!window.GradRightIntroRecorder) {
        openVideoPicker();
        return;
      }
      GradRightIntroRecorder.open({
        onSave: applyIntroVideo,
        onUpload: openVideoPicker,
      });
    }

    scope.listen(document.getElementById('video-upload-btn'), 'click', openVideoPicker);
    scope.listen(document.getElementById('video-record-btn'), 'click', openIntroRecorder);
    scope.listen(document.getElementById('video-record-again'), 'click', openIntroRecorder);
    scope.listen(document.getElementById('video-change'), 'click', openVideoPicker);
    scope.listen(document.getElementById('video-remove'), 'click', () => {
      if (videoUrl && videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
      videoUrl = null;
      videoFileName = null;
      videoFileSize = 0;
      videoInput.value = '';
      renderVideo();
      checkDirty();
    });

    scope.listen(videoInput, 'change', () => {
      const file = videoInput.files && videoInput.files[0];
      videoInput.value = '';
      if (file) applyIntroVideo(file);
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
      if (e.dataTransfer && e.dataTransfer.files[0]) {
        applyIntroVideo(e.dataTransfer.files[0]);
      }
    });

    // Documents
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
        if (docs.some((f) => f.name === file.name && f.size === file.size)) return;
        docs.push({
          id: 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          size: file.size,
          type: file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg'),
          url: URL.createObjectURL(file),
          seeded: false,
        });
      });
      renderDocs();
      checkDirty();
    }

    scope.listen(docZone, 'click', () => docInput.click());
    scope.listen(docZone, 'keydown', (e) => {
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
      scope.listen(docZone, evt, (e) => {
        e.preventDefault();
        docZone.classList.add('is-drag');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      scope.listen(docZone, evt, (e) => {
        e.preventDefault();
        docZone.classList.remove('is-drag');
      });
    });
    scope.listen(docZone, 'drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    scope.listen(document.getElementById('doc-preview-close'), 'click', closeDocPreview);
    scope.listen(docPreview, 'click', (e) => {
      if (e.target === docPreview) closeDocPreview();
    });
    scope.listen(document, 'keydown', (e) => {
      if (e.key === 'Escape' && !docPreview.hidden) closeDocPreview();
    });

    // Save / Discard
    scope.listen(document.getElementById('save-btn'), 'click', () => {
      const editOpen =
        document.getElementById('panel-edit') && !document.getElementById('panel-edit').hidden;
      if (!editOpen) return;
      if (window.GradRightPublicProfileDraft?.validate() === false) return;
      if (!document.getElementById('field-name').value.trim()) {
        document.getElementById('field-name').focus();
        return;
      }
      try {
        savePublicIdentity({
          ...window.GradRightPublicProfileDraft?.get(),
          name: document.getElementById('field-name').value.trim(),
          address: document.getElementById('field-address').value,
          students: document.getElementById('field-students').value,
          admits: document.getElementById('field-admits').value,
          bio: document.getElementById('field-bio').value,
          countries: selectedCountries(),
        });
      } catch {
        alert('Unable to save your public profile. Try again.');
        return;
      }
      savedState = captureState();
      baseline = snapshot();
      setDirty(false);
      const saveStatus = document.getElementById('profile-save-status');
      if (saveStatus) saveStatus.hidden = false;
      syncPreviewCopy(
        document.getElementById('field-name').value.trim(),
        document.getElementById('field-bio').value,
      );
    });

    scope.listen(document.getElementById('discard-btn'), 'click', () => {
      const editOpen =
        document.getElementById('panel-edit') && !document.getElementById('panel-edit').hidden;
      if (!editOpen || !savedState) return;
      restoreState(savedState);
      baseline = snapshot();
      setDirty(false);
    });

    // Init
    const identity = readPublicIdentity();
    if (identity.name) {
      document.getElementById('field-name').value = identity.name;
      syncPreviewCopy(identity.name, document.getElementById('field-bio').value);
    }
    for (const field of ['address', 'students', 'admits', 'bio']) {
      if (identity[field] !== undefined)
        document.getElementById('field-' + field).value = identity[field];
    }
    if (identity.countries) window.GradRightCountriesDraft?.restore(identity.countries);
    syncPreviewCopy(
      document.getElementById('field-name').value,
      document.getElementById('field-bio').value,
    );
    renderDocs();
    renderPhoto();
    renderVideo();
    savedState = captureState();
    baseline = snapshot();
    setDirty(false);
  })();

  window.GradRightProfileView = showProfileTab;
}
