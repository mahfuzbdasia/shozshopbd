// SohozShopBD — /contact.html form submission
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const alertBox = document.getElementById('contact-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending...';
    const fd = new FormData(form);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), subject: fd.get('subject'), message: fd.get('message') }),
      });
      if (!res.ok) throw new Error('failed');
      alertBox.textContent = "Message sent. We'll reply within one business day.";
      alertBox.className = 'alert alert-success show';
      form.reset();
    } catch (err) {
      alertBox.textContent = 'Something went wrong sending your message. Please try again.';
      alertBox.className = 'alert alert-error show';
    } finally {
      btn.disabled = false; btn.textContent = original;
    }
  });
})();
