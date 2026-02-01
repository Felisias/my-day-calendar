// Основной класс приложения
class PersonalCalendar {
    constructor() {
        this.currentDate = new Date();
        this.events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        this.editingEventId = null;
        
        // Состояние свайпа
        this.swipeState = {
            isSwiping: false,
            startX: 0,
            startY: 0,
            currentTranslateX: 0,
            direction: null,
            velocity: 0,
            lastMoveTime: 0
        };
        
        // Состояние создания события
        this.creationState = {
            isCreating: false,
            dayIndex: null,
            startY: 0,
            endY: 0,
            previewElement: null,
            resizeEdge: null
        };
        
        // Состояние sheet
        this.sheetState = {
            isDragging: false,
            startY: 0,
            startHeight: 0
        };
        
        // Состояние редактирования времени
        this.timeEditState = {
            isResizing: false,
            resizeEdge: null,
            element: null,
            event: null,
            startY: 0,
            startTop: 0,
            startHeight: 0
        };
        
        // Дни для отображения
        this.days = [];
        this.currentDayIndex = 1; // Центральный день
        
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
        this.setupDays();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateCurrentTimeLine();
        
        // Обновление времени
        this.updateCurrentTime();
        setInterval(() => {
            this.updateCurrentTime();
            this.updateCurrentTimeLine();
        }, 60000);
        
        // Проверка клавиатуры
        this.setupKeyboardDetection();
    }
    
    cacheElements() {
        this.daysContainer = document.getElementById('days-container');
        this.currentDateElement = document.getElementById('current-date');
        this.currentTimeElement = document.getElementById('current-time');
        this.currentTimeLine = document.createElement('div');
        this.currentTimeLine.className = 'current-time-line';
        document.body.appendChild(this.currentTimeLine);
        
        // Sheet элементы
        this.sheet = document.getElementById('event-sheet');
        this.sheetOverlay = document.getElementById('sheet-overlay');
        this.sheetClose = document.getElementById('sheet-close');
        this.sheetContent = document.getElementById('sheet-content');
        
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
        
        // Preview
        this.eventPreview = document.getElementById('event-preview');
        
        // Индикаторы свайпа
        this.swipeLeft = document.getElementById('swipe-left');
        this.swipeRight = document.getElementById('swipe-right');
    }
    
    setupDays() {
        this.daysContainer.innerHTML = '';
        this.days = [];
        
        // Создаем 5 дней для плавной навигации
        for (let i = -2; i <= 2; i++) {
            const date = new Date(this.currentDate);
            date.setDate(date.getDate() + i);
            
            const dayWrapper = document.createElement('div');
            dayWrapper.className = 'day-wrapper';
            dayWrapper.dataset.date = date.toISOString().split('T')[0];
            dayWrapper.dataset.index = i + 2;
            
            const dayScroll = document.createElement('div');
            dayScroll.className = 'day-scroll';
            
            const dayGrid = document.createElement('div');
            dayGrid.className = 'day-grid';
            
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'events-container';
            
            const dockingZone = document.createElement('div');
            dockingZone.className = 'sheet-docking-zone';
            
            // Генерация временной сетки
            this.generateTimeGrid(dayGrid);
            
            dayScroll.appendChild(dayGrid);
            dayWrapper.appendChild(dayScroll);
            dayWrapper.appendChild(eventsContainer);
            dayWrapper.appendChild(dockingZone);
            this.daysContainer.appendChild(dayWrapper);
            
            this.days.push({
                element: dayWrapper,
                date: date,
                scrollElement: dayScroll,
                eventsContainer: eventsContainer,
                dockingZone: dockingZone,
                events: []
            });
        }
        
        // Устанавливаем позиции
        this.updateDayPositions();
        
        // Загружаем события для всех дней
        this.loadAllEvents();
    }
    
