const draggableElements = document.querySelectorAll('.window');

let activeItem = null;
let isResizing = false;
let isPinching = false;

let currentX, currentY;
let initialX, initialY;
let xOffset, yOffset;

let initialWidth, initialHeight;
let initialRatio;
let initialDistance = 0;
let highestZIndex = 100;

let initialLeft, initialTop; 

const FOOTER_HEIGHT = 35; 
const BODY_MARGIN = 15;

const RESIZE_EDGE_THRESHOLD = 15;
let resizingEdges = { top: false, right: false, bottom: false, left: false };

// ======================================================================
function randomizeWindowPosition(windowElement) {
    const aboutContainer = document.querySelector('.about-container');
    if (!aboutContainer) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const elementWidth = windowElement.offsetWidth;
    const elementHeight = windowElement.offsetHeight;

    const aboutRect = aboutContainer.getBoundingClientRect();
    const aboutCenterX = aboutRect.left + (aboutRect.width / 2);
    const aboutCenterY = aboutRect.top + (aboutRect.height / 2);

    let baseX = aboutCenterX - (elementWidth / 2);
    let baseY = aboutCenterY - (elementHeight / 2);

    const scatterRange = 600; 
    const randomOffsetX = Math.random() * scatterRange - (scatterRange / 3);
    const randomOffsetY = Math.random() * scatterRange - (scatterRange / 3);

    let targetX = baseX + randomOffsetX;
    let targetY = baseY + randomOffsetY;

    const MIN_LEFT = BODY_MARGIN;
    const MIN_TOP = BODY_MARGIN;
    const MAX_LEFT = viewportWidth - elementWidth - BODY_MARGIN;
    const MAX_TOP = viewportHeight - elementHeight - BODY_MARGIN;
    
    targetX = Math.min(Math.max(targetX, MIN_LEFT), MAX_LEFT);
    targetY = Math.min(Math.max(targetY, MIN_TOP), MAX_TOP);
    
    windowElement.style.top = targetY + 'px';
    windowElement.style.left = targetX + 'px';
}

function updateDimensionsText(windowElement) {
    const currentWidth = Math.round(windowElement.offsetWidth);
    const currentBodyHeight = Math.round(windowElement.offsetHeight - FOOTER_HEIGHT);

    const dimensionsSpan = windowElement.querySelector('.dimensions-text');
    if (dimensionsSpan) {
        dimensionsSpan.textContent = `(${currentWidth}x${currentBodyHeight})`;
    }
}

// ======================================================================
function initializeWindow(windowElement) {
    const img = windowElement.querySelector('img');

    const MIN_WIDTH = 200;
    const MAX_WIDTH = 400;
    const randomWidth = Math.random() * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH;

    // Ratio provisional 4:3 hasta que la imagen confirme el suyo
    const provisionalRatio = 4 / 3;
    const provisionalHeight = randomWidth / provisionalRatio;

    // Aplicar dimensiones provisionales INMEDIATAMENTE (sin esperar imagen)
    windowElement.style.width = randomWidth + 'px';
    windowElement.style.height = (provisionalHeight + FOOTER_HEIGHT) + 'px';
    windowElement.setAttribute('data-aspect-ratio', provisionalRatio);

    // Ocultar con opacity 0 para evitar el flash de posición incorrecta,
    // pero que ya ocupe espacio y podamos calcular posición real
    windowElement.style.opacity = '0';
    windowElement.style.transition = 'opacity 0.25s ease';

    // Posicionar con las dimensiones provisionales
    randomizeWindowPosition(windowElement);


    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            windowElement.style.opacity = '1';
        });
    });

    // Cuando cargue la imagen, corregir ratio sin mover la ventana
    if (img) {
        const refineOnLoad = () => {
            if (!img.naturalWidth || !img.naturalHeight) return;

            const realRatio = img.naturalWidth / img.naturalHeight;
            const currentWidth = windowElement.offsetWidth;
            const newHeight = currentWidth / realRatio + FOOTER_HEIGHT;

            // Solo actualizamos height y ratio, la posición no cambia
            windowElement.style.height = newHeight + 'px';
            windowElement.setAttribute('data-aspect-ratio', realRatio);
            updateDimensionsText(windowElement);
        };

        if (img.complete && img.naturalWidth) {
            refineOnLoad();
        } else {
            img.addEventListener('load', refineOnLoad);
        }
    }

    updateDimensionsText(windowElement);
}

