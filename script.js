document.querySelectorAll('.tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    // Снять активность со всех вкладок и секций
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });

    // Активировать текущую вкладку и секцию
    btn.classList.add('active');
    var target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');

    // Прокрутить наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
