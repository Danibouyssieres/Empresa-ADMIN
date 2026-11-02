const TM_K = "msa-theme";
function getTheme(){try{const s=localStorage.getItem(TM_K);if(s)return s}catch(x){}return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  try{localStorage.setItem(TM_K,t)}catch(x){}
  const btn=document.getElementById('themeBtn');
  if(btn) btn.textContent = t==='dark' ? '☀️' : '🌙';
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||getTheme();
  applyTheme(cur==='dark'?'light':'dark');
}
applyTheme(getTheme());
addEventListener('storage',function(ev){if(ev.key===TM_K)applyTheme(ev.newValue)});

function setRateTab(col){
  var wrap = document.getElementById("rateTableWrap");
  if(wrap) wrap.setAttribute("data-active-col", String(col));
  document.querySelectorAll(".rate-tab").forEach(function(btn){
    btn.classList.toggle("active", btn.getAttribute("data-tab-btn") === String(col));
  });
}


// ===== DESCARGA DE TÉRMINOS Y CONDICIONES EN PDF =====
function descargarTerminosPdf(e) {
  if (window.location.protocol === 'file:') {
    if (e && e.preventDefault) e.preventDefault();
    generarTerminosPdfHtml2Pdf();
    return false;
  }
  fetch('/Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf', { method: 'HEAD' })
    .then(function(res) {
      if (!res.ok) generarTerminosPdfHtml2Pdf();
    })
    .catch(function() {
      generarTerminosPdfHtml2Pdf();
    });
}
window.descargarTerminosPdf = descargarTerminosPdf;

function generarTerminosPdfHtml2Pdf() {
  var docElem = document.querySelector('main') || document.body;
  if (typeof html2pdf !== 'undefined') {
    var opt = {
      margin: [10, 10, 10, 10],
      filename: 'Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(docElem).save();
  } else {
    window.print();
  }
}
window.generarTerminosPdfHtml2Pdf = generarTerminosPdfHtml2Pdf;