// 1. Configuración de escuchadores de eventos
draggableElements.forEach(item => {
    const resizeHandle = item.querySelector('.resize-handle');

    initializeWindow(item);

    item.addEventListener('mousedown', startInteraction);
    item.addEventListener('touchstart', startInteraction);

    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', resizeStart);
        resizeHandle.addEventListener('touchstart', resizeStart);
    }
    
    item.addEventListener('mousemove', checkBorders); 
    item.addEventListener('mouseleave', () => {
        if (!activeItem) item.style.cursor = 'pointer'; 
    });
});

document.addEventListener('mouseup', dragEnd);
document.addEventListener('touchend', dragEnd);
document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag);

function elevateWindow(clickedWindow) {
    highestZIndex++;
    clickedWindow.style.zIndex = highestZIndex;
}

function checkBorders(e) {
    if (activeItem) return; 

    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    let cursor = 'pointer'; 

    const onLeft = x < RESIZE_EDGE_THRESHOLD;
    const onRight = w - x < RESIZE_EDGE_THRESHOLD;
    const onTop = y < RESIZE_EDGE_THRESHOLD;
    const onBottom = h - y < FOOTER_HEIGHT && h - y > RESIZE_EDGE_THRESHOLD; 
    
    if (onLeft && onTop || onRight && onBottom) {
        cursor = 'nwse-resize';
    } else if (onRight && onTop || onLeft && onBottom) {
        cursor = 'nesw-resize';
    } else if (onLeft || onRight) {
        cursor = 'ew-resize';
    } else if (onTop || onBottom) {
        cursor = 'ns-resize';
    } else {
         if (e.target.classList.contains('window-header') || e.target.classList.contains('window-body') || e.target.classList.contains('window-footer')) {
             cursor = 'move';
         } else {
             cursor = 'pointer';
         }
    }
    
    if (e.target.classList.contains('resize-handle')) {
        cursor = 'nwse-resize';
    }

    this.style.cursor = cursor;
}

function startInteraction(e) {
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
    
    const isTouch = e.type.includes('touch');

    if (isTouch && e.touches.length === 2) {
        e.preventDefault();
        document.body.style.cursor = 'grab'; 
        activeItem = this; 
        elevateWindow(activeItem);
        isPinching = true;
        isResizing = true; 
        activeItem.classList.add('active-resize');

        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);

        initialWidth = activeItem.offsetWidth;
        initialHeight = activeItem.offsetHeight;
        initialLeft = parseFloat(activeItem.style.left) || 0;
        initialTop = parseFloat(activeItem.style.top) || 0;
        initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));
        resizingEdges = { top: true, right: true, bottom: true, left: true };
        return; 
    }
    
    if (isTouch && e.touches.length > 1) return; 

    e.preventDefault();
    isPinching = false;
    
    const eventClientX = isTouch ? e.touches[0].clientX : e.clientX;
    const eventClientY = isTouch ? e.touches[0].clientY : e.clientY;

    activeItem = this;
    elevateWindow(activeItem);
    
    const rect = activeItem.getBoundingClientRect();
    const x = eventClientX - rect.left;
    const y = eventClientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    resizingEdges.left = x < RESIZE_EDGE_THRESHOLD;
    resizingEdges.right = w - x < RESIZE_EDGE_THRESHOLD;
    resizingEdges.top = y < RESIZE_EDGE_THRESHOLD;
    resizingEdges.bottom = h - y < FOOTER_HEIGHT && h - y > RESIZE_EDGE_THRESHOLD; 
    
    const isClickOnEdge = resizingEdges.left || resizingEdges.right || resizingEdges.top || resizingEdges.bottom;

    if (isClickOnEdge) {
        isResizing = true;
        activeItem.classList.add('active-resize');
        
        let cursorType = '';
        if (resizingEdges.left && resizingEdges.top || resizingEdges.right && resizingEdges.bottom) {
            cursorType = 'nwse-resize';
        } else if (resizingEdges.right && resizingEdges.top || resizingEdges.left && resizingEdges.bottom) {
            cursorType = 'nesw-resize';
        } else if (resizingEdges.left || resizingEdges.right) {
            cursorType = 'ew-resize';
        } else if (resizingEdges.top || resizingEdges.bottom) {
            cursorType = 'ns-resize';
        }
        document.body.style.cursor = cursorType;

        initialX = eventClientX;
        initialY = eventClientY;
        initialWidth = activeItem.offsetWidth;
        initialHeight = activeItem.offsetHeight;
        initialLeft = parseFloat(activeItem.style.left) || 0;
        initialTop = parseFloat(activeItem.style.top) || 0;
        initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));
        
    } else {
        isResizing = false;
        activeItem.classList.add('active-drag');
        document.body.style.cursor = 'move'; 
        
        xOffset = eventClientX - rect.left;
        yOffset = eventClientY - rect.top;
        initialX = eventClientX;
        initialY = eventClientY;
    }
}

