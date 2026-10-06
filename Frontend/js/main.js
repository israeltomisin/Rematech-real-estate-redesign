const menuButton = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const closeButton = document.getElementById('closeBtn');

if (menuButton && mobileMenu && closeButton) {
	const closeMenu = () => {
		mobileMenu.classList.remove('is-open');
		menuButton.setAttribute('aria-expanded', 'false');
		document.body.style.overflow = '';
		menuButton.focus();
	};

	menuButton.addEventListener('click', () => {
		mobileMenu.classList.add('is-open');
		menuButton.setAttribute('aria-expanded', 'true');
		document.body.style.overflow = 'hidden';
		closeButton.focus();
	});

	closeButton.addEventListener('click', closeMenu);
	mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu();
	});
}
