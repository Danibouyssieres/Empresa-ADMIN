try {
  var t = localStorage.getItem('msa-theme') || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
