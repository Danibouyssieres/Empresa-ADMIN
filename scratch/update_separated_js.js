const fs = require('fs');

// --- 1. ACTUALIZAR JS/ADMIN.JS ---
let adminJs = fs.readFileSync('js/admin.js', 'utf8');

// A. seedVersion 3
adminJs = adminJs.replace(/seedVersion:\s*2,/, 'seedVersion: 3,');

// B. load()
const adminLoadRegex = /function load\(\)\s*\{[\s\S]*?return null;\s*\}\s*catch\(x\)\s*\{\s*return null;?\s*\}\s*\}/;
const adminNewLoad = `function load(){
  try{
    const parsed = JSON.parse(localStorage.getItem(K));
    if(parsed && (parsed.seedVersion === 3 || parsed.seedVersion === 2)){
      if(!Array.isArray(parsed.blocks)) parsed.blocks = [];
      try {
        const dedicated = JSON.parse(localStorage.getItem('msa_blocks'));
        if(Array.isArray(dedicated)){
          dedicated.forEach(db => {
            if(!parsed.blocks.some(b => b.date === db.date && b.type === db.type)){
              parsed.blocks.push(db);
            }
          });
        }
      } catch(e){}
      return parsed;
    }
    return null;
  }catch(x){return null}
}`;
adminJs = adminJs.replace(adminLoadRegex, adminNewLoad);

// C. save()
const adminSaveRegex = /function save\(\)\s*\{[\s\S]*?localStorage\.setItem\('msa-last-block-update'[\s\S]*?\}\s*catch\(x\)\s*\{\s*\}\s*\}/;
const adminNewSave = `function save(){
  try{
    localStorage.setItem(K, JSON.stringify(D));
    if(Array.isArray(D.blocks)){
      localStorage.setItem('msa_blocks', JSON.stringify(D.blocks));
    }
    // Notificación cruzada para sincronizar reservar.html inmediatamente
    localStorage.setItem('msa-last-block-update', Date.now().toString());
  }catch(x){}
}`;
adminJs = adminJs.replace(adminSaveRegex, adminNewSave);

// D. Storage & msa-blocks-updated listeners
if(!adminJs.includes("'msa_blocks'")){
  adminJs = adminJs.replace("ev.key==='msa-last-block-update'", "ev.key==='msa-last-block-update' || ev.key==='msa_blocks'");
}
if(!adminJs.includes("msa-blocks-updated")){
  adminJs = adminJs.replace(/addEventListener\('storage',\s*ev\s*=>\s*\{[\s\S]*?\}\);\s*/, match => {
    return match + `\nif(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){\n  window.addEventListener('msa-blocks-updated', () => {\n    D = load() || D;\n    render();\n  });\n}\n`;
  });
}

// E. Sincronización en arranque de admin
if(!adminJs.includes('syncCentralizedBlocksAdmin();')){
  adminJs = adminJs.replace('render();\n', 'render();\nif(typeof syncCentralizedBlocksAdmin === "function") syncCentralizedBlocksAdmin();\n');
  adminJs = adminJs.replace('render();\r\n', 'render();\r\nif(typeof syncCentralizedBlocksAdmin === "function") syncCentralizedBlocksAdmin();\r\n');
}

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js updated successfully.');

// --- 2. ACTUALIZAR JS/RESERVAR.JS ---
let resJs = fs.readFileSync('js/reservar.js', 'utf8');

// A. load()
const resLoadRegex = /function load\(\)\s*\{[\s\S]*?if\(parsed\s*&&\s*parsed\.seedVersion\s*===\s*3\)[\s\S]*?return null;\s*\}\s*catch\(x\)\s*\{\s*return null;?\s*\}\s*\}/;
const resNewLoad = `function load(){
  try{
    const parsed = JSON.parse(localStorage.getItem(K));
    if(parsed && (parsed.seedVersion === 3 || parsed.seedVersion === 2)){
      if(!Array.isArray(parsed.blocks)) parsed.blocks = [];
      try {
        const dedicated = JSON.parse(localStorage.getItem('msa_blocks'));
        if(Array.isArray(dedicated)){
          dedicated.forEach(db => {
            if(!parsed.blocks.some(b => b.date === db.date && b.type === db.type)){
              parsed.blocks.push(db);
            }
          });
        }
      } catch(e){}
      return parsed;
    }
    return null;
  }catch(x){return null}
}`;
resJs = resJs.replace(resLoadRegex, resNewLoad);

