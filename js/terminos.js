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
