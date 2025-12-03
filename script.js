const draggableElements = document.querySelectorAll('.window');

let activeItem = null;
let isResizing = false;
let isPinching = false; // Bandera para saber si estamos en modo pellizco

let currentX, currentY;
let initialX, initialY;
let xOffset, yOffset;

let initialWidth, initialHeight;
let initialRatio;
let initialDistance = 0; // Distancia inicial entre los dos dedos para redimensionar
let highestZIndex = 100;

// Variables para un redimensionamiento limpio
let initialLeft, initialTop; 

const FOOTER_HEIGHT = 35; 
const BODY_MARGIN = 15; // El margen del body definido en CSS

// Constantes y variables para el redimensionamiento de bordes
const RESIZE_EDGE_THRESHOLD = 15; // Distancia en píxeles para considerar que se ha "enganchado" un borde
let resizingEdges = { top: false, right: false, bottom: false, left: false };

// ======================================================================
// FUNCIÓN PARA CALCULAR LA POSICIÓN INICIAL (AJUSTADA AL CENTRO DEL ABOUT ME)
// ======================================================================
function randomizeWindowPosition(windowElement) {
    const aboutContainer = document.querySelector('.about-container');

    if (!aboutContainer) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const elementWidth = windowElement.offsetWidth;
    const elementHeight = windowElement.offsetHeight;

    // 1. Obtener la posición y dimensiones del about-container
    const aboutRect = aboutContainer.getBoundingClientRect();
    
    // Calcular el centro del about-container
    const aboutCenterX = aboutRect.left + (aboutRect.width / 2);
    const aboutCenterY = aboutRect.top + (aboutRect.height / 2);

    // 2. Calcular la posición base para que el centro de la ventana coincida con el centro del about
    let baseX = aboutCenterX - (elementWidth / 2);
    let baseY = aboutCenterY - (elementHeight / 2);

    // 3. Definir un rango de dispersión (± 400px para mayor separación lateral).
    const scatterRange = 600; 
    const randomOffsetX = Math.random() * scatterRange - (scatterRange / 3);
    const randomOffsetY = Math.random() * scatterRange - (scatterRange / 3);

    let targetX = baseX + randomOffsetX;
    let targetY = baseY + randomOffsetY;

    // 4. Aplicar límites de borde (Asegurar que la ventana no se salga)
    const MIN_LEFT = BODY_MARGIN;
    const MIN_TOP = BODY_MARGIN;
    const MAX_LEFT = viewportWidth - elementWidth - BODY_MARGIN;
    const MAX_TOP = viewportHeight - elementHeight - BODY_MARGIN;
    
    // Limitar la posición
    targetX = Math.min(Math.max(targetX, MIN_LEFT), MAX_LEFT);
    targetY = Math.min(Math.max(targetY, MIN_TOP), MAX_TOP);
    
    // Aplicar la posición
    windowElement.style.top = targetY + 'px';
    windowElement.style.left = targetX + 'px';
}

// Función para actualizar las dimensiones en el footer del texto
function updateDimensionsText(windowElement) {
    const currentWidth = Math.round(windowElement.offsetWidth);
    const currentBodyHeight = Math.round(windowElement.offsetHeight - FOOTER_HEIGHT);

    const dimensionsSpan = windowElement.querySelector('.dimensions-text');
    if (dimensionsSpan) {
        dimensionsSpan.textContent = `(${currentWidth}x${currentBodyHeight})`;
    }
}

// Función para establecer el tamaño inicial y la proporción
function initializeWindow(windowElement) {
    const img = windowElement.querySelector('img');

    const loadHandler = () => {
        setInitialDimensions(windowElement, img);
        randomizeWindowPosition(windowElement); 
    };

    if (img && img.complete) {
        loadHandler();
    } else if (img) {
        img.onload = loadHandler;
    } else {
        setInitialDimensions(windowElement, null);
        randomizeWindowPosition(windowElement);
    }
}

