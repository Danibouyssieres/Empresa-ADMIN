const fs = require('fs');

// --- 1. CSS/ADMIN.CSS ---
let css = fs.readFileSync('css/admin.css', 'utf8');

const oldSvCss = /\.sv\{position:absolute;left:3px;right:3px;border-radius:6px;color:#fff;font-size:12px;padding:3px 6px;overflow:hidden;cursor:pointer;z-index:2\}\s*\.sv\.c\{opacity:\.5;text-decoration:line-through\}/;

const newSvCss = `.sv{position:absolute;left:3px;right:3px;border-radius:6px;color:#f1f5f9;font-size:11.5px;line-height:1.35;padding:4px 8px;overflow:hidden;cursor:pointer;z-index:2;box-sizing:border-box;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.08);border-left:4px solid;box-shadow:0 2px 6px rgba(0,0,0,0.28);transition:transform .12s ease,box-shadow .12s ease}
.sv:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.4);z-index:6}
.sv.c{opacity:.5;color:#94a3b8!important;text-decoration:line-through}
.sv.c *{color:#94a3b8!important}`;

css = css.replace(oldSvCss, newSvCss);
fs.writeFileSync('css/admin.css', css, 'utf8');
console.log('✓ css/admin.css updated.');

// --- 2. JS/ADMIN.JS ---
let js = fs.readFileSync('js/admin.js', 'utf8');

// A. COL & COL_BG
const oldCol = /const COL=\{'Pendiente':'#b45309','Confirmado':'#2563eb','En Ruta':'#7c3aed','En Atención':'#0d9488','Finalizado':'#15803d','Cancelado':'#6b7280'\};/;

const newCol = `const COL={'Pendiente':'#F59E0B','Confirmado':'#3B82F6','En Ruta':'#14B8A6','En Atención':'#06B6D4','Finalizado':'#10B981','Cancelado':'#64748B'};
const COL_BG={'Pendiente':'rgba(245, 158, 11, 0.12)','Confirmado':'rgba(59, 130, 246, 0.12)','En Ruta':'rgba(20, 184, 166, 0.12)','En Atención':'rgba(6, 182, 212, 0.12)','Finalizado':'rgba(16, 185, 129, 0.12)','Cancelado':'rgba(100, 116, 139, 0.12)'};`;

js = js.replace(oldCol, newCol);

// B. Legend in cal()
const oldLegend = /<div class=row style="margin-bottom:8px;font-size:12px">\$\{ST\.map\(s=>`<span><span class=dot style="background:\$\{COL\[s\]\}"><\/span>\$\{s\}<\/span>`\)\.join\(''\)\}<span><span class=dot style="background:var\(--buf\);border:1px dashed var\(--mut\)"><\/span>Buffer 2 h<\/span><\/div>/;

const newLegend = `<div class=row style="margin-bottom:8px;font-size:12px;gap:12px">\${ST.map(s=>{
    const icon = s==='En Ruta'?'🚗 ':s==='En Atención'?'🩺 ':'';
    return \`<span style="display:inline-flex;align-items:center;gap:5px"><span class=dot style="background:\${COL[s]}"></span>\${icon}\${s}</span>\`;
  }).join('')}<span><span class=dot style="background:var(--buf);border:1px dashed var(--mut)"></span>Buffer 2 h</span></div>`;

js = js.replace(oldLegend, newLegend);

// C. blk(s)
const oldBlk = /function blk\(s\)\{[\s\S]*?return \(c\?'':`<div class=buf style="top:\$\{bt\}px;height:\$\{bh\}px">Buffer operativo 2h<\/div>`\)\+\s*`<div class="sv \$\{c\?'c':''\}" style="top:\$\{top\}px;height:\$\{h\}px;background:\$\{COL\[s\.st\]\}"[\s\S]*?<\/div>`;\s*\}/;

const newBlk = `function blk(s){
  const top=(s.start-S0)*PX/60;
  const rawH=s.dur*PX/60;
  const maxH=(S1-S0)*PX/60 - top;
  const h=Math.min(rawH, maxH);
  const bt=top+rawH;
  const bh=Math.max(0,Math.min(BUF*PX/60,(S1-S0)*PX/60-bt));
  const c=s.st=='Cancelado';
  const isOvernight = s.start + s.dur > 1440;
  const stColor = COL[s.st] || '#64748B';
  const stBg = COL_BG[s.st] || 'rgba(100, 116, 139, 0.12)';
  const stIcon = s.st === 'En Ruta' ? '🚗 ' : s.st === 'En Atención' ? '🩺 ' : '';
  const timeText = \`\${fm(s.start)}–\${fm((s.start+s.dur)%1440)}\`;

  return (c?'':\`<div class=buf style="top:\${bt}px;height:\${bh}px">Buffer operativo 2h</div>\`)+
    \`<div class="sv \${c?'c':''}" style="top:\${top}px;height:\${h}px;background:linear-gradient(0deg,\${stBg},\${stBg}),rgba(15,23,42,0.88);border-left:4px solid \${stColor}" onclick="event.stopPropagation(); abrirMenuContextualServicio(\${s.id})" title="Clic para ver ficha clínica y acciones rápidas">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.5px">#MSA-\${s.id}</span>
        <b style="color:#ffffff">\${timeText}</b>
      </div>
      <div style="font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${isOvernight?'🌙 ':''}\${e(s.pat)}</div>
      \${h >= 52 ? \`<div style="font-size:11px;color:\${stColor};font-weight:700;margin-top:2px">\${stIcon}\${s.st}</div>\` : ''}
    </div>\`;
}`;

js = js.replace(oldBlk, newBlk);

// D. blkOvernightRem(s)
const oldBlkOvernight = /function blkOvernightRem\(s\)\{[\s\S]*?return \(c \? '' : `<div class=buf style="top:\$\{bt\}px;height:\$\{bh\}px">Buffer operativo 2h<\/div>`\) \+\s*`<div class="sv \$\{c\?'c':''\}" style="top:0;height:\$\{h\}px;background:\$\{COL\[s\.st\]\};opacity:\.88"[\s\S]*?<\/div>`;\s*\}/;

const newBlkOvernight = `function blkOvernightRem(s){
  const remDur = (s.start + s.dur) - 1440;
  const top = 0;
  const h = remDur * PX / 60;
  const bt = h;
  const bh = Math.max(0, Math.min(BUF*PX/60, (S1-S0)*PX/60 - bt));
  const c = s.st == 'Cancelado';
  const stColor = COL[s.st] || '#64748B';
  const stBg = COL_BG[s.st] || 'rgba(100, 116, 139, 0.12)';
  const stIcon = s.st === 'En Ruta' ? '🚗 ' : s.st === 'En Atención' ? '🩺 ' : '';

  return (c ? '' : \`<div class=buf style="top:\${bt}px;height:\${bh}px">Buffer operativo 2h</div>\`) +
    \`<div class="sv \${c?'c':''}" style="top:0;height:\${h}px;background:linear-gradient(0deg,\${stBg},\${stBg}),rgba(15,23,42,0.88);border-left:4px solid \${stColor};opacity:.88" onclick="event.stopPropagation(); abrirMenuContextualServicio(\${s.id})" title="Continuación de atención nocturna iniciada el día anterior">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.5px">#MSA-\${s.id}</span>
        <b style="color:#ffffff">00:00–\${fm(remDur)}</b>
      </div>
      <div style="font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🌙 (Cont. noche) \${e(s.pat)}</div>
      \${h >= 52 ? \`<div style="font-size:11px;color:\${stColor};font-weight:700;margin-top:2px">\${stIcon}\${s.st}</div>\` : ''}
    </div>\`;
}`;

js = js.replace(oldBlkOvernight, newBlkOvernight);

fs.writeFileSync('js/admin.js', js, 'utf8');
console.log('✓ js/admin.js updated.');