function resizeStart(e) {
    e.preventDefault();

    isResizing = true;
    isPinching = false;
    const isTouch = e.type.includes('touch');

    activeItem = this.closest('.window');
    activeItem.classList.add('active-resize');
    elevateWindow(activeItem);
    document.body.style.cursor = 'nwse-resize'; 

    initialX = isTouch ? e.touches[0].clientX : e.clientX;
    initialY = isTouch ? e.touches[0].clientY : e.clientY;

    initialWidth = activeItem.offsetWidth;
    initialHeight = activeItem.offsetHeight;
    initialLeft = parseFloat(activeItem.style.left) || 0;
    initialTop = parseFloat(activeItem.style.top) || 0;

    initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));
    resizingEdges = { top: false, right: true, bottom: true, left: false };
}

function drag(e) {
    if (!activeItem) return;
    e.preventDefault();

    const isTouch = e.type.includes('touch');
    const eventClientX = isTouch ? (e.touches[0] ? e.touches[0].clientX : null) : e.clientX;
    const eventClientY = isTouch ? (e.touches[0] ? e.touches[0].clientY : null) : e.clientY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const MIN_LEFT = BODY_MARGIN;
    const MIN_TOP = BODY_MARGIN;

    if (isResizing) {
        const MIN_W = 150;
        const MIN_H = 100;

        if (isPinching && isTouch && e.touches.length === 2) {
            const currentDx = e.touches[0].clientX - e.touches[1].clientX;
            const currentDy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            const scaleFactor = currentDistance / initialDistance;

            let newWidth = initialWidth * scaleFactor;
            let newBodyHeight = newWidth / initialRatio;
            let newHeight = newBodyHeight + FOOTER_HEIGHT;

            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);

            const deltaWidth = newWidth - initialWidth;
            const deltaHeight = newHeight - initialHeight;

            let newLeft = initialLeft - (deltaWidth / 2);
            let newTop = initialTop - (deltaHeight / 2);
            
            newWidth = Math.min(newWidth, viewportWidth - (newLeft > 0 ? newLeft : MIN_LEFT) - BODY_MARGIN);
            newHeight = Math.min(newHeight, viewportHeight - (newTop > 0 ? newTop : MIN_TOP) - BODY_MARGIN);
            
            newLeft = initialLeft - (newWidth - initialWidth) / 2;
            newTop = initialTop - (newHeight - initialHeight) / 2;

            let finalLeft = Math.min(Math.max(newLeft, MIN_LEFT), viewportWidth - newWidth - BODY_MARGIN);
            let finalTop = Math.min(Math.max(newTop, MIN_TOP), viewportHeight - newHeight - BODY_MARGIN);
            
            activeItem.style.width = newWidth + 'px';
            activeItem.style.height = newHeight + 'px';
            activeItem.style.left = finalLeft + 'px';
            activeItem.style.top = finalTop + 'px';

        } else if (!isPinching) {
            if (eventClientX === null || eventClientY === null) return; 
            
            const deltaX = eventClientX - initialX;
            const deltaY = eventClientY - initialY;
            
            let newWidth = initialWidth;
            let newHeight = initialHeight;
            let newLeft = initialLeft;
            let newTop = initialTop;

            if (resizingEdges.right) {
                newWidth = initialWidth + deltaX;
            } else if (resizingEdges.left) {
                newWidth = initialWidth - deltaX;
                newLeft = initialLeft + deltaX;
            }

            if (resizingEdges.bottom) {
                newHeight = initialHeight + deltaY;
            } else if (resizingEdges.top) {
                newHeight = initialHeight - deltaY;
                newTop = initialTop + deltaY;
            }
            
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);

            let newBodyHeight = newHeight - FOOTER_HEIGHT;
            
            if ((resizingEdges.left || resizingEdges.right) && (resizingEdges.top || resizingEdges.bottom)) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    newBodyHeight = newWidth / initialRatio;
                    newHeight = newBodyHeight + FOOTER_HEIGHT;
                } else {
                    newBodyHeight = newHeight - FOOTER_HEIGHT;
                    newWidth = newBodyHeight * initialRatio;
                    if (resizingEdges.top) newTop = initialTop + initialHeight - newHeight;
                    if (resizingEdges.left) newLeft = initialLeft + initialWidth - newWidth;
                }
            } else if (resizingEdges.left || resizingEdges.right) {
                newBodyHeight = newWidth / initialRatio;
                newHeight = newBodyHeight + FOOTER_HEIGHT;
                newTop = initialTop + (initialHeight - newHeight) / 2;
            } else if (resizingEdges.top || resizingEdges.bottom) {
                newBodyHeight = newHeight - FOOTER_HEIGHT;
                newWidth = newBodyHeight * initialRatio;
                newLeft = initialLeft + (initialWidth - newWidth) / 2;
            }
            
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);
            
            let finalLeft = newLeft;
            let finalTop = newTop;
            
            if (resizingEdges.left) {
                finalLeft = Math.min(Math.max(newLeft, MIN_LEFT), initialLeft + initialWidth - MIN_W);
                newWidth = initialWidth - (finalLeft - initialLeft);
            }
            if (resizingEdges.top) {
                finalTop = Math.min(Math.max(newTop, MIN_TOP), initialTop + initialHeight - MIN_H);
                newHeight = initialHeight - (finalTop - initialTop);
            }
            
            newWidth = Math.min(newWidth, viewportWidth - finalLeft - BODY_MARGIN);
            newHeight = Math.min(newHeight, viewportHeight - finalTop - BODY_MARGIN);
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);
            
            activeItem.style.width = newWidth + 'px';
            activeItem.style.height = newHeight + 'px';
            activeItem.style.left = finalLeft + 'px';
            activeItem.style.top = finalTop + 'px';
        }
        
        updateDimensionsText(activeItem);

    } else {
        if (eventClientX === null || eventClientY === null) return; 
        
        currentX = eventClientX - xOffset;
        currentY = eventClientY - yOffset;

        const itemWidth = activeItem.offsetWidth;
        const itemHeight = activeItem.offsetHeight;

        const maxX = viewportWidth - itemWidth - BODY_MARGIN;
        const maxY = viewportHeight - itemHeight - BODY_MARGIN;

        currentX = Math.min(Math.max(currentX, MIN_LEFT), maxX);
        currentY = Math.min(Math.max(currentY, MIN_TOP), maxY);

        activeItem.style.left = currentX + 'px';
        activeItem.style.top = currentY + 'px';
    }
}