function setInitialDimensions(windowElement, img) {
    const MIN_WIDTH = 200;
    const MAX_WIDTH = 400;

    const randomWidth = Math.random() * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH;

    let ratio = 1;
    if (img && img.naturalWidth && img.naturalHeight) {
        ratio = img.naturalWidth / img.naturalHeight;
    }

    const targetWidth = randomWidth;
    const targetHeight = targetWidth / ratio;

    windowElement.style.width = targetWidth + 'px';
    windowElement.style.height = (targetHeight + FOOTER_HEIGHT) + 'px';

    windowElement.setAttribute('data-aspect-ratio', ratio);

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
    
    // Escuchador para cambiar el cursor al pasar por los bordes (estado de HOVER)
    item.addEventListener('mousemove', checkBorders); 
    item.addEventListener('mouseleave', () => {
        // Si el mouse sale de la ventana y no hay una interacción activa, se mantiene el cursor por defecto del .window (pointer)
        if (!activeItem) item.style.cursor = 'pointer'; 
    });
});

// Eventos globales en el documento
document.addEventListener('mouseup', dragEnd);
document.addEventListener('touchend', dragEnd);
document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag);

// Función para elevar la ventana clicada
function elevateWindow(clickedWindow) {
    highestZIndex++;
    clickedWindow.style.zIndex = highestZIndex;
}

// FUNCIÓN: COMPROBAR BORDES PARA CAMBIAR EL CURSOR (HOVER)
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
    // Borde inferior: entre el borde superior del footer y el borde inferior del body (excluyendo el footer)
    const onBottom = h - y < FOOTER_HEIGHT && h - y > RESIZE_EDGE_THRESHOLD; 
    
    // Define el cursor según la esquina/borde
    if (onLeft && onTop || onRight && onBottom) {
        cursor = 'nwse-resize';
    } else if (onRight && onTop || onLeft && onBottom) {
        cursor = 'nesw-resize';
    } else if (onLeft || onRight) {
        cursor = 'ew-resize';
    } else if (onTop || onBottom) {
        cursor = 'ns-resize';
    } else {
         // Si no estamos en un borde, usamos el cursor de arrastre si estamos sobre el área arrastrable
         if (e.target.classList.contains('window-header') || e.target.classList.contains('window-body') || e.target.classList.contains('window-footer')) {
             cursor = 'move';
         } else {
             cursor = 'pointer'; // Cursor por defecto del .window
         }
    }
    
    // Si el clic está en el handle, se mantiene el cursor del handle
    if (e.target.classList.contains('resize-handle')) {
        cursor = 'nwse-resize';
    }

    this.style.cursor = cursor;
}


/* ==================== INICIO DE INTERACCIÓN (Arrastre/Redimensionamiento Global) ==================== */

