const fs = require('fs');
let res = fs.readFileSync('reservar.html', 'utf8');

res = res.replace(
  'renderCalendar();\r\n}',
  'renderCalendar();\r\n  if(typeof syncCentralizedBlocks === "function") syncCentralizedBlocks();\r\n}'
);
res = res.replace(
  'renderCalendar();\n}',
  'renderCalendar();\n  if(typeof syncCentralizedBlocks === "function") syncCentralizedBlocks();\n}'
);

fs.writeFileSync('reservar.html', res, 'utf8');
console.log('changeCalMonth updated');
