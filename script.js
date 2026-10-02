document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => {
    // Убираем активный класс у всех кнопок и секций
    document.querySelectorAll('.tab, .section').forEach(el => el.classList.remove('active'));
    
    // Добавляем активный класс нажатой кнопке
    button.classList.add('active');
    
    // Показываем нужную секцию
    const targetId = button.dataset.target;
    document.getElementById(targetId).classList.add('active');
  });
});
