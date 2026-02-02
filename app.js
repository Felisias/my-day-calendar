class PersonalCalendar {
    constructor() {
        this.currentDate = new Date();
        this.events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        this.editingEventId = null;
        
        // Состояние для скролла и свайпа
        this.scrollState = {
            isScrolling: false,
            startY: 0,
            startScrollTop: 0,
            velocity: 0,
            lastY: 0,
            lastTime: 0,
            momentumId: null
        };
        
        this.swipeState = {
            isSwiping: false,
            startX: 0,
            startY: 0,
            direction: null,
            lastX: 0,
            velocity: 0,
            momentumId: null
        };
        
        // Состояние для создания событий
        this.creationState = {
            isCreating: false,
            dayIndex: null,
            startY: 0,
            currentY: 0,
            previewElement: null,
            resizeEdge: null
        };
        
        // Состояние для drag & drop событий
        this.dragState = {
            isDragging: false,
            element: null,
            event: null,
            startY: 0,
            startTop: 0,
            currentTop: 0,
            snapInterval: 2.5, // 15 минут в процентах (1440мин / 15мин = 96 интервалов, 100% / 96 ≈ 1.0417%)
            momentumId: null
        };
        
        // Состояние для resize событий
        this.resizeState = {
            isResizing: false,
            element: null,
            event: null,
            edge: null,
            startY: 0,
            startTop: 0,
            startHeight: 0,
            currentTop: 0,
            currentHeight: 0,
            snapInterval: 2.5,
            momentumId: null
        };
        
        // Состояние для sheet
        this.sheetState = {
            isDragging: false,
            startY: 0,
            startHeight: 0
        };
        
        // Дни для отображения (упрощенная версия)
        this.days = [];
        this.currentDayIndex = 1;
        
        // Цвета
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
        
        this.updateCurrentTime();
        setInterval(() => {
            this.updateCurrentTime();
            this.updateCurrentTimeLine();
        }, 60000);
    }
    
    cacheElements() {
        this.daysContainer = document.getElementById('days-container');
        this.currentDateElement = document.getElementById('current-date');
        this.currentTimeElement = document.getElementById('current-time');
        
        // Создаем линию времени
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
        
        // Создаем 3 дня: вчера, сегодня, завтра
        for (let i = -1; i <= 1; i++) {
            const date = new Date(this.currentDate);
            date.setDate(date.getDate() + i);
            
            const dayWrapper = document.createElement('div');
            dayWrapper.className = 'day-wrapper';
            dayWrapper.dataset.index = i + 1;
            
            const dayGridWrapper = document.createElement('div');
            dayGridWrapper.className = 'day-grid-wrapper';
            dayGridWrapper.addEventListener('scroll', () => this.updateCurrentTimeLine());
            
            const dayGrid = document.createElement('div');
            dayGrid.className = 'day-grid';
            
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'events-container';
            
            const dockingZone = document.createElement('div');
            dockingZone.className = 'sheet-docking-zone';
            
            // Генерация временной сетки
            this.generateTimeGrid(dayGrid);
            
            dayGridWrapper.appendChild(dayGrid);
            dayWrapper.appendChild(dayGridWrapper);
            dayWrapper.appendChild(eventsContainer);
            dayWrapper.appendChild(dockingZone);
            this.daysContainer.appendChild(dayWrapper);
            
            this.days.push({
                element: dayWrapper,
                date: date,
                gridWrapper: dayGridWrapper,
                grid: dayGrid,
                eventsContainer: eventsContainer,
                dockingZone: dockingZone,
                events: []
            });
        }
        
        // Устанавливаем начальные позиции
        this.currentDayIndex = 1;
        this.updateDayPositions();
        this.loadAllEvents();
        
        // Настраиваем скролл для центрального дня
        this.setupScrollForCurrentDay();
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
    
    setupScrollForCurrentDay() {
        const currentDay = this.days[this.currentDayIndex];
        if (!currentDay) return;
        
        // Настраиваем плавный скролл для текущего дня
        this.setupSmoothScroll(currentDay.gridWrapper);
    }
    
    setupSmoothScroll(element) {
        let isScrolling = false;
        let startY = 0;
        let startScrollTop = 0;
        let velocity = 0;
        let lastY = 0;
        let lastTime = 0;
        let momentumId = null;
        
        const applyMomentum = () => {
            if (Math.abs(velocity) < 0.1) {
                velocity = 0;
                if (momentumId) {
                    cancelAnimationFrame(momentumId);
                    momentumId = null;
                }
                return;
            }
            
            element.scrollTop += velocity;
            velocity *= 0.95; // Замедление
            
            momentumId = requestAnimationFrame(applyMomentum);
        };
        
        const onTouchStart = (e) => {
            if (e.touches.length !== 1) return;
            
            isScrolling = true;
            startY = e.touches[0].clientY;
            startScrollTop = element.scrollTop;
            velocity = 0;
            lastY = startY;
            lastTime = Date.now();
            
            if (momentumId) {
                cancelAnimationFrame(momentumId);
                momentumId = null;
            }
        };
        
        const onTouchMove = (e) => {
            if (!isScrolling || e.touches.length !== 1) return;
            
            const currentY = e.touches[0].clientY;
            const deltaY = startY - currentY;
            const newScrollTop = startScrollTop + deltaY;
            
            // Плавный скролл
            element.scrollTop = newScrollTop;
            
            // Рассчитываем скорость для инерции
            const currentTime = Date.now();
            const timeDiff = currentTime - lastTime;
            
            if (timeDiff > 0) {
                velocity = (currentY - lastY) / timeDiff;
            }
            
            lastY = currentY;
            lastTime = currentTime;
        };
        
        const onTouchEnd = () => {
            if (!isScrolling) return;
            isScrolling = false;
            
            // Применяем инерцию
            if (Math.abs(velocity) > 0.5) {
                momentumId = requestAnimationFrame(applyMomentum);
            }
        };
        
        // Mouse события для десктопа
        const onMouseDown = (e) => {
            if (e.button !== 0) return;
            
            isScrolling = true;
            startY = e.clientY;
            startScrollTop = element.scrollTop;
            velocity = 0;
            lastY = startY;
            lastTime = Date.now();
            
            if (momentumId) {
                cancelAnimationFrame(momentumId);
                momentumId = null;
            }
            
            const onMouseMove = (e) => {
                if (!isScrolling) return;
                
                const currentY = e.clientY;
                const deltaY = startY - currentY;
                const newScrollTop = startScrollTop + deltaY;
                
                element.scrollTop = newScrollTop;
                
                const currentTime = Date.now();
                const timeDiff = currentTime - lastTime;
                
                if (timeDiff > 0) {
                    velocity = (currentY - lastY) / timeDiff;
                }
                
                lastY = currentY;
                lastTime = currentTime;
            };
            
            const onMouseUp = () => {
                isScrolling = false;
                
                if (Math.abs(velocity) > 0.5) {
                    momentumId = requestAnimationFrame(applyMomentum);
                }
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        // Удаляем старые обработчики
        element.removeEventListener('touchstart', onTouchStart);
        element.removeEventListener('touchmove', onTouchMove);
        element.removeEventListener('touchend', onTouchEnd);
        element.removeEventListener('mousedown', onMouseDown);
        
        // Добавляем новые обработчики
        element.addEventListener('touchstart', onTouchStart, { passive: true });
        element.addEventListener('touchmove', onTouchMove, { passive: true });
        element.addEventListener('touchend', onTouchEnd, { passive: true });
        element.addEventListener('mousedown', onMouseDown);
    }
    
    setupEventListeners() {
        // Свайп между днями
        this.setupSwipeNavigation();
        
        // Создание событий
        this.setupEventCreation();
        
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
            setTimeout(() => {
                this.eventTitleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
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
    }
    
    setupSwipeNavigation() {
        let startX, startY, startTime;
        let isSwiping = false;
        let direction = null;
        
        const getCurrentDayElement = () => {
            return this.days[this.currentDayIndex]?.gridWrapper;
        };
        
        const handleStart = (clientX, clientY) => {
            startX = clientX;
            startY = clientY;
            startTime = Date.now();
            isSwiping = false;
            direction = null;
        };
        
        const handleMove = (clientX, clientY) => {
            if (startX === undefined) return;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            if (!isSwiping) {
                // Определяем направление
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    isSwiping = true;
                    direction = 'horizontal';
                } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
                    isSwiping = true;
                    direction = 'vertical';
                    
                    // Блокируем скролл по умолчанию для вертикального свайпа
                    const currentDay = getCurrentDayElement();
                    if (currentDay) {
                        currentDay.style.overflowY = 'hidden';
                    }
                }
            }
            
            if (isSwiping) {
                if (direction === 'horizontal') {
                    // Свайп дней
                    const translateX = (deltaX / window.innerWidth) * 100;
                    
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
                } else if (direction === 'vertical') {
                    // Вертикальный скролл - обрабатывается в setupSmoothScroll
                }
            }
        };
        
        const handleEnd = (clientX, clientY) => {
            if (startX === undefined || !isSwiping) {
                startX = undefined;
                
                // Восстанавливаем скролл
                const currentDay = getCurrentDayElement();
                if (currentDay) {
                    currentDay.style.overflowY = 'scroll';
                }
                return;
            }
            
            const deltaX = clientX - startX;
            const timeDiff = Date.now() - startTime;
            
            if (direction === 'horizontal') {
                // Определяем, нужно ли переключить день
                const threshold = window.innerWidth * 0.25;
                const velocityThreshold = 0.3;
                const velocity = deltaX / timeDiff;
                
                let shouldNavigate = false;
                let navDirection = 0;
                
                if (Math.abs(deltaX) > threshold) {
                    shouldNavigate = true;
                    navDirection = deltaX > 0 ? -1 : 1;
                } else if (Math.abs(velocity) > velocityThreshold && timeDiff < 300) {
                    shouldNavigate = true;
                    navDirection = velocity > 0 ? -1 : 1;
                }
                
                if (shouldNavigate) {
                    this.navigateDays(navDirection);
                } else {
                    // Возвращаем на место
                    this.days.forEach(day => {
                        day.element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    });
                    this.updateDayPositions();
                }
                
                this.swipeLeft.classList.remove('visible');
                this.swipeRight.classList.remove('visible');
            }
            
            // Восстанавливаем скролл
            const currentDay = getCurrentDayElement();
            if (currentDay) {
                currentDay.style.overflowY = 'scroll';
            }
            
            isSwiping = false;
            direction = null;
            startX = undefined;
        };
        
        // Touch события
        this.daysContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        }, { passive: true });
        
        this.daysContainer.addEventListener('touchmove', (e) => {
            if (!isSwiping || e.touches.length !== 1) return;
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }, { passive: false });
        
        this.daysContainer.addEventListener('touchend', (e) => {
            if (startX === undefined) return;
            const touch = e.changedTouches[0];
            handleEnd(touch.clientX, touch.clientY);
        });
        
        // Mouse события
        this.daysContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            handleStart(e.clientX, e.clientY);
            
            const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
            const onMouseUp = (e) => {
                handleEnd(e.clientX, e.clientY);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    setupEventCreation() {
        // Клик по сетке для создания события
        this.daysContainer.addEventListener('click', (e) => {
            // Проверяем, что клик не на событии
            if (e.target.closest('.event') || 
                e.target.closest('.event-resize-handle') ||
                e.target.closest('.preview-resize-handle')) {
                return;
            }
            
            // Находим день
            const dayElement = e.target.closest('.day-wrapper');
            if (!dayElement) return;
            
            const dayIndex = parseInt(dayElement.dataset.index);
            const day = this.days[dayIndex];
            
            // Получаем позицию
            const rect = day.gridWrapper.getBoundingClientRect();
            const y = e.clientY - rect.top + day.gridWrapper.scrollTop;
            
            this.startEventCreation(dayIndex, y);
        });
        
        // Preview resize
        const topHandle = this.eventPreview.querySelector('.preview-resize-handle.top');
        const bottomHandle = this.eventPreview.querySelector('.preview-resize-handle.bottom');
        
        this.setupPreviewResize(topHandle, 'top');
        this.setupPreviewResize(bottomHandle, 'bottom');
    }
    
    startEventCreation(dayIndex, y) {
        const day = this.days[dayIndex];
        const gridHeight = day.grid.scrollHeight;
        
        // Нормализуем позицию
        const relativeY = Math.min(Math.max(y, 0), gridHeight);
        const startPercent = (relativeY / gridHeight) * 100;
        
        // Начальные значения (15 минут шаг)
        const startMinutes = Math.round((startPercent / 100) * 1440 / 15) * 15;
        const endMinutes = startMinutes + 60; // 1 час по умолчанию
        
        // Показываем preview
        this.showEventPreview(day, startPercent, 60);
        
        // Сохраняем состояние
        this.creationState.isCreating = true;
        this.creationState.dayIndex = dayIndex;
        this.creationState.startY = relativeY;
        
        // Открываем sheet
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
        day.eventsContainer.appendChild(this.eventPreview);
    }
    
    setupPreviewResize(handle, edge) {
        let isResizing = false;
        let startY = 0;
        let startTop = 0;
        let startHeight = 0;
        
        const startResize = (clientY) => {
            if (!this.creationState.isCreating) return;
            
            isResizing = true;
            startY = clientY;
            startTop = parseFloat(this.eventPreview.style.top);
            startHeight = parseFloat(this.eventPreview.style.height);
            
            this.creationState.resizeEdge = edge;
        };
        
        const onMove = (clientY) => {
            if (!isResizing) return;
            
            const day = this.days[this.creationState.dayIndex];
            const deltaY = clientY - startY;
            const deltaPercent = (deltaY / day.gridWrapper.clientHeight) * 100;
            
            let newTop = startTop;
            let newHeight = startHeight;
            
            // Дискретный шаг 15 минут (2.5%)
            const snapStep = 2.5;
            
            if (edge === 'top') {
                newTop = startTop + deltaPercent;
                newTop = Math.round(newTop / snapStep) * snapStep;
                newTop = Math.max(0, Math.min(newTop, startTop + startHeight - snapStep));
                newHeight = startHeight + startTop - newTop;
            } else {
                newHeight = startHeight + deltaPercent;
                newHeight = Math.round(newHeight / snapStep) * snapStep;
                newHeight = Math.max(snapStep, Math.min(newHeight, 100 - startTop));
            }
            
            // Обновляем preview
            this.eventPreview.style.top = `${newTop}%`;
            this.eventPreview.style.height = `${newHeight}%`;
            
            // Обновляем время в sheet
            if (this.sheet.classList.contains('open')) {
                const startMinutes = Math.round((newTop / 100) * 1440);
                const endMinutes = startMinutes + Math.round((newHeight / 100) * 1440);
                
                this.eventStartTime.value = this.minutesToTime(startMinutes);
                this.eventEndTime.value = this.minutesToTime(endMinutes);
            }
        };
        
        const endResize = () => {
            isResizing = false;
            this.creationState.resizeEdge = null;
        };
        
        // Мышь
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startResize(e.clientY);
            
            const onMouseMove = (e) => onMove(e.clientY);
            const onMouseUp = () => {
                endResize();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // Тач
        handle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            startResize(e.touches[0].clientY);
            
            const onTouchMove = (e) => {
                e.preventDefault();
                onMove(e.touches[0].clientY);
            };
            const onTouchEnd = () => {
                endResize();
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        });
    }
    
    navigateDays(direction) {
        const newIndex = this.currentDayIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.days.length) {
            this.currentDayIndex = newIndex;
            this.currentDate = new Date(this.days[newIndex].date);
            this.updateDisplay();
            this.updateDayPositions();
            this.updateCurrentTimeLine();
            this.setupScrollForCurrentDay();
        }
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
        
        // Создаем элементы событий
        day.events.forEach(event => {
            this.createEventElement(event, day);
        });
    }
    
    createEventElement(event, day) {
        const startMinutes = this.timeToMinutes(event.startTime);
        const endMinutes = this.timeToMinutes(event.endTime);
        const duration = endMinutes - startMinutes;
        
        const top = (startMinutes / 1440) * 100;
        const height = (duration / 1440) * 100;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.dataset.eventId = event.id;
        
        eventElement.style.top = `${top}%`;
        eventElement.style.height = `${height}%`;
        eventElement.style.left = '8px';
        eventElement.style.right = '8px';
        
        const color = this.colors.find(c => c.id === event.colorId) || this.colors[0];
        eventElement.style.backgroundColor = color.value;
        
        const content = document.createElement('div');
        content.className = 'event-content';
        content.innerHTML = `
            <div class="event-title">${this.escapeHtml(event.title)}</div>
            <div class="event-time">${event.startTime} - ${event.endTime}</div>
        `;
        
        // Ручки для resize (изначально скрыты)
        const topHandle = document.createElement('div');
        topHandle.className = 'event-resize-handle top';
        
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'event-resize-handle bottom';
        
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
        
        // Resize события
        this.setupEventResize(topHandle, eventElement, event, day, 'top');
        this.setupEventResize(bottomHandle, eventElement, event, day, 'bottom');
        
        day.eventsContainer.appendChild(eventElement);
        return eventElement;
    }
    
    setupEventDrag(element, event, day) {
        let isDragging = false;
        let startY = 0;
        let startTop = 0;
        let currentTop = 0;
        let momentumId = null;
        
        const snapToGrid = (top) => {
            const snapStep = 2.5; // 15 минут в процентах
            return Math.round(top / snapStep) * snapStep;
        };
        
        const startDrag = (clientY) => {
            if (this.dragState.isDragging || this.resizeState.isResizing) return;
            
            isDragging = true;
            startY = clientY;
            startTop = parseFloat(element.style.top);
            currentTop = startTop;
            
            element.classList.add('dragging');
            
            if (momentumId) {
                cancelAnimationFrame(momentumId);
                momentumId = null;
            }
        };
        
        const onMove = (clientY) => {
            if (!isDragging) return;
            
            const deltaY = clientY - startY;
            const deltaPercent = (deltaY / day.gridWrapper.clientHeight) * 100;
            let newTop = startTop + deltaPercent;
            
            // Ограничиваем сверху и снизу
            const elementHeight = parseFloat(element.style.height);
            newTop = Math.max(0, Math.min(newTop, 100 - elementHeight));
            
            // Следим за пальцем точно
            element.style.top = `${newTop}%`;
            currentTop = newTop;
            
            // Обновляем данные события (но не snap пока)
            const newMinutes = (newTop / 100) * 1440;
            const duration = this.timeToMinutes(event.endTime) - this.timeToMinutes(event.startTime);
            
            event.startTime = this.minutesToTime(newMinutes);
            event.endTime = this.minutesToTime(newMinutes + duration);
            
            // Обновляем отображение
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
        };
        
        const endDrag = () => {
            if (!isDragging) return;
            
            isDragging = false;
            
            // Применяем snap к сетке
            const snappedTop = snapToGrid(currentTop);
            element.style.top = `${snappedTop}%`;
            
            // Обновляем данные события с snap
            const snappedMinutes = Math.round((snappedTop / 100) * 1440 / 15) * 15;
            const duration = this.timeToMinutes(event.endTime) - this.timeToMinutes(event.startTime);
            
            event.startTime = this.minutesToTime(snappedMinutes);
            event.endTime = this.minutesToTime(snappedMinutes + duration);
            
            // Обновляем отображение
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
            
            element.classList.remove('dragging');
            
            // Сохраняем
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
    
    setupEventResize(handle, element, event, day, edge) {
        let isResizing = false;
        let startY = 0;
        let startTop = 0;
        let startHeight = 0;
        let currentTop = 0;
        let currentHeight = 0;
        
        const snapToGrid = (value) => {
            const snapStep = 2.5;
            return Math.round(value / snapStep) * snapStep;
        };
        
        const startResize = (clientY) => {
            if (this.dragState.isDragging) return;
            
            isResizing = true;
            startY = clientY;
            startTop = parseFloat(element.style.top);
            startHeight = parseFloat(element.style.height);
            currentTop = startTop;
            currentHeight = startHeight;
            
            // Показываем ручки (если еще не показаны)
            element.classList.add('editing');
        };
        
        const onMove = (clientY) => {
            if (!isResizing) return;
            
            const deltaY = clientY - startY;
            const deltaPercent = (deltaY / day.gridWrapper.clientHeight) * 100;
            
            let newTop = startTop;
            let newHeight = startHeight;
            
            if (edge === 'top') {
                newTop = startTop + deltaPercent;
                newTop = Math.max(0, Math.min(newTop, startTop + startHeight - 2.5));
                newHeight = startHeight + startTop - newTop;
            } else {
                newHeight = startHeight + deltaPercent;
                newHeight = Math.max(2.5, Math.min(newHeight, 100 - startTop));
            }
            
            // Обновляем элемент
            element.style.top = `${newTop}%`;
            element.style.height = `${newHeight}%`;
            
            currentTop = newTop;
            currentHeight = newHeight;
            
            // Обновляем данные события (без snap)
            const startMinutes = (newTop / 100) * 1440;
            const endMinutes = startMinutes + (newHeight / 100) * 1440;
            
            event.startTime = this.minutesToTime(startMinutes);
            event.endTime = this.minutesToTime(endMinutes);
            
            // Обновляем отображение
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
        };
        
        const endResize = () => {
            if (!isResizing) return;
            
            isResizing = false;
            
            // Применяем snap к сетке
            const snappedTop = snapToGrid(currentTop);
            const snappedHeight = snapToGrid(currentHeight);
            
            element.style.top = `${snappedTop}%`;
            element.style.height = `${snappedHeight}%`;
            
            // Обновляем данные события с snap
            const startMinutes = Math.round((snappedTop / 100) * 1440 / 15) * 15;
            const endMinutes = startMinutes + Math.round((snappedHeight / 100) * 1440 / 15) * 15;
            
            event.startTime = this.minutesToTime(startMinutes);
            event.endTime = this.minutesToTime(endMinutes);
            
            // Обновляем отображение
            const timeElement = element.querySelector('.event-time');
            if (timeElement) {
                timeElement.textContent = `${event.startTime} - ${event.endTime}`;
            }
            
            // Скрываем ручки
            element.classList.remove('editing');
            
            // Сохраняем
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
        };
        
        // Мышь
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startResize(e.clientY);
            
            const onMouseMove = (e) => onMove(e.clientY);
            const onMouseUp = () => {
                endResize();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // Тач
        handle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            startResize(e.touches[0].clientY);
            
            const onTouchMove = (e) => {
                e.preventDefault();
                onMove(e.touches[0].clientY);
            };
            const onTouchEnd = () => {
                endResize();
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        });
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
        
        // Помечаем все события как нередактируемые
        document.querySelectorAll('.event.editing').forEach(el => {
            el.classList.remove('editing');
        });
        
        // Помечаем текущее событие как редактируемое
        const eventElement = document.querySelector(`.event[data-event-id="${eventId}"]`);
        if (eventElement) {
            eventElement.classList.add('editing');
        }
        
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
        
        // Скрываем ручки редактирования
        document.querySelectorAll('.event.editing').forEach(el => {
            el.classList.remove('editing');
        });
        
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
            const newHeight = Math.max(160, Math.min(window.innerHeight * 0.9, startHeight - deltaY));
            
            const percentVisible = (newHeight / (window.innerHeight * 0.9)) * 100;
            
            if (percentVisible < 30) {
                this.sheet.classList.add('docked');
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
        
        const isToday = now.toDateString() === currentDay.date.toDateString();
        
        if (isToday) {
            const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
            const topPercent = (minutesSinceMidnight / 1440) * 100;
            
            const gridRect = currentDay.grid.getBoundingClientRect();
            const wrapperRect = currentDay.gridWrapper.getBoundingClientRect();
            const scrollTop = currentDay.gridWrapper.scrollTop;
            
            const absoluteTop = wrapperRect.top + (gridRect.height * (topPercent / 100)) - scrollTop;
            
            if (absoluteTop >= wrapperRect.top && absoluteTop <= wrapperRect.bottom) {
                this.currentTimeLine.style.top = `${absoluteTop}px`;
                this.currentTimeLine.style.display = 'block';
            } else {
                this.currentTimeLine.style.display = 'none';
            }
        } else {
            this.currentTimeLine.style.display = 'none';
        }
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.setupDays();
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new PersonalCalendar();
});