// B. save()
const resSaveRegex = /function save\(\)\s*\{\s*try\s*\{\s*localStorage\.setItem\(K,\s*JSON\.stringify\(D\)\)\s*\}\s*catch\(x\)\s*\{\s*\}\s*\}/;
const resNewSave = `function save(){
  try{
    localStorage.setItem(K, JSON.stringify(D));
    if(Array.isArray(D.blocks)){
      localStorage.setItem('msa_blocks', JSON.stringify(D.blocks));
    }
    localStorage.setItem('msa-last-block-update', Date.now().toString());
  }catch(x){}
}`;
resJs = resJs.replace(resSaveRegex, resNewSave);

// C. evaluateDateCapacity(): Garantizar lectura inmediata de D.blocks Y localStorage 'msa_blocks'
const evRegex = /const dayManualBlocks\s*=\s*\(D\.blocks\s*\|\|\s*\[\]\)\.filter\(b\s*=>\s*b\.date\s*===\s*dateStr\);/;
const evReplacement = `// Fusionar bloques de memoria con msa_blocks dedicados
  let mergedActiveBlocks = Array.isArray(D.blocks) ? [...D.blocks] : [];
  try {
    const ded = JSON.parse(localStorage.getItem('msa_blocks'));
    if(Array.isArray(ded)){
      ded.forEach(db => {
        if(!mergedActiveBlocks.some(b => b.date === db.date && b.type === db.type)){
          mergedActiveBlocks.push(db);
        }
      });
    }
  } catch(e){}
  const dayManualBlocks = mergedActiveBlocks.filter(b => b.date === dateStr);`;
resJs = resJs.replace(evRegex, evReplacement);

