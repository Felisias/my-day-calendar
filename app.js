// Основной класс приложения
class PersonalCalendar {
    constructor() {
        this.currentDate = new Date();
        this.events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        this.editingEventId = null;
        
        // Состояния свайпа и скролла
        this.swipeState = {
            startX: 0,
            startY: 0,
            isSwiping: false,
            direction: null,
            currentDayOffset: 0
        };
        
        // Состояния создания события
        this.creationState = {
            isCreating: false,
            startY: 0,
            endY: 0,
            startTime: null,
            endTime: null,
            element: null
        };
        
        // Состояния sheet
        this.sheetState = {
            isDragging: false,
            startY: 0,
            startHeight: 0,
            isDocked: false
        };
        
        // Дни для отображения
        this.days = [];
        this.currentDayIndex = 0;
        
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
        this.generateDays();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateCurrentTime();
        
        // Обновление времени каждую минуту
        setInterval(() => {
            this.updateCurrentTime();
        }, 60000);
    }
    
    cacheElements() {
        // Основные элементы
        this.daysContainer = document.getElementById('days-container');
        this.currentDateElement = document.getElementById('current-date');
        this.currentTimeElement = document.getElementById('current-time');
        
        // Sheet элементы
        this.sheet = document.getElementById('event-sheet');
        this.sheetOverlay = document.getElementById('sheet-overlay');
        this.sheetClose = document.getElementById('sheet-close');
        
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
        
        // Индикаторы свайпа
        this.swipeLeft = document.getElementById('swipe-left');
        this.swipeRight = document.getElementById('swipe-right');
    }
    
