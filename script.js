const isNestedPage = window.location.pathname.includes('/about/') || window.location.pathname.includes('/liturgy/');
const pathPrefix = isNestedPage ? '../' : '';

const navbarFallback = `
<header class="site-header">
  <a class="site-brand" data-href="index.html" href="index.html" aria-label="St. Mary's Syro-Malabar Catholic Church home">
    <img data-src="images/navbarImage.png" src="images/navbarImage.png" alt="St. Mary's Syro-Malabar Catholic Church">
  </a>
  <input class="menu-checkbox" type="checkbox" id="menu-toggle" aria-label="Open navigation menu">
  <label class="menu-button" for="menu-toggle"><span></span><span></span><span></span></label>
  <nav class="site-nav" aria-label="Main navigation">
    <a data-page="home" data-href="index.html" href="index.html">Home</a>
    <details class="nav-dropdown">
      <summary>About</summary>
      <div class="dropdown-menu">
        <a data-page="parish-history" data-section="about" data-href="about/parish-history.html" href="about/parish-history.html">Parish History</a>
        <a data-page="diocese-history" data-section="about" data-href="about/diocese-history.html" href="about/diocese-history.html">Diocese History</a>
        <a data-page="syro-malabar-church" data-section="about" data-href="about/syro-malabar-church.html" href="about/syro-malabar-church.html">Syro-Malabar Church</a>
        <a data-page="our-parish-vicar" data-section="about" data-href="about/our-parish-vicar.html" href="about/our-parish-vicar.html">Our Parish Vicar</a>
      </div>
    </details>
    <details class="nav-dropdown">
      <summary>Liturgy</summary>
      <div class="dropdown-menu">
        <a data-page="liturgical-books" data-section="liturgy" data-href="liturgy/liturgical-books.html" href="liturgy/liturgical-books.html">Liturgical Books</a>
        <a data-page="sacraments" data-section="liturgy" data-href="liturgy/sacraments.html" href="liturgy/sacraments.html">Sacraments</a>
      </div>
    </details>
    <a data-href="index.html#mass-times" href="index.html#mass-times">Mass Times</a>
    <a data-page="ministries" data-href="ministries.html" href="ministries.html">Ministries</a>
    <a data-page="contact" data-href="contact.html" href="contact.html">Contact</a>
    <a class="nav-button" href="https://stthomas.parishon.net/charlotte/site/login" target="_blank" rel="noopener noreferrer">Parish On Net</a>
  </nav>
</header>`;

async function loadNavbar() {
  const navbarMount = document.getElementById('navbar');

  if (!navbarMount) {
    return;
  }

  try {
    const response = await fetch(`${pathPrefix}navbar.html`);

    if (!response.ok) {
      throw new Error('Navbar file could not be loaded.');
    }

    navbarMount.innerHTML = await response.text();
  } catch {
    navbarMount.innerHTML = navbarFallback;
  }

  navbarMount.querySelectorAll('[data-href]').forEach((link) => {
    link.setAttribute('href', `${pathPrefix}${link.dataset.href}`);
  });

  navbarMount.querySelectorAll('[data-src]').forEach((image) => {
    image.setAttribute('src', `${pathPrefix}${image.dataset.src}`);
  });

  const currentPage = document.body.dataset.page;
  const currentSection = document.body.dataset.section;

  navbarMount.querySelectorAll('[data-page]').forEach((link) => {
    if (link.dataset.page === currentPage) {
      link.classList.add('active');
    }
  });

  if (currentSection) {
    const sectionMenu = navbarMount.querySelector(`[data-section="${currentSection}"]`)?.closest('.nav-dropdown');
    sectionMenu?.classList.add('active');
  }

  initNavbarDropdowns(navbarMount);
}

function initNavbarDropdowns(navbarMount) {
  const dropdowns = navbarMount.querySelectorAll('.nav-dropdown');

  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener('toggle', () => {
      if (!dropdown.open) {
        return;
      }

      dropdowns.forEach((otherDropdown) => {
        if (otherDropdown !== dropdown) {
          otherDropdown.removeAttribute('open');
        }
      });
    });
  });

  document.addEventListener('click', (event) => {
    if (navbarMount.contains(event.target)) {
      return;
    }

    dropdowns.forEach((dropdown) => {
      dropdown.removeAttribute('open');
    });
  });
}

function initRevealAnimations() {
  const revealItems = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const revealOnScroll = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealOnScroll.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.01
  });

  revealItems.forEach((item) => {
    revealOnScroll.observe(item);
  });
}

loadNavbar();
initRevealAnimations();
