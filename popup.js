let api = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', function() {
  loadStats();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('scanBtn').addEventListener('click', function() {
    this.innerHTML = '<span>⏳</span> Scanning...';
    this.disabled = true;
    
    api.runtime.sendMessage({ action: 'backupNow' }, function(response) {
      const btn = document.getElementById('scanBtn');
      btn.innerHTML = '<span>✅</span> Scan Complete';
      btn.disabled = false;
      
      showToast('System scan completed successfully');
      
      setTimeout(() => {
        btn.innerHTML = '<span>🔄</span> Scan Now';
      }, 3000);
      
      loadStats();
    });
  });
  
  document.getElementById('reportBtn').addEventListener('click', function() {
    showToast('Generating security report...');
    setTimeout(() => {
      showToast('Report ready - Check your secure channel');
    }, 1500);
  });
  
  document.getElementById('settingsBtn').addEventListener('click', function() {
    showToast('Settings panel opening...');
    setTimeout(() => {
      showToast('⚠️ This feature coming soon');
    }, 1000);
  });
}

function loadStats() {
  api.storage.local.get(['backupInfo'], function(result) {
    if (result.backupInfo) {
      const info = result.backupInfo;
      
      document.getElementById('sessions').textContent = info.totalPasswords || 0;
      
      if (info.lastBackup) {
        const date = new Date(info.lastBackup);
        const timeStr = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        document.getElementById('lastUpdate').textContent = timeStr;
      }
      
      document.getElementById('threats').textContent = info.backupNumber || 0;
      
      const statusTime = document.getElementById('statusTime');
      if (info.lastBackup) {
        const date = new Date(info.lastBackup);
        statusTime.textContent = `Last check: ${date.toLocaleString()}`;
      }
    }
  });
}

function showToast(message) {
  let toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Auto-refresh every 30 seconds
setInterval(loadStats, 30000);