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
        this.longPressStart = null;
        this.isCreatingEvent = false;
        this.previewEvent = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        
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
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.generateTimeGrid();
        this.generateColorPicker();
        this.updateDisplay();
        this.updateCurrentTimeLine();
        this.loadEvents();
        
        // Обновляем текущее время каждую минуту
        setInterval(() => {
            this.updateCurrentTimeLine();
            this.updateCurrentTime();
        }, 60000);
    }
    
    cacheElements() {
        // Основные элементы
        this.dayGrid = document.getElementById('day-grid');
        this.eventsContainer = document.getElementById('events-container');
        this.swipeContainer = document.getElementById('swipe-container');
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
        this.menuBtn = document.getElementById('menu-btn');
    }
    
    setupEventListeners() {
        // Long press для создания события
        this.dayGrid.addEventListener('mousedown', this.handleLongPressStart.bind(this));
        this.dayGrid.addEventListener('touchstart', this.handleLongPressStart.bind(this));
        this.dayGrid.addEventListener('mouseup', this.handleLongPressEnd.bind(this));
        this.dayGrid.addEventListener('touchend', this.handleLongPressEnd.bind(this));
        this.dayGrid.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.dayGrid.addEventListener('touchmove', this.handleTouchMove.bind(this));
        
        // Swipe для переключения дней
        this.swipeContainer.addEventListener('touchstart', this.handleSwipeStart.bind(this));
        this.swipeContainer.addEventListener('touchend', this.handleSwipeEnd.bind(this));
        
        // Кнопки
        this.addEventFab.addEventListener('click', () => this.showCreateEventSheet());
        this.todayBtn.addEventListener('click', () => this.goToToday());
        this.menuBtn.addEventListener('click', () => this.showMenu());
        
        // Sheet события
        this.sheetClose.addEventListener('click', () => this.closeSheet());
        this.sheetOverlay.addEventListener('click', () => this.closeSheet());
        this.saveEventBtn.addEventListener('click', () => this.saveEvent());
        this.deleteEventBtn.addEventListener('click', () => this.deleteEvent());
        
        // Автоматическое расширение sheet при фокусе на названии
        this.eventTitleInput.addEventListener('focus', () => {
            if (this.sheet.classList.contains('open') && !this.expandedContent.style.display) {
                this.expandSheet();
            }
        });
        
        // Drag & Drop для sheet handle
        const sheetHandle = this.sheet.querySelector('.sheet-handle');
        sheetHandle.addEventListener('mousedown', this.startSheetDrag.bind(this));
        sheetHandle.addEventListener('touchstart', this.startSheetDrag.bind(this));
        
        // Обновление времени при изменении
        this.eventStartTime.addEventListener('change', () => this.validateEventTimes());
        this.eventEndTime.addEventListener('change', () => this.validateEventTimes());
        
        // Загрузка/сохранение при закрытии
        window.addEventListener('beforeunload', () => this.saveEvents());
        
        // Service Worker регистрация
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('SW registered:', registration);
                    })
                    .catch(error => {
                        console.log('SW registration failed:', error);
                    });
            });
        }
    }
    
    generateTimeGrid() {
        this.dayGrid.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            
            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            
            const halfHourLine = document.createElement('div');
            halfHourLine.className = 'half-hour-line';
            
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
            colorOption.style.backgroundColor = color.value;
            colorOption.dataset.colorId = color.id;
            colorOption.title = color.name;
            
            if (color.id === this.selectedColor.id) {
                colorOption.classList.add('selected');
            }
            
            colorOption.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                colorOption.classList.add('selected');
                this.selectedColor = color;
            });
            
            colorPicker.appendChild(colorOption);
        });
    }
    
    updateDisplay() {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const dateStr = this.currentDate.toLocaleDateString('ru-RU', {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric'
        }).replace(',', '');
        
        this.currentDateElement.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        this.updateCurrentTime();
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
        
        this.currentTimeLine.style.top = `${topPosition}%`;
        
        // Показываем только если текущий день
        const isToday = now.toDateString() === this.currentDate.toDateString();
        this.currentTimeLine.style.display = isToday ? 'block' : 'none';
    }
    
    handleLongPressStart(e) {
        if (e.target.closest('.event')) return;
        
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const rect = this.dayGrid.getBoundingClientRect();
        const y = clientY - rect.top;
        
        this.longPressStart = {
            x: e.type.includes('touch') ? e.touches[0].clientX : e.clientX,
            y: clientY,
            gridY: y
        };
        
        this.longPressTimer = setTimeout(() => {
            this.startCreatingEvent(y);
        }, 500);
    }
    
    handleLongPressEnd(e) {
        clearTimeout(this.longPressTimer);
        
        if (this.isCreatingEvent && this.previewEvent && this.longPressStart) {
            const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
            
            // Проверяем, был ли это drag (смещение больше 10px)
            const deltaX = Math.abs(clientX - this.longPressStart.x);
            const deltaY = Math.abs(clientY - this.longPressStart.y);
            
            if (deltaX < 10 && deltaY < 10) {
                this.showCreateEventSheet(this.previewEvent.startTime, this.previewEvent.endTime);
            }
        }
        
        this.isCreatingEvent = false;
        this.previewEvent = null;
        this.eventPreview.classList.remove('visible');
    }
    
    handleMouseMove(e) {
        if (!this.longPressStart || !this.isCreatingEvent) return;
        
        const rect = this.dayGrid.getBoundingClientRect();
        const y = e.clientY - rect.top;
        this.updateEventPreview(this.longPressStart.gridY, y);
    }
    
    handleTouchMove(e) {
        if (!this.longPressStart || !this.isCreatingEvent) return;
        e.preventDefault();
        
        const rect = this.dayGrid.getBoundingClientRect();
        const y = e.touches[0].clientY - rect.top;
        this.updateEventPreview(this.longPressStart.gridY, y);
    }
    
    startCreatingEvent(startY) {
        this.isCreatingEvent = true;
        
        const gridHeight = this.dayGrid.offsetHeight;
        const startMinutes = Math.round((startY / gridHeight) * 1440 / 15) * 15;
        const endMinutes = startMinutes + 60; // 1 час по умолчанию
        
        this.previewEvent = {
            startTime: this.minutesToTime(startMinutes),
            endTime: this.minutesToTime(endMinutes),
            startMinutes: startMinutes,
            endMinutes: endMinutes
        };
        
        this.showEventPreview(startMinutes, endMinutes);
    }
    
    updateEventPreview(startY, currentY) {
        if (!this.previewEvent) return;
        
        const gridHeight = this.dayGrid.offsetHeight;
        const endMinutes = Math.round((currentY / gridHeight) * 1440 / 15) * 15;
        
        // Минимальная длительность 15 минут
        if (Math.abs(endMinutes - this.previewEvent.startMinutes) < 15) {
            return;
        }
        
        this.previewEvent.endMinutes = endMinutes;
        this.previewEvent.endTime = this.minutesToTime(endMinutes);
        
        this.showEventPreview(this.previewEvent.startMinutes, endMinutes);
    }
    
    showEventPreview(startMinutes, endMinutes) {
        const top = (startMinutes / 1440) * 100;
        const height = ((endMinutes - startMinutes) / 1440) * 100;
        
        this.eventPreview.style.top = `${top}%`;
        this.eventPreview.style.height = `${height}%`;
        this.eventPreview.classList.add('visible');
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
        }, 300);
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
        
        this.saveEvents();
        this.loadEvents();
        this.closeSheet();
    }
    
    deleteEvent() {
        if (this.editingEventId && confirm('Удалить это событие?')) {
            this.events = this.events.filter(e => e.id !== this.editingEventId);
            this.saveEvents();
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
        const width = groupSize > 1 ? `calc(100% - ${(groupSize * 4) + 4}px)` : 'calc(100% - 16px)';
        
        eventElement.style.top = `${top}%`;
        eventElement.style.height = `${height}%`;
        eventElement.style.left = `${left}px`;
        eventElement.style.width = width;
        
        const color = this.colors.find(c => c.id === event.colorId) || this.colors[0];
        eventElement.style.backgroundColor = color.value;
        
        const content = document.createElement('div');
        content.className = 'event-content';
        content.innerHTML = `
            <div class="event-title">${this.escapeHtml(event.title)}</div>
            <div class="event-time">${event.startTime} - ${event.endTime}</div>
        `;
        
        // Ручки для resize
        const topHandle = document.createElement('div');
        topHandle.className = 'event-resize-handle top';
        topHandle.dataset.edge = 'top';
        
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'event-resize-handle bottom';
        bottomHandle.dataset.edge = 'bottom';
        
        eventEle