    setupEventListeners() {
        // События для контейнера дней
        this.daysContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.daysContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.daysContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Мышь для десктопа
        this.daysContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
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
        
        // Автофокус
        this.eventTitleInput.addEventListener('focus', () => {
            if (this.sheet.classList.contains('open') && !this.expandedContent.style.display) {
                this.expandSheet();
            }
        });
        
        // Валидация времени
        this.eventStartTime.addEventListener('change', () => this.validateEventTimes());
        this.eventEndTime.addEventListener('change', () => this.validateEventTimes());
        
        // Клавиши
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.navigateDays(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateDays(1);
            } else if (e.key === 't' || e.key === 'T') {
                this.goToToday();
            } else if (e.key === 'Escape') {
                this.closeSheet();
            }
        });
    }
    
    generateDays() {
        this.daysContainer.innerHTML = '';
        this.days = [];
        
        // Создаем 3 дня: вчера, сегодня, завтра
        for (let i = -1; i <= 1; i++) {
            const date = new Date();
            date.setDate(this.currentDate.getDate() + i);
            
            const dayWrapper = document.createElement('div');
            dayWrapper.className = 'day-wrapper';
            dayWrapper.dataset.date = date.toISOString().split('T')[0];
            
            if (i === 0) {
                dayWrapper.style.transform = 'translateX(0)';
            } else if (i < 0) {
                dayWrapper.style.transform = 'translateX(-100%)';
            } else {
                dayWrapper.style.transform = 'translateX(100%)';
            }
            
            const dayScroll = document.createElement('div');
            dayScroll.className = 'day-scroll';
            
            const dayGrid = document.createElement('div');
            dayGrid.className = 'day-grid';
            
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'events-container';
            
            const dockingZone = document.createElement('div');
            dockingZone.className = 'sheet-docking-zone';
            
            const currentTimeLine = document.createElement('div');
            currentTimeLine.className = 'current-time-line';
            
            // Генерация временной сетки
            this.generateTimeGrid(dayGrid);
            
            dayScroll.appendChild(dayGrid);
            dayWrapper.appendChild(dayScroll);
            dayWrapper.appendChild(eventsContainer);
            dayWrapper.appendChild(dockingZone);
            dayWrapper.appendChild(currentTimeLine);
            this.daysContainer.appendChild(dayWrapper);
            
            this.days.push({
                element: dayWrapper,
                date: date,
                scrollElement: dayScroll,
                eventsContainer: eventsContainer,
                dockingZone: dockingZone,
                currentTimeLine: currentTimeLine
            });
        }
        
        this.currentDayIndex = 1; // Центральный день (сегодня)
        this.loadEventsForDay(this.currentDayIndex);
        this.updateCurrentTimeLine();
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
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.swipeState.startX = touch.clientX;
        this.swipeState.startY = touch.clientY;
        this.swipeState.isSwiping = false;
        
        // Проверяем, не начали ли мы создавать событие
        const rect = this.days[this.currentDayIndex].element.getBoundingClientRect();
        const y = touch.clientY - rect.top + this.days[this.currentDayIndex].scrollElement.scrollTop;
        
        // Если тап на свободном месте и не на событии
        if (!this.isTouchOnEvent(touch.clientX, touch.clientY)) {
            this.creationState.startY = y;
            this.creationState.isCreating = false;
        }
    }
    
    handleTouchMove(e) {
        if (!this.swipeState.startX) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.swipeState.startX;
        const deltaY = touch.clientY - this.swipeState.startY;
        
        // Определяем направление свайпа
        if (!this.swipeState.isSwiping) {
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                this.swipeState.isSwiping = true;
                this.swipeState.direction = 'horizontal';
                e.preventDefault();
            } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
                this.swipeState.isSwiping = true;
                this.swipeState.direction = 'vertical';
            }
        }
        
        if (this.swipeState.isSwiping) {
            if (this.swipeState.direction === 'horizontal') {
                e.preventDefault();
                
                // Анимируем сдвиг дней
                this.days.forEach((day, index) => {
                    let offset = 0;
                    if (index < this.currentDayIndex) {
                        offset = -100 + (deltaX / window.innerWidth) * 100;
                    } else if (index > this.currentDayIndex) {
                        offset = 100 + (deltaX / window.innerWidth) * 100;
                    } else {
                        offset = (deltaX / window.innerWidth) * 100;
                    }
                    day.element.style.transform = `translateX(${offset}%)`;
                });
                
                // Показываем индикаторы свайпа
                if (deltaX > 50) {
                    this.swipeLeft.classList.add('visible');
                } else if (deltaX < -50) {
                    this.swipeRight.classList.add('visible');
                } else {
                    this.swipeLeft.classList.remove('visible');
                    this.swipeRight.classList.remove('visible');
                }
            } else if (this.swipeState.direction === 'vertical') {
                // Создание события если отпустить в том же месте
                if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
                    // Ждем отпускания
                } else {
                    // Это скролл, отменяем создание события
                    this.creationState.isCreating = false;
                }
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.swipeState.isSwiping) {
            // Просто тап - создаем событие если отпустили в том же месте
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - this.swipeState.startX);
            const deltaY = Math.abs(touch.clientY - this.swipeState.startY);
            
            if (deltaX < 5 && deltaY < 5 && !this.isTouchOnEvent(touch.clientX, touch.clientY)) {
                // Создаем событие
                const rect = this.days[this.currentDayIndex].element.getBoundingClientRect();
                const y = touch.clientY - rect.top + this.days[this.currentDayIndex].scrollElement.scrollTop;
                this.createEventAtPosition(y);
            }
        } else if (this.swipeState.direction === 'horizontal') {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - this.swipeState.startX;
            
            // Определяем, нужно ли переключить день
            if (Math.abs(deltaX) > window.innerWidth * 0.2) {
                if (deltaX > 0) {
                    this.navigateDays(-1); // Свайп вправо -> предыдущий день
                } else {
                    this.navigateDays(1); // Свайп влево -> следующий день
                }
            } else {
                // Возвращаем на место
                this.resetDayPositions();
            }
            
            // Скрываем индикаторы
            this.swipeLeft.classList.remove('visible');
            this.swipeRight.classList.remove('visible');
        }
        
        this.swipeState.isSwiping = false;
        this.swipeState.direction = null;
        this.swipeState.startX = 0;
        this.swipeState.startY = 0;
    }
    
    handleMouseDown(e) {
        if (e.button !== 0) return; // Только левая кнопка
        
        this.swipeState.startX = e.clientX;
        this.swipeState.startY = e.clientY;
        this.swipeState.isSwiping = false;
        
        // Проверяем, не на событии ли клик
        if (!this.isMouseOnEvent(e.clientX, e.clientY)) {
            this.creationState.startY = e.clientY + this.days[this.currentDayIndex].scrollElement.scrollTop;
            this.creationState.isCreating = false;
        }
    }
    
    handleMouseMove(e) {
        if (!this.swipeState.startX) return;
        
        const deltaX = e.clientX - this.swipeState.startX;
        const deltaY = e.clientY - this.swipeState.startY;
        
        if (!this.swipeState.isSwiping) {
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
                this.swipeState.isSwiping = true;
                this.swipeState.direction = 'horizontal';
            } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
                this.swipeState.isSwiping = true;
                this.swipeState.direction = 'vertical';
            }
        }
        
        if (this.swipeState.isSwiping && this.swipeState.direction === 'horizontal') {
            // Анимируем сдвиг дней
            this.days.forEach((day, index) => {
                let offset = 0;
                if (index < this.currentDayIndex) {
                    offset = -100 + (deltaX / window.innerWidth) * 100;
                } else if (index > this.currentDayIndex) {
                    offset = 100 + (deltaX / window.innerWidth) * 100;
                } else {
                    offset = (deltaX / window.innerWidth) * 100;
                }
                day.element.style.transform = `translateX(${offset}%)`;
            });
            
            // Показываем индикаторы
            if (deltaX > 50) {
                this.swipeLeft.classList.add('visible');
            } else if (deltaX < -50) {
                this.swipeRight.classList.add('visible');
            } else {
                this.swipeLeft.classList.remove('visible');
                this.swipeRight.classList.remove('visible');
            }
        }
    }
    
    handleMouseUp(e) {
        if (!this.swipeState.isSwiping) {
            // Просто клик - создаем событие если отпустили в том же месте
            const deltaX = Math.abs(e.clientX - this.swipeState.startX);
            const deltaY = Math.abs(e.clientY - this.swipeState.startY);
            
            if (deltaX < 5 && deltaY < 5 && !this.isMouseOnEvent(e.clientX, e.clientY)) {
                const y = e.clientY + this.days[this.currentDayIndex].scrollElement.scrollTop;
                this.createEventAtPosition(y);
            }
        } else if (this.swipeState.direction === 'horizontal') {
            const deltaX = e.clientX - this.swipeState.startX;
            
            if (Math.abs(deltaX) > window.innerWidth * 0.2) {
                if (deltaX > 0) {
                    this.navigateDays(-1);
                } else {
                    this.navigateDays(1);
                }
            } else {
                this.resetDayPositions();
            }
            
            this.swipeLeft.classList.remove('visible');
            this.swipeRight.classList.remove('visible');
        }
        
        this.swipeState.isSwiping = false;
        this.swipeState.direction = null;
        this.swipeState.startX = 0;
        this.swipeState.startY = 0;
    }
    
    isTouchOnEvent(x, y) {
        const elements = document.elementsFromPoint(x, y);
        return elements.some(el => el.classList.contains('event'));
    }
    
    isMouseOnEvent(x, y) {
        return this.isTouchOnEvent(x, y);
    }
    
    createEventAtPosition(y) {
        const gridHeight = 1440; // 24 часа в минутах
        const containerHeight = this.days[this.currentDayIndex].scrollElement.scrollHeight;
        const scrollTop = this.days[this.currentDayIndex].scrollElement.scrollTop;
        const visibleHeight = this.days[this.currentDayIndex].scrollElement.clientHeight;
        
        // Нормализуем позицию
        const normalizedY = Math.min(Math.max(y, scrollTop), scrollTop + visibleHeight);
        const relativeY = normalizedY - scrollTop;
        
        const startMinutes = Math.round((relativeY / visibleHeight) * gridHeight / 15) * 15;
        const endMinutes = startMinutes + 60;
        
        this.showCreateEventSheet(
            this.minutesToTime(startMinutes),
            this.minutesToTime(endMinutes)
        );
    }
    
    navigateDays(direction) {
        const newIndex = this.currentDayIndex + direction;
        
        if (newIndex < 0 || newIndex >= this.days.length) {
            // Нужно загрузить новые дни
            this.loadMoreDays(direction);
            return;
        }
        
        // Анимация смены дней
        this.days.forEach((day, index) => {
            let offset = 0;
            if (index < newIndex) {
                offset = -100;
            } else if (index > newIndex) {
                offset = 100;
            }
            day.element.style.transform = `translateX(${offset}%)`;
        });
        
        // Обновляем текущий день
        setTimeout(() => {
            this.currentDayIndex = newIndex;
            this.currentDate = new Date(this.days[newIndex].date);
            this.updateDisplay();
            this.loadEventsForDay(newIndex);
            this.updateCurrentTimeLine();
            this.resetDayPositions();
        }, 300);
    }
    
    resetDayPositions() {
        this.days.forEach((day, index) => {
            let offset = 0;
            if (index < this.currentDayIndex) {
                offset = -100;
            } else if (index > this.currentDayIndex) {
                offset = 100;
            }
            day.element.style.transform = `translateX(${offset}%)`;
        });
    }
    
    loadMoreDays(direction) {
        // Упрощенная версия - просто создаем новый день
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + (direction * 3));
        
        this.currentDate = newDate;
        this.generateDays();
    }
    
    loadEventsForDay(dayIndex) {
        const day = this.days[dayIndex];
        const dateStr = day.date.toISOString().split('T')[0];
        const dayEvents = this.events.filter(event => event.date === dateStr);
        
        day.eventsContainer.innerHTML = '';
        
        // Сортируем события
        dayEvents.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        
        // Группируем пересекающиеся события
        const groups = this.groupOverlappingEvents(dayEvents);
        
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
        
        // Ручки для resize
        const topHandle = document.createElement('div');
        topHandle.className = 'event-resize-handle top';
        topHandle.dataset.edge = 'top';
        
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'event-resize-handle bottom';
        bottomHandle.dataset.edge = 'bottom';
        
        eventElement.appendChild(content);
        eventElement.appendChild(topHandle);
        eventElement.appendChild(bottomHandle);
        
        // События
        eventElement.addEventListener('click', (e) => {
            if (e.target.closest('.event-resize-handle')) return;
            this.showEditEventSheet(event.id);
        });
        
        // Drag & Drop
        this.setupEventDrag(eventElement, event, day);
        
        // Resize
        topHandle.addEventListener('mousedown', (e) => this.startResize(e, eventElement, event, 'top'));
        bottomHandle.addEventListener('mousedown', (e) => this.startResize(e, eventElement, event, 'bottom'));
        topHandle.addEventListener('touchstart', (e) => this.startResize(e, eventElement, event, 'top'));
        bottomHandle.addEventListener('touchstart', (e) => this.startResize(e, eventElement, event, 'bottom'));
        
        day.eventsContainer.appendChild(eventElement);
    }
    
    setupEventDrag(element, event, day) {
        let isDragging = false;
        let startY = 0;
        let startTop = 0;
        
        const startDrag = (clientY) => {
            isDragging = true;
            startY = clientY;
            startTop = parseFloat(element.style.top);
            element.classList.add('dragging');
        };
        
        const onMove = (clientY) => {
            if (!isDragging) return;
            
            const deltaY = clientY - startY;
            const deltaPercent = (deltaY / day.eventsContainer.offsetHeight) * 100;
            const newTop = startTop + deltaPercent;
            const newMinutes = (newTop / 100) * 1440;
            const snappedMinutes = Math.round(newMinutes / 15) * 15;
            
            const duration = this.timeToMinutes(event.endTime) - this.timeToMinutes(event.startTime);
            const newStartTime = this.minutesToTime(Math.max(0, Math.min(1440 - duration, snappedMinutes)));
            const newEndTime = this.minutesToTime(this.timeToMinutes(newStartTime) + duration);
            
            element.style.top = `${(snappedMinutes / 1440) * 100}%`;
            event.startTime = newStartTime;
            event.endTime = newEndTime;
            
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${newStartTime} - ${newEndTime}`;
            }
        };
        
        const endDrag = () => {
            isDragging = false;
            element.classList.remove('dragging');
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
    
    startResize(e, element, event, edge) {
        e.stopPropagation();
        
        const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const startHeight = parseFloat(element.style.height);
        const startTop = parseFloat(element.style.top);
        
        const container = element.parentElement;
        
        const onMove = (clientY) => {
            const deltaY = clientY - startY;
            const deltaMinutes = (deltaY / container.offsetHeight) * 1440;
            const snappedDeltaMinutes = Math.round(deltaMinutes / 15) * 15;
            
            const startMinutes = this.timeToMinutes(event.startTime);
            const endMinutes = this.timeToMinutes(event.endTime);
            
            let newStartMinutes = startMinutes;
            let newEndMinutes = endMinutes;
            
            if (edge === 'top') {
                newStartMinutes = Math.max(0, Math.min(endMinutes - 15, startMinutes + snappedDeltaMinutes));
                const newHeight = ((endMinutes - newStartMinutes) / 1440) * 100;
                const newTop = (newStartMinutes / 1440) * 100;
                
                element.style.top = `${newTop}%`;
                element.style.height = `${newHeight}%`;
                
                event.startTime = this.minutesToTime(newStartMinutes);
            } else {
                newEndMinutes = Math.min(1440, Math.max(startMinutes + 15, endMinutes + snappedDeltaMinutes));
                const newHeight = ((newEndMinutes - startMinutes) / 1440) * 100;
                
                element.style.height = `${newHeight}%`;
                
                event.endTime = this.minutesToTime(newEndMinutes);
            }
            
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
        };
        
        const onEnd = () => {
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
            e.preventDefault();
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
        
        const color = this.colors.find(c => c.id === event.colorId) || this.colors[0];
        this.selectedColor = color;
        this.generateColorPicker();
        
        this.deleteEventBtn.style.display = 'flex';
        this.expandedContent.style.display = 'block';
        
        this.openSheet();
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
            const newHeight = Math.max(200, Math.min(window.innerHeight * 0.9, startHeight - deltaY));
            
            const percentVisible = (newHeight / (window.innerHeight * 0.9)) * 100;
            
            if (percentVisible < 40) {
                // Притягиваем к док-зоне
                this.sheet.classList.add('docked');
                this.sheetState.isDocked = true;
                
                // Показываем док-зону на текущем дне
                this.days[this.currentDayIndex].dockingZone.classList.add('active');
            } else {
                this.sheet.classList.remove('docked');
                this.sheetState.isDocked = false;
                this.days[this.currentDayIndex].dockingZone.classList.remove('active');
            }
        };
        
        const onEnd = () => {
            this.sheetState.isDragging = false;
            
            if (this.sheetState.isDocked) {
                this.sheet.classList.add('docked');
            } else {
                this.sheet.classList.remove('docked');
            }
            
            this.days[this.currentDayIndex].dockingZone.classList.remove('active');
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
        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
        const topPosition = (minutesSinceMidnight / 1440) * 100;
        
        this.days.forEach((day, index) => {
            const isToday = now.toDateString() === day.date.toDateString();
            
            if (isToday) {
                day.currentTimeLine.style.top = `${topPosition}%`;
                day.currentTimeLine.style.display = 'block';
            } else {
                day.currentTimeLine.style.display = 'none';
            }
        });
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.generateDays();
        this.updateDisplay();
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
    window.calendarApp = new PersonalCalendar();
});
