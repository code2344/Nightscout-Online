const mgdlToMmol = (v) => (v / 18).toFixed(1);

const arrows = {
  'DoubleUp': '⬆️⬆️',
  'SingleUp': '⬆️',
  'FortyFiveUp': '↗️',
  'Flat': '➡️',
  'FortyFiveDown': '↘️',
  'SingleDown': '⬇️',
  'DoubleDown': '⬇️⬇️',
  'NOT COMPUTABLE': '❓',
  'NONE': '❌',
};

async function fetchEntries() {
  const res = await fetch(`${NIGHTSCOUT_URL}/api/v1/entries.json?count=100`);
  return await res.json();
}

async function fetchTreatments() {
  const res = await fetch(`${NIGHTSCOUT_URL}/api/v1/treatments.json?count=10`);
  return await res.json();
}

async function fetchStatus() {
  const res = await fetch(`${NIGHTSCOUT_URL}/api/v1/status.json`);
  return await res.json();
}

async function updateCurrentBG() {
  try {
    const entries = await fetchEntries();
    if (entries.length < 2) return;

    const [latest, previous] = entries;
    const bgMmol = mgdlToMmol(latest.sgv);
    const prevMmol = mgdlToMmol(previous.sgv);
    const delta = (bgMmol - prevMmol).toFixed(1);

    document.getElementById('bg').textContent = `${bgMmol} mmol/L`;
    document.getElementById('delta').textContent = `Δ ${delta} mmol/L`;
    document.getElementById('arrow').textContent = arrows[latest.direction] || '⬜';

    const minsAgo = Math.floor((Date.now() - new Date(latest.date).getTime()) / 60000);
    document.getElementById('time').textContent = `${minsAgo} min ago`;

    // Alerts for high/low
    const bgNum = parseFloat(bgMmol);
    const alertEl = document.getElementById('bg');
    if (bgNum >= 10) {
      alertEl.classList.add('alert-high');
      alertEl.classList.remove('alert-low');
    } else if (bgNum <= 4) {
      alertEl.classList.add('alert-low');
      alertEl.classList.remove('alert-high');
    } else {
      alertEl.classList.remove('alert-high', 'alert-low');
    }

  } catch {
    document.getElementById('time').textContent = 'Error fetching data';
  }
}

let chart = null;

async function updateChart() {
  const entries = await fetchEntries();

  // Filter last 12 hours
  const twelveHoursAgo = Date.now() - 12 * 3600000;
  const filtered = entries.filter(e => e.date >= twelveHoursAgo);

  const labels = filtered.map(e => new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
  const data = filtered.map(e => mgdlToMmol(e.sgv));

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  } else {
    const ctx = document.getElementById('bgChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Glucose (mmol/L)',
          data,
          borderColor: '#007aff',
          backgroundColor: 'rgba(0, 122, 255, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
        }],
      },
      options: {
        animation: false,
        scales: {
          y: { min: 0, max: 25 },
          x: {
            ticks: {
              maxTicksLimit: 12,
            }
          }
        },
        plugins: {
          legend: { display: false },
        }
      }
    });
  }
}

async function updateTreatments() {
  const treatments = await fetchTreatments();
  const list = document.getElementById('treatmentList');
  list.innerHTML = '';

  treatments.forEach(t => {
    const li = document.createElement('li');
    li.className = 'item-content';
    let icon = '⚕️';
    let text = '';

    if (t.eventType === 'Meal Bolus' || t.eventType === 'Correction Bolus' || t.eventType === 'Bolus') {
      icon = '💉';
      text = `Bolus: ${t.insulin ?? 'N/A'} U`;
    } else if (t.eventType === 'Carb Correction' || t.eventType === 'Meal') {
      icon = '🍎';
      text = `Carbs: ${t.carbs ?? 'N/A'} g`;
    } else {
      text = t.eventType;
    }

    li.innerHTML = `<div class="item-media">${icon}</div><div class="item-inner"><div class="item-title">${text}</div><div class="item-after">${new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></div>`;
    list.appendChild(li);
  });
}

async function updateStatus() {
  const status = await fetchStatus();
  const statusEl = document.getElementById('deviceStatus');
  if (!status) {
    statusEl.textContent = 'No device status available';
    return;
  }
  let html = '';

  if (status.battery) html += `Battery: ${status.battery}%<br>`;
  if (status.sensor && status.sensor.battery) html += `Sensor battery: ${status.sensor.battery}%<br>`;
  if (status.uploaderBattery) html += `Uploader battery: ${status.uploaderBattery}%<br>`;

  if (status.status) html += `Status: ${status.status}<br>`;

  statusEl.innerHTML = html || 'No status info';
}

async function updateAll() {
  await Promise.all([
    updateCurrentBG(),
    updateChart(),
    updateTreatments(),
    updateStatus(),
  ]);
}

updateAll();
setInterval(updateAll, 60000);
