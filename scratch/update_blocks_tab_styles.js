const fs = require('fs');

let admin = fs.readFileSync('admin.html', 'utf8');

// 1. Update CSS in admin.html
const oldCssBlock = /\.mcal-day\{min-height:66px;border-radius:9px;border:1\.5px solid var\(--bd\);background:var\(--card\);padding:6px 5px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:all \.14s;position:relative\}[\s\S]*?\.unlock-btn:hover\{background:#b91c1c\}/;

const newCssBlock = `.mcal-day{min-height:64px;border-radius:9px;border:1.5px solid var(--bd);background:var(--card);padding:5px 6px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:all .14s;position:relative}
.mcal-day:hover:not(.empty){border-color:var(--pri);transform:translateY(-1px)}
.mcal-day.empty{background:transparent;border-color:transparent;cursor:default;min-height:0}
.mcal-day.sel{border:2px solid #16a34a !important;box-shadow:0 0 0 1px #16a34a, 0 3px 10px rgba(22,163,74,.2)}
.mcal-day.b-full{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.35)}
.mcal-day.b-part{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.35)}
.mcal-day-num{font-weight:800;font-size:13px;color:var(--fg)}
.mcal-svc-dot{width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 0 2px rgba(16,185,129,0.25);flex-shrink:0}
.mcal-num{font-weight:800;font-size:13px;display:flex;justify-content:space-between;align-items:center}
.mcal-tags{display:flex;flex-direction:column;gap:2px;margin-top:3px}
.mtag{font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;max-width:100%}
.mtag.full{background:rgba(239,68,68,0.14);color:#EF4444;border:1px solid rgba(239,68,68,0.3)}
.mtag.part{background:rgba(245,158,11,0.14);color:#F59E0B;border:1px solid rgba(245,158,11,0.3)}
.mtag.svc{background:rgba(16,185,129,0.14);color:#10B981;border:1px solid rgba(16,185,129,0.3)}
.mtag.free{background:transparent;color:var(--mut);font-weight:600;font-size:9.5px}
.blk-opt{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid var(--bd);border-radius:9px;margin-bottom:8px;cursor:pointer;background:var(--bg)}
.blk-opt.on{border-color:var(--pri);background:rgba(15,118,110,.08)}
.blk-opt input{margin-top:3px}
.unlock-btn{background:transparent;color:#EF4444;border:1px solid #EF4444;font-weight:700;padding:5px 10px;font-size:12px;border-radius:7px;cursor:pointer;transition:all .15s ease;display:inline-flex;align-items:center;gap:4px}
.unlock-btn:hover{background:#EF4444;color:#fff;border-color:#EF4444;box-shadow:0 2px 8px rgba(239,68,68,0.25)}`;

if (!admin.match(oldCssBlock)) {
  console.error('Error: oldCssBlock not matched');
} else {
  admin = admin.replace(oldCssBlock, newCssBlock);
  console.log('✓ CSS for mcal and unlock-btn updated.');
}

// 2. Update cell generation in blocksView()
const oldCellGen = /let tags = '';[\s\S]*?if\(hasFull\)\{[\s\S]*?tags = `<span class="mtag free">Libre<\/span>`;\s*\}\s*cells \+= `[\s\S]*?<div class="mcal-tags">\$\{tags\}<\/div>\s*<\/div>\s*`;/;

const newCellGen = `let tags = '';
    if(hasFull){
      tags = \`<span class="mtag full">🔴 Cerrado</span>\`;
    } else if(dayBlocks.length > 0){
      let blockLabel = '';
      if(dayBlocks.length === 1){
        blockLabel = hasManana ? '☀️ Mañana' : hasTarde ? '⛅ Tarde' : '🌙 Noche';
      } else {
        blockLabel = (hasTarde && hasNoche) ? '⛅ Tarde / 🌙 Noche' : (hasManana && hasTarde) ? '☀️ Mañ. / ⛅ Tarde' : \`\${dayBlocks.length} bloq.\`;
      }
      tags = \`<span class="mtag part" title="\${dayBlocks.map(b => BLOCK_LABELS[b.type] || b.type).join(', ')}">\${blockLabel}</span>\`;
    } else if(daySvcs.length > 0){
      tags = \`<span class="mtag svc">📅 \${daySvcs.length} res.</span>\`;
    } else {
      tags = \`<span class="mtag free">Libre</span>\`;
    }

    cells += \`
      <div class="mcal-day \${cls} \${isSel ? 'sel' : ''}" onclick="pickAdminCalDate('\${dateStr}')">
        <div class="mcal-num">
          <span class="mcal-day-num">\${d}</span>
          <div style="display:flex;align-items:center;gap:4px">
            \${daySvcs.length > 0 ? \`<span class="mcal-svc-dot" title="\${daySvcs.length} reserva(s) agendada(s)"></span>\` : ''}
            \${dateStr === TODAY ? '<span style="font-size:9px;color:var(--pri);font-weight:700">HOY</span>' : ''}
          </div>
        </div>
        <div class="mcal-tags">\${tags}</div>
      </div>
    \`;`;

if (!admin.match(oldCellGen)) {
  console.error('Error: oldCellGen not matched');
} else {
  admin = admin.replace(oldCellGen, newCellGen);
  console.log('✓ Cell generation in blocksView updated.');
}

// 3. Update legend at bottom of monthly calendar
const oldBottomLegend = /<div class="row" style="margin-top:10px;font-size:12px;color:var\(--mut\);justify-content:center;gap:14px">[\s\S]*?Con reservas agendadas<\/span>\s*<\/div>/;

const newBottomLegend = `<div class="row" style="margin-top:12px;font-size:12px;color:var(--mut);justify-content:center;gap:16px">
            <span style="display:inline-flex;align-items:center;gap:5px"><span class="dot" style="background:#EF4444"></span>🔴 Día completo cerrado</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><span class="dot" style="background:#F59E0B"></span>🟠 Turno específico bloqueado (Mañana / Tarde / Noche)</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><span class="dot" style="background:#10B981"></span>🟢 Día con reservas agendadas</span>
          </div>`;

if (!admin.match(oldBottomLegend)) {
  console.error('Error: oldBottomLegend not matched');
} else {
  admin = admin.replace(oldBottomLegend, newBottomLegend);
  console.log('✓ Bottom legend in blocksView updated.');
}

// 4. Update selDateBlocks rendering
const oldSelDateBlocks = /<strong style="color:#dc2626">🔒 \$\{e\(BLOCK_LABELS\[b\.type\] \|\| b\.type\)\}<\/strong>/;

const newSelDateBlocks = `<strong style="color:\${b.type==='full'?'#EF4444':'#F59E0B'}">
                    \${b.type==='full'?'🔴 Día completo cerrado':b.type==='manana'?'☀️ Solo Turno Mañana':b.type==='tarde'?'⛅ Solo Turno Tarde':'🌙 Solo Turno Noche'}
                  </strong>`;

if (!admin.match(oldSelDateBlocks)) {
  console.error('Error: oldSelDateBlocks not matched');
} else {
  admin = admin.replace(oldSelDateBlocks, newSelDateBlocks);
  console.log('✓ selDateBlocks rendering updated.');
}

// 5. Update general table of blocks
const oldTableBadge = /<td><span class="badge" style="background:\$\{b\.type==='full'\?'#dc2626':\(b\.type==='noche'\?'#4338ca':'#d97706'\)\}">\$\{e\(BLOCK_LABELS\[b\.type\] \|\| b\.type\)\}<\/span><\/td>/;

const newTableBadge = `<td><span class="badge" style="background:\${b.type==='full'?'#EF4444':'#F59E0B'}">\${b.type==='manana'?'☀️ Mañana':b.type==='tarde'?'⛅ Tarde':b.type==='noche'?'🌙 Noche':'🔴 Día completo'}</span></td>`;

if (!admin.match(oldTableBadge)) {
  console.error('Error: oldTableBadge not matched');
} else {
  admin = admin.replace(oldTableBadge, newTableBadge);
  console.log('✓ Table badge rendering updated.');
}

fs.writeFileSync('admin.html', admin, 'utf8');
console.log('admin.html updated successfully.');