// D. selectCalendarDate(): Consulta simultánea / asíncrona a bloqueos y evaluación
const selRegex = /function selectCalendarDate\(dateStr\)\s*\{[\s\S]*?const isFullBlocked\s*=\s*dateManualBlocks\.some[\s\S]*?if\(isFullBlocked\)\{\s*return;\s*\}/;
const selReplacement = `function selectCalendarDate(dateStr){
  // Sincronizar simultáneamente con el backend centralizado de bloqueos (/api/blocks)
  if(window.MsaBlocksService && typeof window.MsaBlocksService.fetchBlocks === 'function'){
    window.MsaBlocksService.fetchBlocks(dateStr).then(remoteBlocks => {
      if(Array.isArray(remoteBlocks) && remoteBlocks.length > 0){
        window.MsaBlocksService.mergeBlocksIntoD(remoteBlocks, D);
        save();
        updateSlots(false);
      }
    }).catch(e => console.warn('Sync blocks on date select error:', e));
  }

  // Fusionar bloques actuales de memoria y almacenamiento local
  let currentActiveBlocks = Array.isArray(D.blocks) ? [...D.blocks] : [];
  try {
    const ded = JSON.parse(localStorage.getItem('msa_blocks'));
    if(Array.isArray(ded)){
      ded.forEach(db => {
        if(!currentActiveBlocks.some(b => b.date === db.date && b.type === db.type)){
          currentActiveBlocks.push(db);
        }
      });
    }
  } catch(e){}

  const dateManualBlocks = currentActiveBlocks.filter(b => b.date === dateStr);
  const isFullBlocked = dateManualBlocks.some(b => b.type === 'full') ||
    (dateManualBlocks.some(b => b.type === 'manana') && dateManualBlocks.some(b => b.type === 'tarde') && dateManualBlocks.some(b => b.type === 'noche'));
  if(isFullBlocked){
    return;
  }`;
resJs = resJs.replace(selRegex, selReplacement);

// E. renderCalendar() dateManualBlocks check
const oldCalCheck = 'const dateManualBlocks = (D.blocks || []).filter(b => b.date === dateStr);';
const newCalCheck = `let calBlocks = Array.isArray(D.blocks) ? [...D.blocks] : [];
    try {
      const ded = JSON.parse(localStorage.getItem('msa_blocks'));
      if(Array.isArray(ded)){
        ded.forEach(db => {
          if(!calBlocks.some(b => b.date === db.date && b.type === db.type)){
            calBlocks.push(db);
          }
        });
      }
    } catch(e){}
    const dateManualBlocks = calBlocks.filter(b => b.date === dateStr);`;
resJs = resJs.replace(oldCalCheck, newCalCheck);

// F. updateSlots(): Asegurar que tomen también 'msa_blocks' en isManualM, isManualT, isManualN
const manualCheckRegex = /const isManualM\s*=\s*\(D\.blocks\s*\|\|\s*\[\]\)\.some\(b\s*=>\s*b\.date\s*===\s*dateStr\s*&&\s*\(b\.type\s*===\s*'manana'\s*\|\|\s*b\.type\s*===\s*'full'\)\);[\s\S]*?const blockN\s*=\s*\(D\.blocks\s*\|\|\s*\[\]\)\.find\(b\s*=>\s*b\.date\s*===\s*dateStr\s*&&\s*\(b\.type\s*===\s*'noche'\s*\|\|\s*b\.type\s*===\s*'full'\)\);/;

const manualCheckReplacement = `let slotBlocks = Array.isArray(D.blocks) ? [...D.blocks] : [];
    try {
      const ded = JSON.parse(localStorage.getItem('msa_blocks'));
      if(Array.isArray(ded)){
        ded.forEach(db => {
          if(!slotBlocks.some(b => b.date === db.date && b.type === db.type)){
            slotBlocks.push(db);
          }
        });
      }
    } catch(e){}

    const isManualM = slotBlocks.some(b => b.date === dateStr && (b.type === 'manana' || b.type === 'full'));
    const blockM = slotBlocks.find(b => b.date === dateStr && (b.type === 'manana' || b.type === 'full'));
    const isManualT = slotBlocks.some(b => b.date === dateStr && (b.type === 'tarde' || b.type === 'full'));
    const blockT = slotBlocks.find(b => b.date === dateStr && (b.type === 'tarde' || b.type === 'full'));
    const isManualN = slotBlocks.some(b => b.date === dateStr && (b.type === 'noche' || b.type === 'full'));
    const blockN = slotBlocks.find(b => b.date === dateStr && (b.type === 'noche' || b.type === 'full'));`;

resJs = resJs.replace(manualCheckRegex, manualCheckReplacement);

// G. changeCalMonth
if (!resJs.includes('syncCentralizedBlocks();\n}') && !resJs.includes('syncCentralizedBlocks();\r\n}')) {
  resJs = resJs.replace(/function changeCalMonth\(delta\)\s*\{[\s\S]*?renderCalendar\(\);\s*\}/, match => {
    return match.replace(/renderCalendar\(\);\s*\}/, 'renderCalendar();\n  if(typeof syncCentralizedBlocks === "function") syncCentralizedBlocks();\n}');
  });
}

// H. Storage & CustomEvent listeners
if(!resJs.includes("msa-blocks-updated")){
  resJs = resJs.replace(/addEventListener\('storage',\s*ev\s*=>\s*\{[\s\S]*?\}\);\s*/, match => {
    let m = match;
    if(!m.includes("'msa_blocks'")){
      m = m.replace("ev.key === 'msa-last-block-update'", "ev.key === 'msa-last-block-update' || ev.key === 'msa_blocks'");
    }
    return m + `\nif(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){\n  window.addEventListener('msa-blocks-updated', () => {\n    D = load() || D;\n    updateSlots();\n    if (typeof renderCalendar === 'function') renderCalendar();\n  });\n}\n`;
  });
}

fs.writeFileSync('js/reservar.js', resJs, 'utf8');
console.log('js/reservar.js updated successfully.');
