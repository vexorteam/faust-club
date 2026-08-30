const downloadGroups = {
  gradient: [
    './img/faust-icon-gradient.png',
    './img/faust-logo-gradient-white.png',
    './img/faust-logo-gradient-black.png',
  ],

  white: ['./img/faust-icon-white.png', './img/faust-logo-white.png', './img/faust-logo-gradient-white.png'],
  black: ['./img/faust-icon-black.png', './img/faust-logo-gradient-black.png'],
};

document.querySelectorAll('[data-download-group]').forEach(link => {
  link.addEventListener('click', async event => {
    event.preventDefault();

    const files = downloadGroups[link.dataset.downloadGroup];

    if (!files) return;

    link.classList.add('is-downloading');

    for (const file of files) {
      const download = document.createElement('a');

      download.href = file;
      download.download = '';
      download.style.display = 'none';

      document.body.appendChild(download);
      download.click();
      download.remove();

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    link.classList.remove('is-downloading');
  });
});
