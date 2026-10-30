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

// ===== CONFIGURACIÓN AUTOMÁTICA DE WHATSAPP =====
const WA_NUMBER = "56929990095";
document.querySelectorAll("[data-msg]").forEach(function(a){
  a.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(a.dataset.msg);
  a.target = "_blank"; a.rel = "noopener";
});
document.getElementById("y").textContent = new Date().getFullYear();
// Un solo anillo abierto a la vez
document.querySelectorAll(".ring").forEach(function(d){
  d.addEventListener("toggle", function(){
    if(d.open) document.querySelectorAll(".ring").forEach(function(o){ if(o!==d) o.open=false; });
  });
});
// Pestañas de jornada en versión móvil para la tabla tarifaria
function setRateTab(col){
  var wrap = document.getElementById("rateTableWrap");
  if(wrap) wrap.setAttribute("data-active-col", String(col));
  document.querySelectorAll(".rate-tab").forEach(function(btn){
    btn.classList.toggle("active", btn.getAttribute("data-tab-btn") === String(col));
  });
}
