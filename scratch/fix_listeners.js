const fs = require('fs');

// admin.html
let admin = fs.readFileSync('admin.html', 'utf8');
admin = admin.replace(
  "window.addEventListener('msa-blocks-updated', () => {\n  D = load() || D;\n  render();\n});",
  "if(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){\n  window.addEventListener('msa-blocks-updated', () => {\n    D = load() || D;\n    render();\n  });\n}"
);
admin = admin.replace(
  "window.addEventListener('msa-blocks-updated', () => {\r\n  D = load() || D;\r\n  render();\r\n});",
  "if(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){\r\n  window.addEventListener('msa-blocks-updated', () => {\r\n    D = load() || D;\r\n    render();\r\n  });\r\n}"
);
fs.writeFileSync('admin.html', admin, 'utf8');

// reservar.html
let res = fs.readFileSync('reservar.html', 'utf8');
res = res.replace(
  "window.addEventListener('msa-blocks-updated', () => {\n  D = load() || D;\n  updateSlots();\n  if (typeof renderCalendar === 'function') renderCalendar();\n});",
  "if(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){\n  window.addEventListener('msa-blocks-updated', () => {\n    D = load() || D;\n    updateSlots();\n    if (typeof renderCalendar === 'function') renderCalendar();\n  });\n}"
);
res = res.replace(
  "window.addEventListener('msa-blocks-updated', () => {\r\n  D = load() || D;\r\n  updateSlots();\r\n  if (typeof renderCalendar === 'function') renderCalendar();\r\n});",
  "if(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){\r\n  window.addEventListener('msa-blocks-updated', () => {\r\n    D = load() || D;\r\n    updateSlots();\r\n    if (typeof renderCalendar === 'function') renderCalendar();\r\n  });\r\n}"
);
fs.writeFileSync('reservar.html', res, 'utf8');
console.log('EventListener guards applied.');