    generateTimeGrid(container) {
        container.innerHTML = '';
        
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
            
            container.appendChild(timeSlot);
        }
    }
    
    updateDayPositions() {
        this.days.forEach((day, index) => {
            const translateX = (index - this.currentDayIndex) * 100;
            day.element.style.transform = `translateX(${translateX}%)`;
            
            // Обновляем классы
            day.element.classList.remove('prev', 'current', 'next');
            if (index < this.currentDayIndex) {
                day.element.classList.add('prev');
            } else if (index > this.currentDayIndex) {
                day.element.classList.add('next');
            } else {
                day.element.classList.add('current');
            }
        });
    }
    
    setupEventListeners() {
        // Свайп дней
        this.setupSwipeListeners();
        
        // Создание событий
        this.setupCreationListeners();
        
        // Кнопки
        this.addEventFab.addEventListener('click', () => this.showCreateEventSheet());
        this.todayBtn.addEventListener('click', () => this.goToToday());
        
        // Sheet события
        this.sheetClose.addEventListener('click', () => this.closeSheet());
        this.sheetOverlay.addEventListener('click', () => this.closeSheet());
        this.saveEventBtn.addEventListener('click', () => this.saveEvent());
        this.deleteEventBtn.addEventListener('click', () => this.deleteEvent());
        
        // Sheet drag
        const sheetHandle = this.sheet.querySelector('.sheet-handle');
        sheetHandle.addEventListener('touchstart', (e) => this.startSheetDrag(e));
        sheetHandle.addEventListener('mousedown', (e) => this.startSheetDrag(e));
        
        // Автофокус и поднятие sheet
        this.eventTitleInput.addEventListener('focus', () => {
            this.expandSheet();
            this.scrollSheetToInput();
        });
        
        // Валидация времени
        this.eventStartTime.addEventListener('change', () => this.validateEventTimes());
        this.eventEndTime.addEventListener('change', () => this.validateEventTimes());
        
        // Клавиши для навигации
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigateDays(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateDays(1);
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                this.goToToday();
            } else if (e.key === 'Escape' && this.sheet.classList.contains('open')) {
                this.closeSheet();
            }
        });
        
        // Ресайз окна
        window.addEventListener('resize', () => {
            this.updateCurrentTimeLine();
        });
    }
    
    setupSwipeListeners() {
        let startX, startY, startTime;
        
        const handleStart = (clientX, clientY) => {
            startX = clientX;
            startY = clientY;
            startTime = Date.now();
            this.swipeState.isSwiping = false;
            this.swipeState.startX = clientX;
            this.swipeState.startY = clientY;
            this.swipeState.velocity = 0;
            this.swipeState.lastMoveTime = startTime;
        };
        
        const handleMove = (clientX, clientY) => {
            if (startX === undefined) return;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const currentTime = Date.now();
            const timeDiff = currentTime - this.swipeState.lastMoveTime;
            
            if (!this.swipeState.isSwiping) {
                // Определяем направление
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    this.swipeState.isSwiping = true;
                    this.swipeState.direction = 'horizontal';
                } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
                    this.swipeState.isSwiping = true;
                    this.swipeState.direction = 'vertical';
                }
            }
            
            if (this.swipeState.isSwiping && this.swipeState.direction === 'horizontal') {
                // Плавный свайп дней
                const translateX = (deltaX / window.innerWidth) * 100;
                this.swipeState.currentTranslateX = translateX;
                
                this.days.forEach((day, index) => {
                    const baseTranslate = (index - this.currentDayIndex) * 100;
                    day.element.style.transform = `translateX(${baseTranslate + translateX}%)`;
                    day.element.style.transition = 'none';
                });
                
                // Показываем индикаторы
                if (deltaX > 50) {
                    this.swipeLeft.classList.add('visible');
                    this.swipeRight.classList.remove('visible');
                } else if (deltaX < -50) {
                    this.swipeRight.classList.add('visible');
                    this.swipeLeft.classList.remove('visible');
                } else {
                    this.swipeLeft.classList.remove('visible');
                    this.swipeRight.classList.remove('visible');
                }
                
                // Рассчитываем скорость для инерции
                if (timeDiff > 0) {
                    this.swipeState.velocity = deltaX / timeDiff;
                }
                this.swipeState.lastMoveTime = currentTime;
            }
        };
        
        const handleEnd = (clientX) => {
            if (startX === undefined || !this.swipeState.isSwiping) {
                startX = undefined;
                return;
            }
            
            const deltaX = clientX - startX;
            const timeDiff = Date.now() - startTime;
            const velocity = this.swipeState.velocity;
            
            if (this.swipeState.direction === 'horizontal') {
                // Определяем, нужно ли переключить день
                const threshold = window.innerWidth * 0.25;
                const velocityThreshold = 0.5;
                
                let shouldNavigate = false;
                let direction = 0;
                
                if (Math.abs(deltaX) > threshold) {
                    shouldNavigate = true;
                    direction = deltaX > 0 ? -1 : 1;
                } else if (Math.abs(velocity) > velocityThreshold && timeDiff < 300) {
                    shouldNavigate = true;
                    direction = velocity > 0 ? -1 : 1;
                }
                
                if (shouldNavigate) {
                    this.navigateDays(direction);
                } else {
                    // Возвращаем на место с анимацией
                    this.days.forEach(day => {
                        day.element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    });
                    this.updateDayPositions();
                }
                
                // Скрываем индикаторы
                this.swipeLeft.classList.remove('visible');
                this.swipeRight.classList.remove('visible');
            }
            
            // Сбрасываем состояние
            this.swipeState.isSwiping = false;
            this.swipeState.direction = null;
            startX = undefined;
        };
        
        // Touch события
        this.daysContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        }, { passive: false });
        
        this.daysContainer.addEventListener('touchmove', (e) => {
            if (!this.swipeState.isSwiping || e.touches.length !== 1) return;
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }, { passive: false });
        
        this.daysContainer.addEventListener('touchend', (e) => {
            if (startX === undefined) return;
            const touch = e.changedTouches[0];
            handleEnd(touch.clientX);
        });
        
        // Mouse события
        this.daysContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
            
            const onMouseMove = (e) => {
                handleMove(e.clientX, e.clientY);
            };
            
            const onMouseUp = (e) => {
                handleEnd(e.clientX);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    setupCreationListeners() {
        // Клик по сетке для создания события
        this.daysContainer.addEventListener('click', (e) => {
            // Проверяем, что клик не на событии и не на интерактивном элементе
            if (e.target.closest('.event') || 
                e.target.closest('.event-resize-handle') ||
                e.target.closest('.preview-resize-handle')) {
                return;
            }
            
            // Находим день по координатам
            const dayElement = e.target.closest('.day-wrapper');
            if (!dayElement) return;
            
            const dayIndex = parseInt(dayElement.dataset.index);
            const day = this.days[dayIndex];
            
            // Получаем позицию относительно сетки
            const rect = day.scrollElement.getBoundingClientRect();
            const y = e.clientY - rect.top + day.scrollElement.scrollTop;
            
            // Создаем событие
            this.startEventCreation(dayIndex, y);
        });
        
        // Preview resize
        const topHandle = this.eventPreview.querySelector('.preview-resize-handle.top');
        const bottomHandle = this.eventPreview.querySelector('.preview-resize-handle.bottom');
        
        topHandle.addEventListener('mousedown', (e) => this.startPreviewResize(e, 'top'));
        bottomHandle.addEventListener('mousedown', (e) => this.startPreviewResize(e, 'bottom'));
        
        topHandle.addEventListener('touchstart', (e) => this.startPreviewResize(e, 'top'));
        bottomHandle.addEventListener('touchstart', (e) => this.startPreviewResize(e, 'bottom'));
    }
    
    startEventCreation(dayIndex, y) {
        const day = this.days[dayIndex];
        const gridHeight = day.scrollElement.scrollHeight;
        const visibleHeight = day.scrollElement.clientHeight;
        
        // Нормализуем позицию
        const relativeY = Math.min(Math.max(y, 0), gridHeight);
        const startPercent = (relativeY / gridHeight) * 100;
        
        // Начальные значения
        const startMinutes = Math.round((startPercent / 100) * 1440 / 15) * 15;
        const endMinutes = startMinutes + 60;
        
        // Показываем preview
        this.showEventPreview(day, startPercent, endMinutes - startMinutes);
        
        // Сохраняем состояние
        this.creationState.isCreating = true;
        this.creationState.dayIndex = dayIndex;
        this.creationState.startY = relativeY;
        this.creationState.endY = relativeY + (visibleHeight * 0.1); // 10% высоты экрана
        
        // Через 300мс открываем sheet
        setTimeout(() => {
            if (this.creationState.isCreating) {
                this.showCreateEventSheet(
                    this.minutesToTime(startMinutes),
                    this.minutesToTime(endMinutes)
                );
            }
        }, 300);
    }
    
    showEventPreview(day, topPercent, durationMinutes) {
        const heightPercent = (durationMinutes / 1440) * 100;
        
        this.eventPreview.style.top = `${topPercent}%`;
        this.eventPreview.style.height = `${heightPercent}%`;
        this.eventPreview.style.left = '64px';
        this.eventPreview.style.right = '8px';
        this.eventPreview.classList.add('visible');
        
        // Добавляем в правильный день
        day.element.appendChild(this.eventPreview);
    }
    
    startPreviewResize(e, edge) {
        e.stopPropagation();
        e.preventDefault();
        
        if (!this.creationState.isCreating) return;
        
        this.creationState.resizeEdge = edge;
        const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const startTop = parseFloat(this.eventPreview.style.top);
        const startHeight = parseFloat(this.eventPreview.style.height);
        
        const onMove = (clientY) => {
            const day = this.days[this.creationState.dayIndex];
            const deltaY = clientY - startY;
            const deltaPercent = (deltaY / day.scrollElement.clientHeight) * 100;
            
            let newTop = startTop;
            let newHeight = startHeight;
            
            if (edge === 'top') {
                newTop = Math.max(0, Math.min(startTop + deltaPercent, startTop + startHeight - 2.5));
                newHeight = startHeight + startTop - newTop;
            } else {
                newHeight = Math.max(2.5, Math.min(startHeight + deltaPercent, 100 - startTop));
            }
            
            // Плавное изменение
            this.eventPreview.style.transition = 'top 0.1s, height 0.1s';
            this.eventPreview.style.top = `${newTop}%`;
            this.eventPreview.style.height = `${newHeight}%`;
            
            // Обновляем время в sheet если он открыт
            if (this.sheet.classList.contains('open')) {
                const startMinutes = Math.round((newTop / 100) * 1440 / 15) * 15;
                const endMinutes = startMinutes + Math.round((newHeight / 100) * 1440 / 15) * 15;
                
                this.eventStartTime.value = this.minutesToTime(startMinutes);
                this.eventEndTime.value = this.minutesToTime(endMinutes);
            }
        };
        
        const onEnd = () => {
            this.eventPreview.style.transition = '';
            this.creationState.resizeEdge = null;
        };
        
        // Мышь
        if (!e.type.includes('touch')) {
            const onMouseMove = (e) => onMove(e.clientY);
            const onMouseUp = () => {
                onEnd();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            // Тач
            const onTouchMove = (e) => {
                e.preventDefault();
                onMove(e.touches[0].clientY);
            };
            const onTouchEnd = () => {
                onEnd();
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }
    }
    
    navigateDays(direction) {
        const newIndex = this.currentDayIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.days.length) {
            this.currentDayIndex = newIndex;
            this.currentDate = new Date(this.days[newIndex].date);
            this.updateDisplay();
            this.updateDayPositions();
            
            // Подгружаем события для соседних дней если нужно
            this.checkAndLoadMoreDays();
        } else {
            // Нужно создать новые дни
            this.shiftDays(direction);
        }
        
        // Обновляем линию времени
        this.updateCurrentTimeLine();
    }
    
    shiftDays(direction) {
        // Сдвигаем массив дней
        if (direction > 0) {
            // Удаляем первый день, добавляем новый в конец
            const firstDay = this.days.shift();
            firstDay.element.remove();
            
            const newDate = new Date(this.days[this.days.length - 1].date);
            newDate.setDate(newDate.getDate() + 1);
            
            this.createDayElement(newDate, this.days.length);
            
            // Обновляем индексы
            this.days.forEach((day, index) => {
                day.element.dataset.index = index;
            });
            
            this.currentDayIndex--;
        } else {
            // Удаляем последний день, добавляем новый в начало
            const lastDay = this.days.pop();
            lastDay.element.remove();
            
            const newDate = new Date(this.days[0].date);
            newDate.setDate(newDate.getDate() - 1);
            
            this.createDayElement(newDate, -1);
            this.days.unshift(this.days[0]);
            this.days[0] = this.days[1];
            this.days[1] = this.createDayData(newDate, 0);
            
            // Обновляем индексы
            this.days.forEach((day, index) => {
                if (day.element) {
                    day.element.dataset.index = index;
                }
            });
            
            this.currentDayIndex++;
        }
        
        this.updateDayPositions();
        this.loadAllEvents();
    }
    
    createDayElement(date, index) {
        const dayWrapper = document.createElement('div');
        dayWrapper.className = 'day-wrapper';
        dayWrapper.dataset.date = date.toISOString().split('T')[0];
        dayWrapper.dataset.index = index;
        
        const dayScroll = document.createElement('div');
        dayScroll.className = 'day-scroll';
        
        const dayGrid = document.createElement('div');
        dayGrid.className = 'day-grid';
        
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'events-container';
        
        const dockingZone = document.createElement('div');
        dockingZone.className = 'sheet-docking-zone';
        
        this.generateTimeGrid(dayGrid);
        
        dayScroll.appendChild(dayGrid);
        dayWrapper.appendChild(dayScroll);
        dayWrapper.appendChild(eventsContainer);
        dayWrapper.appendChild(dockingZone);
        this.daysContainer.appendChild(dayWrapper);
        
        return {
            element: dayWrapper,
            date: date,
            scrollElement: dayScroll,
            eventsContainer: eventsContainer,
            dockingZone: dockingZone,
            events: []
        };
    }
    
    createDayData(date, index) {
        const element = this.createDayElement(date, index);
        return element;
    }
    
    checkAndLoadMoreDays() {
        // Загружаем события для соседних дней
        const indicesToLoad = [];
        if (this.currentDayIndex <= 1) indicesToLoad.push(0);
        if (this.currentDayIndex >= this.days.length - 2) indicesToLoad.push(this.days.length - 1);
        
        indicesToLoad.forEach(index => {
            this.loadEventsForDay(index);
        });
    }
    
    loadAllEvents() {
        this.days.forEach((day, index) => {
            this.loadEventsForDay(index);
        });
    }
    
    loadEventsForDay(dayIndex) {
        const day = this.days[dayIndex];
        const dateStr = day.date.toISOString().split('T')[0];
        day.events = this.events.filter(event => event.date === dateStr);
        
        day.eventsContainer.innerHTML = '';
        
        // Сортируем события
        day.events.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        
        // Группируем пересекающиеся события
        const groups = this.groupOverlappingEvents(day.events);
        
        groups.forEach((group, groupIndex) => {
            group.forEach((event, eventIndex) => {
                this.createEventElement(event, group.length, eventIndex, day);
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
    
    createEventElement(event, groupSize, indexInGroup, day) {
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
        
        // Ручки для resize (только при редактировании)
        const topHandle = document.createElement('div');
        topHandle.className = 'event-resize-handle top';
        topHandle.dataset.edge = 'top';
        
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'event-resize-handle bottom';
        bottomHandle.dataset.edge = 'bottom';
        
        eventElement.appendChild(content);
        eventElement.appendChild(topHandle);
        eventElement.appendChild(bottomHandle);
        
        // Клик для редактирования
        eventElement.addEventListener('click', (e) => {
            if (e.target.closest('.event-resize-handle')) return;
            this.showEditEventSheet(event.id);
        });
        
        // Drag & Drop события
        this.setupEventDrag(eventElement, event, day);
        
        // Resize только при активном редактировании
        const setupResize = (handle, edge) => {
            handle.addEventListener('mousedown', (e) => this.startEventResize(e, eventElement, event, edge, day));
            handle.addEventListener('touchstart', (e) => this.startEventResize(e, eventElement, event, edge, day));
        };
        
        setupResize(topHandle, 'top');
        setupResize(bottomHandle, 'bottom');
        
        day.eventsContainer.appendChild(eventElement);
    }
    
    setupEventDrag(element, event, day) {
        let isDragging = false;
        let startY = 0;
        let startTop = 0;
        
        const startDrag = (clientY) => {
            if (this.timeEditState.isResizing) return;
            
            isDragging = true;
            startY = clientY;
            startTop = parseFloat(element.style.top);
            element.classList.add('dragging');
        };
        
        const onMove = (clientY) => {
            if (!isDragging) return;
            
            const deltaY = clientY - startY;
            const deltaPercent = (deltaY / day.scrollElement.clientHeight) * 100;
            const newTop = Math.max(0, Math.min(startTop + deltaPercent, 100 - parseFloat(element.style.height)));
            
            // Плавное движение
            element.style.transition = 'top 0.1s';
            element.style.top = `${newTop}%`;
            
            // Обновляем время события
            const newMinutes = Math.round((newTop / 100) * 1440 / 15) * 15;
            const duration = this.timeToMinutes(event.endTime) - this.timeToMinutes(event.startTime);
            
            event.startTime = this.minutesToTime(newMinutes);
            event.endTime = this.minutesToTime(newMinutes + duration);
            
            // Обновляем отображение времени
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
        };
        
        const endDrag = () => {
            if (!isDragging) return;
            
            isDragging = false;
            element.classList.remove('dragging');
            element.style.transition = '';
            
            // Сохраняем изменения
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
        };
        
        // Мышь
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.event-resize-handle')) return;
            e.stopPropagation();
            startDrag(e.clientY);
            
            const onMouseMove = (e) => onMove(e.clientY);
            const onMouseUp = () => {
                endDrag();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // Тач
        element.addEventListener('touchstart', (e) => {
            if (e.target.closest('.event-resize-handle')) return;
            e.stopPropagation();
            startDrag(e.touches[0].clientY);
            
            const onTouchMove = (e) => {
                e.preventDefault();
                onMove(e.touches[0].clientY);
            };
            const onTouchEnd = () => {
                endDrag();
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        });
    }
    
    startEventResize(e, element, event, edge, day) {
        e.stopPropagation();
        e.preventDefault();
        
        // Помечаем событие как редактируемое для показа ручек
        element.classList.add('editing');
        
        this.timeEditState.isResizing = true;
        this.timeEditState.resizeEdge = edge;
        this.timeEditState.element = element;
        this.timeEditState.event = event;
        this.timeEditState.startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        this.timeEditState.startTop = parseFloat(element.style.top);
        this.timeEditState.startHeight = parseFloat(element.style.height);
        
        const onMove = (clientY) => {
            const deltaY = clientY - this.timeEditState.startY;
            const deltaPercent = (deltaY / day.scrollElement.clientHeight) * 100;
            
            let newTop = this.timeEditState.startTop;
            let newHeight = this.timeEditState.startHeight;
            
            if (edge === 'top') {
                newTop = Math.max(0, Math.min(this.timeEditState.startTop + deltaPercent, 
                    this.timeEditState.startTop + this.timeEditState.startHeight - 2.5));
                newHeight = this.timeEditState.startHeight + this.timeEditState.startTop - newTop;
            } else {
                newHeight = Math.max(2.5, Math.min(this.timeEditState.startHeight + deltaPercent, 
                    100 - this.timeEditState.startTop));
            }
            
            // Плавное изменение
            element.style.transition = 'top 0.1s, height 0.1s';
            element.style.top = `${newTop}%`;
            element.style.height = `${newHeight}%`;
            
            // Обновляем время события
            const startMinutes = Math.round((newTop / 100) * 1440 / 15) * 15;
            const endMinutes = startMinutes + Math.round((newHeight / 100) * 1440 / 15) * 15;
            
            event.startTime = this.minutesToTime(startMinutes);
            event.endTime = this.minutesToTime(endMinutes);
            
            // Обновляем отображение времени
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
        };
        
        const onEnd = () => {
            this.timeEditState.isResizing = false;
            element.classList.remove('editing');
            element.style.transition = '';
            
            // Сохраняем изменения
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
        };
        
        // Мышь
        if (!e.type.includes('touch')) {
            const onMouseMove = (e) => onMove(e.clientY);
            const onMouseUp = () => {
                onEnd();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            // Тач
            const onTouchMove = (e) => {
                e.preventDefault();
                onMove(e.touches[0].clientY);
            };
            const onTouchEnd = () => {
                onEnd();
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }
    }
    
    showCreateEventSheet(startTime = '09:00', endTime = '10:00') {
        // Скрываем preview
        this.eventPreview.classList.remove('visible');
        this.creationState.isCreating = false;
        
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
        
        setTimeout(() => {
            this.eventTitleInput.focus();
        }, 350);
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
        
        const color = this.colors.find(c => c.id === event.colorId) || this.colors[0];
        this.selectedColor = color;
        this.generateColorPicker();
        
        this.deleteEventBtn.style.display = 'flex';
        this.expandedContent.style.display = 'block';
        
        this.openSheet();
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
    
    openSheet() {
        this.sheet.classList.remove('docked');
        this.sheet.classList.add('open');
        this.sheetOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
    
    closeSheet() {
        this.sheet.classList.remove('open', 'docked');
        this.sheetOverlay.classList.remove('visible');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            this.expandedContent.style.display = '';
            this.sheetState.isDocked = false;
        }, 300);
    }
    
    expandSheet() {
        this.expandedContent.style.display = 'block';
        this.expandedContent.classList.add('slide-in');
    }
    
    scrollSheetToInput() {
        // Прокручиваем sheet чтобы показать поле ввода когда открывается клавиатура
        setTimeout(() => {
            const inputRect = this.eventTitleInput.getBoundingClientRect();
            const sheetRect = this.sheetContent.getBoundingClientRect();
            
            if (inputRect.bottom > sheetRect.bottom - 100) {
                this.eventTitleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
    
    setupKeyboardDetection() {
        // Определяем открытие/закрытие клавиатуры
        const visualViewport = window.visualViewport;
        
        if (visualViewport) {
            visualViewport.addEventListener('resize', () => {
                if (visualViewport.height < window.innerHeight * 0.7) {
                    // Клавиатура открыта
                    document.body.classList.add('keyboard-open');
                    this.scrollSheetToInput();
                } else {
                    // Клавиатура закрыта
                    document.body.classList.remove('keyboard-open');
                }
            });
        }
        
        // Также слушаем фокус на инпутах
        const inputs = [this.eventTitleInput, this.eventStartTime, this.eventEndTime, 
                       this.eventDescription, this.eventRepeat];
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    this.scrollSheetToInput();
                }, 300);
            });
        });
    }
    
    startSheetDrag(e) {
        e.preventDefault();
        
        const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const startHeight = this.sheet.offsetHeight;
        
        this.sheetState.isDragging = true;
        this.sheetState.startY = startY;
        this.sheetState.startHeight = startHeight;
        
        const onMove = (clientY) => {
            if (!this.sheetState.isDragging) return;
            
            const deltaY = clientY - this.sheetState.startY;
            const newHeight = Math.max(160, Math.min(window.innerHeight * 0.9, startHeight - deltaY));
            
            const percentVisible = (newHeight / (window.innerHeight * 0.9)) * 100;
            
            if (percentVisible < 30) {
                // Притягиваем к док-зоне
                this.sheet.classList.add('docked');
                
                // Показываем док-зону на текущем дне
                const currentDay = this.days[this.currentDayIndex];
                if (currentDay) {
                    currentDay.dockingZone.classList.add('active');
                }
            } else {
                this.sheet.classList.remove('docked');
                const currentDay = this.days[this.currentDayIndex];
                if (currentDay) {
                    currentDay.dockingZone.classList.remove('active');
                }
            }
        };
        
        const onEnd = () => {
            this.sheetState.isDragging = false;
            
            const currentDay = this.days[this.currentDayIndex];
            if (currentDay) {
                currentDay.dockingZone.classList.remove('active');
            }
        };
        
        // Мышь
        if (!e.type.includes('touch')) {
            const onMouseMove = (e) => onMove(e.clientY);
            const onMouseUp = () => {
                onEnd();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            // Тач
            const onTouchMove = (e) => {
                e.preventDefault();
                onMove(e.touches[0].clientY);
            };
            const onTouchEnd = () => {
                onEnd();
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }
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
        this.loadEventsForDay(this.currentDayIndex);
        this.closeSheet();
    }
    
    deleteEvent() {
        if (this.editingEventId && confirm('Удалить это событие?')) {
            this.events = this.events.filter(e => e.id !== this.editingEventId);
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
            this.loadEventsForDay(this.currentDayIndex);
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
        const currentDay = this.days[this.currentDayIndex];
        
        if (!currentDay) return;
        
        // Проверяем, что это сегодня
        const isToday = now.toDateString() === currentDay.date.toDateString();
        
        if (isToday) {
            const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
            const topPosition = (minutesSinceMidnight / 1440) * 100;
            
            // Получаем позицию относительно видимого дня
            const dayRect = currentDay.scrollElement.getBoundingClientRect();
            const scrollTop = currentDay.scrollElement.scrollTop;
            const scrollHeight = currentDay.scrollElement.scrollHeight;
            const clientHeight = currentDay.scrollElement.clientHeight;
            
            // Рассчитываем абсолютную позицию на экране
            const absoluteTop = dayRect.top + (scrollHeight * (topPosition / 100)) - scrollTop;
            
            // Показываем только если линия в видимой области
            if (absoluteTop >= dayRect.top && absoluteTop <= dayRect.top + clientHeight) {
                this.currentTimeLine.style.top = `${absoluteTop}px`;
                this.currentTimeLine.style.display = 'block';
            } else {
                this.currentTimeLine.style.display = 'none';
            }
        } else {
            this.currentTimeLine.style.display = 'none';
        }
        
        // Обновляем при скролле
        currentDay.scrollElement.addEventListener('scroll', () => {
            this.updateCurrentTimeLine();
        }, { passive: true });
    }
    
    goToToday() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Ищем день с сегодняшней датой
        const todayIndex = this.days.findIndex(day => {
            const dayStr = day.date.toISOString().split('T')[0];
            return dayStr === todayStr;
        });
        
        if (todayIndex !== -1) {
            this.currentDayIndex = todayIndex;
        } else {
            // Создаем новый набор дней с сегодняшним днем в центре
            this.currentDate = today;
            this.setupDays();
            this.currentDayIndex = 2; // Центр массива из 5 дней
        }
        
        this.currentDate = today;
        this.updateDisplay();
        this.updateDayPositions();
        this.loadAllEvents();
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new PersonalCalendar();
});