function startInteraction(e) {
    
    // Si el objetivo es el handle, dejamos que la función resizeStart lo maneje.
    if (e.target.classList.contains('resize-handle')) {
        return;
    }
    
    // Ignorar clic en controles interactivos
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT') {
        return;
    }
    
    const isTouch = e.type.includes('touch');

    if (isTouch && e.touches.length === 2) {
        // --- INICIO DE PELLIZCO (PINCH-TO-ZOOM) ---
        e.preventDefault();
        
        // Establecer el cursor del body para pellizco (grab/move)
        document.body.style.cursor = 'grab'; 
        
        activeItem = this; 
        elevateWindow(activeItem);
        
        isPinching = true;
        isResizing = true; 
        activeItem.classList.add('active-resize');

        // 1. Calcular la distancia inicial entre los dos dedos
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);

        // 2. Guardar dimensiones y posición inicial
        initialWidth = activeItem.offsetWidth;
        initialHeight = activeItem.offsetHeight;
        initialLeft = parseFloat(activeItem.style.left) || 0;
        initialTop = parseFloat(activeItem.style.top) || 0;
        initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));

        // En pinch, se redimensionan todos los bordes para mantener el centro
        resizingEdges = { top: true, right: true, bottom: true, left: true };
        
        return; 
    }
    
    // --- INICIO DE ARRASTRE O REDIMENSIONAMIENTO DE BORDE/ESQUINA ---
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

    // 1. Determinar qué bordes estamos "enganchando"
    resizingEdges.left = x < RESIZE_EDGE_THRESHOLD;
    resizingEdges.right = w - x < RESIZE_EDGE_THRESHOLD;
    resizingEdges.top = y < RESIZE_EDGE_THRESHOLD;
    // No redimensionamos si clicamos el área del footer
    resizingEdges.bottom = h - y < FOOTER_HEIGHT && h - y > RESIZE_EDGE_THRESHOLD; 
    
    const isClickOnEdge = resizingEdges.left || resizingEdges.right || resizingEdges.top || resizingEdges.bottom;


    if (isClickOnEdge) {
        // --- MODO REDIMENSIONAMIENTO DE BORDE/ESQUINA ---
        isResizing = true;
        activeItem.classList.add('active-resize');
        
        // Establecer el cursor del body para redimensionamiento
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

        // Guardar estado inicial para el redimensionamiento
        initialX = eventClientX;
        initialY = eventClientY;
        initialWidth = activeItem.offsetWidth;
        initialHeight = activeItem.offsetHeight;
        initialLeft = parseFloat(activeItem.style.left) || 0;
        initialTop = parseFloat(activeItem.style.top) || 0;
        initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));
        
    } else {
        // --- MODO ARRASTRE ---
        isResizing = false;
        activeItem.classList.add('active-drag');
        
        // Establecer el cursor del body para arrastre
        document.body.style.cursor = 'move'; 
        
        // Guardar estado inicial para el arrastre
        xOffset = eventClientX - rect.left;
        yOffset = eventClientY - rect.top;
        initialX = eventClientX;
        initialY = eventClientY;
        
    }

}

/* ==================== INICIO DE REDIMENSIÓN (HANDLE) ==================== */

function resizeStart(e) {
    e.preventDefault();

    isResizing = true;
    isPinching = false;
    const isTouch = e.type.includes('touch');

    activeItem = this.closest('.window');
    activeItem.classList.add('active-resize');
    elevateWindow(activeItem);
    
    // Establecer el cursor del body para redimensionamiento (handle)
    document.body.style.cursor = 'nwse-resize'; 

    initialX = isTouch ? e.touches[0].clientX : e.clientX;
    initialY = isTouch ? e.touches[0].clientY : e.clientY;

    initialWidth = activeItem.offsetWidth;
    initialHeight = activeItem.offsetHeight;
    initialLeft = parseFloat(activeItem.style.left) || 0;
    initialTop = parseFloat(activeItem.style.top) || 0;

    initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));
    
    // En el handle, solo se redimensionan los bordes inferior y derecho
    resizingEdges = { top: false, right: true, bottom: true, left: false };
}