function dragEnd(e) {
    if (!activeItem) return;

    const isTouch = e.type.includes('touch');
    if (isPinching && isTouch && e.touches.length > 0) return;

    activeItem.classList.remove('active-drag', 'active-resize');
    updateDimensionsText(activeItem);
    document.body.style.cursor = 'default'; 
    
    activeItem = null;
    isResizing = false;
    isPinching = false;
    initialDistance = 0;
    resizingEdges = { top: false, right: false, bottom: false, left: false }; 
}

window.addEventListener('resize', () => {
    draggableElements.forEach(item => {
        randomizeWindowPosition(item);
    });
});

window.handlePortfolioRequest = function() {
    const emailInput = document.getElementById('emailInput');
    const portfolioButton = document.getElementById('portfolioButton');
    const recipientEmail = "castilloferreroangela@gmail.com";
    
    if (emailInput.classList.contains('visible') && emailInput.value.length > 0) {
        const subject = "Solicitud de Portfolio Completo";
        const body = `Hola, me gustaría solicitar el portfolio completo. Mi correo es: ${emailInput.value}`;
        const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    } else {
        emailInput.classList.add('visible');
        emailInput.focus();
        checkEmailStatus();
    }
}

window.checkEmailStatus = function() {
    const emailInput = document.getElementById('emailInput');
    const portfolioButton = document.getElementById('portfolioButton');
    const emailPattern = /\S+@\S+\.(com|net|org|es|gov|edu|io|co|info|biz)/i;

    if (emailInput.classList.contains('visible') && emailPattern.test(emailInput.value)) {
        portfolioButton.textContent = "send!";
    } else {
        portfolioButton.textContent = "request full portfolio";
    }
}