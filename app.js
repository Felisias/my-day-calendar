// Основной класс приложения
class PersonalCalendar {
    constructor() {
        this.currentDate = new Date();
        this.events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        this.editingEventId = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeEdge = null;
        this.longPressTimer = null;
        this.touchStart = null;
        this.isCreatingEvent = false;
        this.previewEvent = null;
        
        // Цвета Google Calendar
        this.colors = [
            { id: 1, name: 'Фламинго', value: '#e67c73' },
            { id: 2, name: 'Шалфей', value: '#33b679' },
            { id: 3, name: 'Банан', value: '#f6bf26' },
            { id: 4, name: 'Гранат', value: '#d50000' },
            { id: 5, name: 'Лаванда', value: '#8e24aa' },
            { id: 6, name: 'Море', value: '#039be5' },
            { id: 7, name: 'Олово', value: '#616161' },
            { id: 8, name: 'Графит', value: '#3f51b5' },
            { id: 9, name: 'Голубика', value: '#7986cb' }
        ];
        
        this.selectedColor = this.colors[0];
        
        // Инициализация
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.generateTimeGrid();
        this.generateColorPicker();
        this.updateDisplay();
        this.loadEvents();
        
        // Инициализация событий
        this.setupEventListeners();
        
        // Обновление времени
        this.updateCurrentTime();
        this.updateCurrentTimeLine();
        setInterval(() => {
            this.updateCurrentTime();
            this.updateCurrentTimeLine();
        }, 60000);
    }
    
    cacheElements() {
        // Основные элементы
        this.dayGrid = document.getElementById('day-grid');
        this.eventsContainer = document.getElementById('events-container');
        this.currentDateElement = document.getElementById('current-date');
        this.currentTimeElement = document.getElementById('current-time');
        this.currentTimeLine = document.getElementById('current-time-line');
        
        // Sheet элементы
        this.sheet = document.getElementById('event-sheet');
        this.sheetOverlay = document.getElementById('sheet-overlay');
        this.sheetClose = document.getElementById('sheet-close');
        this.eventPreview = document.getElementById('event-preview');
        
        // Форма события
        this.eventTitleInput = document.getElementById('event-title');
        this.eventStartTime = document.getElementById('event-start-time');
        this.eventEndTime = document.getElementById('event-end-time');
        this.eventRepeat = document.getElementById('event-repeat');
        this.eventDescription = document.getElementById('event-description');
        this.saveEventBtn = document.getElementById('save-event-btn');
        this.deleteEventBtn = document.getElementById('delete-event-btn');
        this.expandedContent = document.getElementById('expanded-content');
        this.sheetTitle = document.getElementById('sheet-title');
        
        // Кнопки
        this.addEventFab = document.getElementById('add-event-fab');
        this.todayBtn = document.getElementById('today-btn');
    }
    