/* ==================== FUNCIÓN DE MOVIMIENTO (DRAG/RESIZE) ==================== */

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
            // --- MODO REDIMENSIÓN: PELLIZCO (PINCH-TO-ZOOM) ---
            const currentDx = e.touches[0].clientX - e.touches[1].clientX;
            const currentDy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            const scaleFactor = currentDistance / initialDistance;

            let newWidth = initialWidth * scaleFactor;
            let newHeight = initialHeight * scaleFactor;

            // 1. Corrección de la Proporción
            let newBodyHeight = newWidth / initialRatio;
            newHeight = newBodyHeight + FOOTER_HEIGHT;

            // 2. Aplicar límites mínimos
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);

            // 3. Calcular la nueva posición para mantener el CENTRO FIJO
            const deltaWidth = newWidth - initialWidth;
            const deltaHeight = newHeight - initialHeight;

            let newLeft = initialLeft - (deltaWidth / 2);
            let newTop = initialTop - (deltaHeight / 2);
            
            // 4. Aplicar límites de borde al redimensionar (asegurar que no se salga del viewport)
            
            // Limitar el tamaño máximo por el viewport
            newWidth = Math.min(newWidth, viewportWidth - (newLeft > 0 ? newLeft : MIN_LEFT) - BODY_MARGIN);
            newHeight = Math.min(newHeight, viewportHeight - (newTop > 0 ? newTop : MIN_TOP) - BODY_MARGIN);
            
            // Recalcular la posición después de la posible limitación de tamaño
            newLeft = initialLeft - (newWidth - initialWidth) / 2;
            newTop = initialTop - (newHeight - initialHeight) / 2;

            // Aplicar límites finales de posición
            let finalLeft = Math.min(Math.max(newLeft, MIN_LEFT), viewportWidth - newWidth - BODY_MARGIN);
            let finalTop = Math.min(Math.max(newTop, MIN_TOP), viewportHeight - newHeight - BODY_MARGIN);
            
            activeItem.style.width = newWidth + 'px';
            activeItem.style.height = newHeight + 'px';
            activeItem.style.left = finalLeft + 'px';
            activeItem.style.top = finalTop + 'px';

        } else if (!isPinching) {
            // --- MODO REDIMENSIÓN: BORDE/ESQUINA O HANDLE ---
            
            if (eventClientX === null || eventClientY === null) return; 
            
            const deltaX = eventClientX - initialX;
            const deltaY = eventClientY - initialY;
            
            // 1. Calcular el nuevo tamaño y posición basado en los bordes arrastrados
            
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
            
            // 2. Aplicar corrección de aspecto y límites mínimos
            
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);

            let newBodyHeight = newHeight - FOOTER_HEIGHT;
            
            // Lógica para mantener la proporción
            if ((resizingEdges.left || resizingEdges.right) && (resizingEdges.top || resizingEdges.bottom)) {
                // Esquina
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    newBodyHeight = newWidth / initialRatio;
                    newHeight = newBodyHeight + FOOTER_HEIGHT;
                } else {
                    newBodyHeight = newHeight - FOOTER_HEIGHT;
                    newWidth = newBodyHeight * initialRatio;
                    
                    if (resizingEdges.top) {
                        newTop = initialTop + initialHeight - newHeight;
                    }
                    if (resizingEdges.left) {
                        newLeft = initialLeft + initialWidth - newWidth;
                    }
                }

            } else if (resizingEdges.left || resizingEdges.right) {
                // Solo ancho (lateral)
                newBodyHeight = newWidth / initialRatio;
                newHeight = newBodyHeight + FOOTER_HEIGHT;
                newTop = initialTop + (initialHeight - newHeight) / 2;

            } else if (resizingEdges.top || resizingEdges.bottom) {
                // Solo alto (superior/inferior)
                newBodyHeight = newHeight - FOOTER_HEIGHT;
                newWidth = newBodyHeight * initialRatio;
                newLeft = initialLeft + (initialWidth - newWidth) / 2;
            }
            
            // Asegurarse de que no nos salimos del mínimo de nuevo
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);
            
            
            // 3. Aplicar límites de borde (No salirse de la ventana del navegador)
            
            let finalLeft = newLeft;
            let finalTop = newTop;
            
            // Corrección de posición si el borde izquierdo/superior toca el límite
            if (resizingEdges.left) {
                finalLeft = Math.min(Math.max(newLeft, MIN_LEFT), initialLeft + initialWidth - MIN_W);
                newWidth = initialWidth - (finalLeft - initialLeft);
            }
            if (resizingEdges.top) {
                finalTop = Math.min(Math.max(newTop, MIN_TOP), initialTop + initialHeight - MIN_H);
                newHeight = initialHeight - (finalTop - initialTop);
            }
            
            // Limitar el tamaño máximo por la derecha y abajo
            newWidth = Math.min(newWidth, viewportWidth - finalLeft - BODY_MARGIN);
            newHeight = Math.min(newHeight, viewportHeight - finalTop - BODY_MARGIN);

            // Re-aplicar límites mínimos
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);
            
            // Re-aplicar el tamaño y posición final (incluyendo el centrado si era solo lateral/vertical)
            activeItem.style.width = newWidth + 'px';
            activeItem.style.height = newHeight + 'px';
            activeItem.style.left = finalLeft + 'px';
            activeItem.style.top = finalTop + 'px';
            
        }
        
        updateDimensionsText(activeItem);

    } else {
        // Modo Arrastre
        if (eventClientX === null || eventClientY === null) return; 
        
        currentX = eventClientX - xOffset;
        currentY = eventClientY - yOffset;

        const itemWidth = activeItem.offsetWidth;
        const itemHeight = activeItem.offsetHeight;

        const maxX = viewportWidth - itemWidth - BODY_MARGIN;
        const maxY = viewportHeight - itemHeight - BODY_MARGIN;

        // Aplicar límites
        currentX = Math.min(Math.max(currentX, MIN_LEFT), maxX);
        currentY = Math.min(Math.max(currentY, MIN_TOP), maxY);

        activeItem.style.left = currentX + 'px';
        activeItem.style.top = currentY + 'px';
    }
}


