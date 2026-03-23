let current = 0;
const slides = document.querySelectorAll('.slide');
const total = slides.length;
const progress = document.getElementById('progress');

function showSlide(n) {
    slides.forEach(s => s.classList.remove('active'));
    current = (n + total) % total;
    slides[current].classList.add('active');
    progress.style.width = ((current + 1) / total * 100) + '%';
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') showSlide(current + 1);
    if (e.key === 'ArrowLeft') showSlide(current - 1);
});

document.addEventListener('click', e => {
    if (e.clientX > window.innerWidth / 2) showSlide(current + 1);
    else showSlide(current - 1);
});

showSlide(0);
