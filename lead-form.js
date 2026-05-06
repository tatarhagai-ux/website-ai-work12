(function () {
  'use strict';

  const API_URL = (window.LEAD_API_URL || 'http://localhost:8000') + '/api/lead';

  let currentPlan = '';

  function $(sel, root) { return (root || document).querySelector(sel); }

  function buildModal() {
    if (document.getElementById('leadModal')) return;

    const modal = document.createElement('div');
    modal.id = 'leadModal';
    modal.className = 'lead-modal-backdrop';
    modal.innerHTML = `
      <div class="lead-modal-card" role="dialog" aria-modal="true" aria-labelledby="leadModalTitle">
        <button class="lead-modal-close" type="button" aria-label="סגור">×</button>
        <h3 id="leadModalTitle">השארת פרטים</h3>
        <p class="lead-modal-sub">השאירו פרטים ונחזור אליכם תוך 24 שעות</p>
        <p class="lead-modal-plan-badge" id="leadPlanBadge" hidden></p>
        <form id="leadForm" novalidate>
          <label>
            <span>שם פרטי</span>
            <input type="text" name="first_name" required minlength="1" maxlength="50" autocomplete="given-name" />
          </label>
          <label>
            <span>שם משפחה</span>
            <input type="text" name="last_name" required minlength="1" maxlength="50" autocomplete="family-name" />
          </label>
          <label>
            <span>טלפון (וואטסאפ)</span>
            <input type="tel" name="phone" required pattern="^0[5-9]\\d{8}$" placeholder="050-1234567" autocomplete="tel" inputmode="tel" />
          </label>
          <button type="submit" class="lead-submit-btn">
            <span class="btn-spinner" aria-hidden="true"></span>
            <span class="btn-label">שליחה</span>
          </button>
          <div class="lead-modal-msg" role="status" aria-live="polite"></div>
        </form>
        <div class="lead-modal-success" hidden>
          <div class="lead-success-icon">✓</div>
          <h4>הפרטים התקבלו!</h4>
          <p>שלחנו לך הודעת תודה לוואטסאפ. נחזור אליך בהקדם.</p>
          <button type="button" class="lead-success-close">סגירה</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeLeadModal();
    });
    $('.lead-modal-close', modal).addEventListener('click', closeLeadModal);
    $('.lead-success-close', modal).addEventListener('click', closeLeadModal);
    $('#leadForm', modal).addEventListener('submit', onSubmit);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeLeadModal();
    });
  }

  function openLeadModal(plan) {
    buildModal();
    currentPlan = plan || '';
    const modal = document.getElementById('leadModal');
    modal.classList.add('open');
    modal.classList.remove('success-state');
    document.body.style.overflow = 'hidden';

    $('#leadForm').hidden = false;
    $('.lead-modal-success').hidden = true;
    $('#leadForm').reset();
    setMsg('', '');

    const badge = $('#leadPlanBadge');
    if (currentPlan) {
      badge.textContent = 'מסלול שנבחר: ' + currentPlan;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }

    setTimeout(function () {
      const first = modal.querySelector('input[name="first_name"]');
      if (first) first.focus();
    }, 100);
  }

  function closeLeadModal() {
    const modal = document.getElementById('leadModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showSuccess() {
    $('#leadForm').hidden = true;
    $('.lead-modal-success').hidden = false;
    const modal = document.getElementById('leadModal');
    modal.classList.add('success-state');
  }

  function setMsg(text, type) {
    const el = $('.lead-modal-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'lead-modal-msg' + (type ? ' ' + type : '');
  }

  function setLoading(isLoading) {
    const btn = $('.lead-submit-btn');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.classList.toggle('loading', isLoading);
  }

  function explainError(err) {
    const msg = (err && err.message) || '';
    if (/Failed to fetch|NetworkError|TypeError/i.test(msg)) {
      return 'בעיית חיבור לשרת. ודא שיש חיבור לאינטרנט ונסה שוב.';
    }
    if (/timeout/i.test(msg)) {
      return 'השרת לא הגיב בזמן. נסה שוב בעוד רגע.';
    }
    if (msg.length > 0 && msg.length < 200) {
      return msg;
    }
    return 'אירעה שגיאה. נסה שוב או צור קשר ישירות.';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      first_name: form.first_name.value.trim(),
      last_name: form.last_name.value.trim(),
      phone: form.phone.value.trim(),
      plan: currentPlan,
    };

    if (!data.first_name) {
      setMsg('נא למלא שם פרטי', 'error');
      form.first_name.focus();
      return;
    }
    if (!data.last_name) {
      setMsg('נא למלא שם משפחה', 'error');
      form.last_name.focus();
      return;
    }
    if (!/^0[5-9]\d{8}$/.test(data.phone)) {
      setMsg('מספר טלפון לא תקין. פורמט נכון: 0501234567', 'error');
      form.phone.focus();
      return;
    }

    setLoading(true);
    setMsg('שולח... (בפעם הראשונה זה עלול לקחת עד 30 שניות)', 'info');

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await resp.json().catch(function () { return {}; });
      if (!resp.ok) {
        throw new Error(json.detail || ('שגיאה ' + resp.status));
      }
      showSuccess();
    } catch (err) {
      setMsg(explainError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  window.openLeadModal = openLeadModal;
  window.closeLeadModal = closeLeadModal;

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-lead-trigger]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        const plan = el.getAttribute('data-plan') || '';
        openLeadModal(plan);
      });
    });
  });
})();
