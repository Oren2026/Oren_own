(function(){
  var main = document.querySelector('main.content');
  if (!main) return;
  var h2s = Array.from(main.querySelectorAll('h2'));
  if (h2s.length < 2) return;

  // Give each h2 a stable id if missing
  h2s.forEach(function(h2, i){
    if (!h2.id) h2.id = 'rnav-' + i;
  });

  // Build nav HTML
  var nav = document.createElement('nav');
  nav.className = 'right-nav';
  nav.setAttribute('aria-label', '頁面大綱');
  nav.innerHTML =
    '<div class="right-nav-title">大綱</div>' +
    '<ul class="right-nav-list">' +
    h2s.map(function(h){
      var label = h.textContent.replace(/^[^\s]+\s/, '');
      return '<li><a href="#' + h.id + '">' + label + '</a></li>';
    }).join('') +
    '</ul>';
  document.body.appendChild(nav);

  // Show when ready
  requestAnimationFrame(function(){ nav.classList.add('visible'); });

  // Smooth scroll on click
  nav.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('href').slice(1);
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // IntersectionObserver for active state
  var links = nav.querySelectorAll('a');
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        links.forEach(function(l){ l.classList.remove('active'); });
        var a = nav.querySelector('a[href="#' + entry.target.id + '"]');
        if (a) a.classList.add('active');
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });
  h2s.forEach(function(h2){ observer.observe(h2); });
})();