    setupEventListeners() {
        // Простые клики вместо сложных жестов для GitHub Pages
        this.dayGrid.addEventListener('click', (e) => {
            if (e.target.closest('.event')) return;
            if (this.isCreatingEvent) return;
            
            const rect = this.dayGrid.getBoundingClientRect();
            const y = e.clientY - rect.top;
            this.handleGridClick(y);
        });
        
        // Тач события для мобильных
        this.dayGrid.addEventListener('touchend', (e) => {
            if (e.target.closest('.event')) return;
            if (this.isCreatingEvent) return;
            
            e.preventDefault();
            const rect = this.dayGrid.getBoundingClientRect();
            const y = e.changedTouches[0].clientY - rect.top;
            this.handleGridClick(y);
        });
        
        // Кнопка добавления
        this.addEventFab.addEventListener('click', () => {
            this.showCreateEventSheet();
        });
        
        // Кнопка "Сегодня"
        this.todayBtn.addEventListener('click', () => {
            this.goToToday();
        });
        
        // Sheet события
        this.sheetClose.addEventListener('click', () => this.closeSheet());
        this.sheetOverlay.addEventListener('click', () => this.closeSheet());
        this.saveEventBtn.addEventListener('click', () => this.saveEvent());
        this.deleteEventBtn.addEventListener('click', () => this.deleteEvent());
        
        // Автофокус на названии
        this.eventTitleInput.addEventListener('focus', () => {
            if (this.sheet.classList.contains('open')) {
                this.expandSheet();
            }
        });
        
        // Валидация времени
        this.eventStartTime.addEventListener('change', () => this.validateEventTimes());
        this.eventEndTime.addEventListener('change', () => this.validateEventTimes());
        
        // Swipe для дней
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!touchStartX) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Горизонтальный свайп
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.previousDay();
                } else {
                    this.nextDay();
                }
            }
            
            touchStartX = 0;
            touchStartY = 0;
        });
        
        // Клавиши для навигации
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousDay();
            } else if (e.key === 'ArrowRight') {
                this.nextDay();
            } else if (e.key === 't' || e.key === 'T') {
                this.goToToday();
            } else if (e.key === 'Escape' && this.sheet.classList.contains('open')) {
                this.closeSheet();
            }
        });
    }
    
    handleGridClick(y) {
        const gridHeight = this.dayGrid.offsetHeight;
        const startMinutes = Math.round((y / gridHeight) * 1440 / 15) * 15;
        const endMinutes = startMinutes + 60;
        
        this.showCreateEventSheet(
            this.minutesToTime(startMinutes),
            this.minutesToTime(endMinutes)
        );
    }
    
    generateTimeGrid() {
        this.dayGrid.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.style.height = '60px';
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            timeLabel.style.position = 'absolute';
            timeLabel.style.top = '-10px';
            timeLabel.style.left = '8px';
            timeLabel.style.fontSize = '12px';
            timeLabel.style.color = '#70757a';
            timeLabel.style.width = '40px';
            timeLabel.style.textAlign = 'right';
            
            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            hourLine.style.position = 'absolute';
            hourLine.style.left = '56px';
            hourLine.style.right = '0';
            hourLine.style.height = '1px';
            hourLine.style.background = '#dadce0';
            hourLine.style.top = '0';
            
            const halfHourLine = document.createElement('div');
            halfHourLine.className = 'half-hour-line';
            halfHourLine.style.position = 'absolute';
            halfHourLine.style.left = '56px';
            halfHourLine.style.right = '0';
            halfHourLine.style.height = '1px';
            halfHourLine.style.background = '#e8eaed';
            halfHourLine.style.top = '30px';
            
            timeSlot.appendChild(timeLabel);
            timeSlot.appendChild(hourLine);
            timeSlot.appendChild(halfHourLine);
            
            this.dayGrid.appendChild(timeSlot);
        }
    }
    
    generateColorPicker() {
        const colorPicker = document.getElementById('color-picker');
        colorPicker.innerHTML = '';
        
        this.colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.cssText = `
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid transparent;
                background-color: ${color.value};
                transition: transform 0.2s;
            `;
            colorOption.dataset.colorId = color.id;
            colorOption.title = color.name;
            
            if (color.id === this.selectedColor.id) {
                colorOption.style.borderColor = '#202124';
                colorOption.style.transform = 'scale(1.1)';
            }
            
            colorOption.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.style.borderColor = 'transparent';
                    opt.style.transform = 'scale(1)';
                });
                colorOption.style.borderColor = '#202124';
                colorOption.style.transform = 'scale(1.1)';
                this.selectedColor = color;
            });
            
            colorPicker.appendChild(colorOption);
        });
    }
    
    updateDisplay() {
        const dateStr = this.currentDate.toLocaleDateString('ru-RU', {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric'
        }).replace(',', '');
        
        this.currentDateElement.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }
    
    updateCurrentTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        this.currentTimeElement.textContent = timeStr;
    }
    
    updateCurrentTimeLine() {
        const now = new Date();
        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
        const topPosition = (minutesSinceMidnight / 1440) * 100;
        
        // Показываем только если текущий день
        const isToday = now.toDateString() === this.currentDate.toDateString();
        
        if (isToday) {
            this.currentTimeLine.style.top = `${topPosition}%`;
            this.currentTimeLine.style.display = 'block';
        } else {
            this.currentTimeLine.style.display = 'none';
        }
    }
    
    showCreateEventSheet(startTime = '09:00', endTime = '10:00') {
        this.editingEventId = null;
        this.sheetTitle.textContent = 'Новое событие';
        this.eventTitleInput.value = '';
        this.eventStartTime.value = startTime;
        this.eventEndTime.value = endTime;
        this.eventRepeat.value = 'none';
        this.eventDescription.value = '';
        this.selectedColor = this.colors[0];
        this.generateColorPicker();
        
        this.deleteEventBtn.style.display = 'none';
        this.expandedContent.style.display = 'none';
        
        this.openSheet();
        
        // Фокусируемся на названии
        setTimeout(() => {
            this.eventTitleInput.focus();
        }, 100);
    }
    
    showEditEventSheet(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        this.editingEventId = eventId;
        this.sheetTitle.textContent = 'Редактировать событие';
        this.eventTitleInput.value = event.title;
        this.eventStartTime.value = event.startTime;
        this.eventEndTime.value = event.endTime;
        this.eventRepeat.value = event.repeat || 'none';
        this.eventDescription.value = event.description || '';
        
        // Выбираем цвет
        const color = this.colors.find(c => c.id === event.colorId) || this.colors[0];
        this.selectedColor = color;
        this.generateColorPicker();
        
        this.deleteEventBtn.style.display = 'flex';
        this.expandedContent.style.display = 'block';
        
        this.openSheet();
    }
    
    openSheet() {
        this.sheet.classList.add('open');
        this.sheetOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
    
    closeSheet() {
        this.sheet.classList.remove('open');
        this.sheetOverlay.classList.remove('visible');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            this.expandedContent.style.display = '';
        }, 300);
    }
    
    expandSheet() {
        this.expandedContent.style.display = 'block';
        this.expandedContent.classList.add('slide-in');
    }
    
    saveEvent() {
        const title = this.eventTitleInput.value.trim();
        if (!title) {
            this.eventTitleInput.focus();
            return;
        }
        
        const eventData = {
            id: this.editingEventId || Date.now().toString(),
            title: title,
            startTime: this.eventStartTime.value,
            endTime: this.eventEndTime.value,
            colorId: this.selectedColor.id,
            repeat: this.eventRepeat.value,
            description: this.eventDescription.value,
            date: this.currentDate.toISOString().split('T')[0]
        };
        
        if (this.editingEventId) {
            const index = this.events.findIndex(e => e.id === this.editingEventId);
            if (index !== -1) {
                this.events[index] = eventData;
            }
        } else {
            this.events.push(eventData);
        }
        
        localStorage.setItem('calendarEvents', JSON.stringify(this.events));
        this.loadEvents();
        this.closeSheet();
    }
    
    deleteEvent() {
        if (this.editingEventId && confirm('Удалить это событие?')) {
            this.events = this.events.filter(e => e.id !== this.editingEventId);
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
            this.loadEvents();
            this.closeSheet();
        }
    }
    
    validateEventTimes() {
        const start = this.timeToMinutes(this.eventStartTime.value);
        const end = this.timeToMinutes(this.eventEndTime.value);
        
        if (end <= start) {
            this.eventEndTime.value = this.minutesToTime(start + 60);
        }
    }
    
    loadEvents() {
        this.eventsContainer.innerHTML = '';
        
        const currentDateStr = this.currentDate.toISOString().split('T')[0];
        const dayEvents = this.events.filter(event => event.date === currentDateStr);
        
        // Сортируем события по времени начала
        dayEvents.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        
        // Группируем пересекающиеся события
        const groups = this.groupOverlappingEvents(dayEvents);
        
        groups.forEach((group, groupIndex) => {
            group.forEach((event, eventIndex) => {
                this.createEventElement(event, group.length, eventIndex);
            });
        });
    }
    
    groupOverlappingEvents(events) {
        if (events.length === 0) return [];
        
        const groups = [];
        let currentGroup = [];
        let lastEnd = -1;
        
        events.forEach(event => {
            const start = this.timeToMinutes(event.startTime);
            
            if (start >= lastEnd) {
                if (currentGroup.length > 0) {
                    groups.push([...currentGroup]);
                }
                currentGroup = [event];
                lastEnd = this.timeToMinutes(event.endTime);
            } else {
                currentGroup.push(event);
                lastEnd = Math.max(lastEnd, this.timeToMinutes(event.endTime));
            }
        });
        
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        
        return groups;
    }
    
    createEventElement(event, groupSize, indexInGroup) {
        const startMinutes = this.timeToMinutes(event.startTime);
        const endMinutes = this.timeToMinutes(event.endTime);
        const duration = endMinutes - startMinutes;
        
        const top = (startMinutes / 1440) * 100;
        const height = (duration / 1440) * 100;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.dataset.eventId = event.id;
        
        // Позиционирование для пересекающихся событий
        const left = 8 + (indexInGroup * 4);
        const rightOffset = (groupSize - indexInGroup - 1) * 4 + 8;
        
        eventElement.style.cssText = `
            position: absolute;
            top: ${top}%;
            height: ${height}%;
            left: ${left}px;
            right: ${rightOffset}px;
            border-radius: 4px;
            padding: 8px;
            overflow: hidden;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s, transform 0.1s;
            background-color: ${this.colors.find(c => c.id === event.colorId)?.value || '#1a73e8'};
            color: white;
            z-index: 10;
        `;
        
        const content = document.createElement('div');
        content.className = 'event-content';
        content.innerHTML = `
            <div class="event-title" style="font-size: 14px; font-weight: 500; line-height: 1.3;">${this.escapeHtml(event.title)}</div>
            <div class="event-time" style="font-size: 12px; opacity: 0.9; margin-top: 2px;">${event.startTime} - ${event.endTime}</div>
        `;
        
        // Drag ручки
        const topHandle = document.createElement('div');
        topHandle.className = 'event-resize-handle top';
        topHandle.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 6px;
            cursor: ns-resize;
            z-index: 2;
            top: 0;
        `;
        
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'event-resize-handle bottom';
        bottomHandle.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 6px;
            cursor: ns-resize;
            z-index: 2;
            bottom: 0;
        `;
        
        eventElement.appendChild(content);
        eventElement.appendChild(topHandle);
        eventElement.appendChild(bottomHandle);
        
        // Клик для редактирования
        eventElement.addEventListener('click', (e) => {
            if (e.target.closest('.event-resize-handle')) return;
            this.showEditEventSheet(event.id);
        });
        
        // Простой drag & drop
        let isDragging = false;
        let startY = 0;
        let startTop = 0;
        
        eventElement.addEventListener('mousedown', (e) => {
            if (e.target.closest('.event-resize-handle')) {
                this.startResize(e, eventElement, event);
                return;
            }
            
            isDragging = true;
            startY = e.clientY;
            startTop = top;
            eventElement.style.opacity = '0.8';
            eventElement.style.zIndex = '1000';
            eventElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            
            const onMouseMove = (moveEvent) => {
                if (!isDragging) return;
                
                const deltaY = moveEvent.clientY - startY;
                const gridHeight = this.dayGrid.offsetHeight;
                const deltaMinutes = (deltaY / gridHeight) * 1440;
                const newTopMinutes = (startTop / 100) * 1440 + deltaMinutes;
                const snappedMinutes = Math.round(newTopMinutes / 15) * 15;
                
                const duration = this.timeToMinutes(event.endTime) - this.timeToMinutes(event.startTime);
                const newStartTime = this.minutesToTime(Math.max(0, Math.min(1440 - duration, snappedMinutes)));
                const newEndTime = this.minutesToTime(this.timeToMinutes(newStartTime) + duration);
                
                eventElement.style.top = `${(snappedMinutes / 1440) * 100}%`;
                event.startTime = newStartTime;
                event.endTime = newEndTime;
                
                const timeElement = eventElement.querySelector('.event-time');
                if (timeElement) {
                    timeElement.textContent = `${newStartTime} - ${newEndTime}`;
                }
            };
            
            const onMouseUp = () => {
                isDragging = false;
                eventElement.style.opacity = '1';
                eventElement.style.zIndex = '10';
                eventElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                
                localStorage.setItem('calendarEvents', JSON.stringify(this.events));
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // Resize
        topHandle.addEventListener('mousedown', (e) => this.startResize(e, eventElement, event, 'top'));
        bottomHandle.addEventListener('mousedown', (e) => this.startResize(e, eventElement, event, 'bottom'));
        
        this.eventsContainer.appendChild(eventElement);
    }
    
    startResize(e, eventElement, event, edge = 'top') {
        e.stopPropagation();
        
        const startY = e.clientY;
        const startHeight = parseFloat(eventElement.style.height);
        const startTop = parseFloat(eventElement.style.top);
        
        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const gridHeight = this.dayGrid.offsetHeight;
            const deltaMinutes = (deltaY / gridHeight) * 1440;
            const snappedDeltaMinutes = Math.round(deltaMinutes / 15) * 15;
            
            const startMinutes = this.timeToMinutes(event.startTime);
            const endMinutes = this.timeToMinutes(event.endTime);
            
            let newStartMinutes = startMinutes;
            let newEndMinutes = endMinutes;
            let newHeight = startHeight;
            let newTop = startTop;
            
            if (edge === 'top') {
                newStartMinutes = Math.max(0, Math.min(endMinutes - 15, startMinutes + snappedDeltaMinutes));
                newHeight = ((endMinutes - newStartMinutes) / 1440) * 100;
                newTop = (newStartMinutes / 1440) * 100;
                
                eventElement.style.top = `${newTop}%`;
                eventElement.style.height = `${newHeight}%`;
                
                event.startTime = this.minutesToTime(newStartMinutes);
            } else {
                newEndMinutes = Math.min(1440, Math.max(startMinutes + 15, endMinutes + snappedDeltaMinutes));
                newHeight = ((newEndMinutes - startMinutes) / 1440) * 100;
                
                eventElement.style.height = `${newHeight}%`;
                
                event.endTime = this.minutesToTime(newEndMinutes);
            }
            
            const timeElement = eventElement.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
        };
        
        const onMouseUp = () => {
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    previousDay() {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        this.updateDisplay();
        this.loadEvents();
        this.updateCurrentTimeLine();
    }
    
    nextDay() {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        this.updateDisplay();
        this.loadEvents();
        this.updateCurrentTimeLine();
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.updateDisplay();
        this.loadEvents();
        this.updateCurrentTimeLine();
    }
    
    // Вспомогательные методы
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    minutesToTime(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Удаляем Service Worker регистрацию для GitHub Pages
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.log('Service Worker не зарегистрирован:', err));
    }
    
    // Запускаем приложение
    window.calendarApp = new PersonalCalendar();
    
    // Простая PWA инсталляция
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Показываем кнопку установки
        setTimeout(() => {
            if (confirm('Хотите установить приложение на устройство?')) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => {
                    deferredPrompt = null;
                });
            }
        }, 3000);
    });
});
