// Переключение вкладок
function showTab(tabName) {
    // Скрываем все вкладки
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Убираем активный класс у всех кнопок
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Показываем нужную вкладку
    document.getElementById(tabName).classList.add('active');
    
    // Делаем кнопку активной
    event.currentTarget.classList.add('active');
}

// Копирование кода
function copyCode() {
    const code = document.querySelector('.code-block code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('✅ Код скопирован!');
    }).catch(err => {
        alert('❌ Ошибка копирования');
    });
}

// Анимация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.feature-card, .tech-item');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    console.log('⚖️ Dark Arbitr Bot сайт загружен!');
});
