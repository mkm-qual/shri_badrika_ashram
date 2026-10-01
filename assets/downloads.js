// Download Pics: single pictures are plain download links; "Download all" zips every picture in the browser
const dlAll = document.getElementById('dlAll');
dlAll.addEventListener('click', () => {
  const files = [...document.querySelectorAll('.dl-info a[download]')].map(a => ({ url: a.getAttribute('href'), name: a.getAttribute('download') }));
  withProgress(dlAll, 'Preparing', (p) => downloadFiles(files, 'sri-badrika-ashram-pictures', p));
});
