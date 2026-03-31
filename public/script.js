document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navUl = document.querySelector('nav ul');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navUl.classList.toggle('active');
            
            // Transform hamburger to X
            const spans = mobileMenuToggle.querySelectorAll('span');
            spans[0].classList.toggle('rotate-45');
            spans[1].classList.toggle('opacity-0');
            spans[2].classList.toggle('rotate-neg-45');
        });
    }
});