/* ==================== FUNCIÓN DE FINALIZACIÓN ==================== */

function dragEnd(e) {
    if (!activeItem) return;

    // Lógica para evitar que el dragEnd se dispare al levantar solo un dedo durante el pellizco
    const isTouch = e.type.includes('touch');
    if (isPinching && isTouch && e.touches.length > 0) {
        return;
    }

    activeItem.classList.remove('active-drag', 'active-resize');
    updateDimensionsText(activeItem);

    // Restablecer el cursor del body
    document.body.style.cursor = 'default'; 
    
    activeItem = null;
    isResizing = false;
    isPinching = false;
    initialDistance = 0;
    // Resetear los bordes de redimensionamiento
    resizingEdges = { top: false, right: false, bottom: false, left: false }; 
}

// Llamada inicial para asegurar que todas las imágenes se inicialicen
window.addEventListener('load', () => {
      draggableElements.forEach(item => initializeWindow(item));
});

// Al redimensionar la ventana del navegador, ajusta la posición de las ventanas abiertas.
window.addEventListener('resize', () => {
    draggableElements.forEach(item => {
        randomizeWindowPosition(item);
    });
});

// --- FUNCIONES DEL FORMULARIO DE CORREO ---

// Hacemos que estas funciones sean globales (accesibles desde el HTML)
window.handlePortfolioRequest = function() {
    const emailInput = document.getElementById('emailInput');
    const portfolioButton = document.getElementById('portfolioButton');
    const recipientEmail = "castilloferreroangela@gmail.com";
    
    // Si el input está visible y el correo es válido (o tiene algún contenido)
    if (emailInput.classList.contains('visible') && emailInput.value.length > 0) {
        
        // Crear el enlace mailto:
        const subject = "Solicitud de Portfolio Completo";
        const body = `Hola, me gustaría solicitar el portfolio completo. Mi correo es: ${emailInput.value}`;
        
        const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // Abrir el cliente de correo del usuario
        window.location.href = mailtoLink;
        
    } else {
        // Estado inicial: Muestra el campo de correo
        emailInput.classList.add('visible');
        emailInput.focus();
        
        // Comprueba si ya está listo para "send!"
        checkEmailStatus();
    }
}

// Hacemos que esta función sea global (accesible desde el HTML)
window.checkEmailStatus = function() {
    const emailInput = document.getElementById('emailInput');
    const portfolioButton = document.getElementById('portfolioButton');
    
    // Utiliza un regex simple para comprobar si parece un correo
    const emailPattern = /\S+@\S+\.(com|net|org|es|gov|edu|io|co|info|biz)/i;

    if (emailInput.classList.contains('visible') && emailPattern.test(emailInput.value)) {
        portfolioButton.textContent = "send!";
    } else {
        portfolioButton.textContent = "request full portfolio";
    }
}
