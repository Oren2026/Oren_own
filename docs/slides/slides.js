let current = 0;
const slides = document.querySelectorAll('.slide');
const total = slides.length;
const progress = document.getElementById('progress');

function showSlide(n) {
    slides.forEach(s => s.classList.remove('active'));
    current = (n + total) % total;
    slides[current].classList.add('active');
    progress.style.width = ((current + 1) / total * 100) + '%';
    updateDots();
}

function updateDots() {
    document.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
    });
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') showSlide(current + 1);
    if (e.key === 'ArrowLeft') showSlide(current - 1);
});

// Desktop click navigation
document.addEventListener('click', e => {
    // Ignore clicks on dots, quiz options, and cards
    if (e.target.closest('.dot') || e.target.closest('.quiz-option') || e.target.closest('.rocket-card') || e.target.closest('.quiz-box')) return;
    if (e.clientX > window.innerWidth / 2) showSlide(current + 1);
    else showSlide(current - 1);
});

// Touch swipe navigation
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    if (Math.abs(diff) < threshold) return;
    // Don't swipe if user was scrolling vertically
    if (Math.abs(diff) < Math.abs(touchStartY - touchEndY)) return;
    if (diff > 0) showSlide(current + 1);  // swipe left = next
    else showSlide(current - 1);            // swipe right = prev
}

// Vertical scroll within slide content (for mobile)
let touchStartY = 0;
document.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].screenY;
}, { passive: true });

showSlide(0);
