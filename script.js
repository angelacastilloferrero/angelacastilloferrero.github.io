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

// Nuevas variables para un redimensionamiento por pellizco limpio
let initialLeft, initialTop; 

const FOOTER_HEIGHT = 35; 
const BODY_MARGIN = 15; // El margen del body definido en CSS

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

/* ==================== INICIO DE INTERACCIÓN (Arrastre/Pellizco) ==================== */

function startInteraction(e) {
    // Si ya estamos redimensionando con el handle, no hacemos nada
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

        return; 
    }
    
    // --- INICIO DE ARRASTRE (DRAG) ---
    if (isTouch && e.touches.length > 1) return; 

    e.preventDefault();
    isPinching = false;
    isResizing = false;

    const eventClientX = isTouch ? e.touches[0].clientX : e.clientX;
    const eventClientY = isTouch ? e.touches[0].clientY : e.clientY;

    activeItem = this;
    activeItem.classList.add('active-drag');

    elevateWindow(activeItem);

    const rect = activeItem.getBoundingClientRect();

    xOffset = eventClientX - rect.left;
    yOffset = eventClientY - rect.top;

    initialX = eventClientX;
    initialY = eventClientY;
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

    initialX = isTouch ? e.touches[0].clientX : e.clientX;
    initialY = isTouch ? e.touches[0].clientY : e.clientY;

    initialWidth = activeItem.offsetWidth;
    initialHeight = activeItem.offsetHeight;

    initialRatio = parseFloat(activeItem.getAttribute('data-aspect-ratio')) || (initialWidth / (initialHeight - FOOTER_HEIGHT));
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
        let newWidth, newBodyHeight, newLeft, newTop;

        if (isPinching && isTouch && e.touches.length === 2) {
            // --- MODO REDIMENSIÓN: PELLIZCO (PINCH-TO-ZOOM) - LIMPIO ---
            const currentDx = e.touches[0].clientX - e.touches[1].clientX;
            const currentDy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            const scaleFactor = currentDistance / initialDistance;

            newWidth = initialWidth * scaleFactor;
            newBodyHeight = (initialHeight - FOOTER_HEIGHT) * scaleFactor;

            // Para redimensionar desde el centro, calculamos cuánto ha cambiado
            // y aplicamos la mitad de ese cambio como desplazamiento (left/top).
            const deltaWidth = newWidth - initialWidth;
            const deltaHeight = (newBodyHeight + FOOTER_HEIGHT) - initialHeight;

            newLeft = initialLeft - (deltaWidth / 2);
            newTop = initialTop - (deltaHeight / 2);

        } else if (!isPinching) {
            // --- MODO REDIMENSIÓN: HANDLE INFERIOR DERECHO ---
            const deltaX = eventClientX - initialX;
            const deltaY = eventClientY - initialY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Guiar por el ancho
                newWidth = Math.max(initialWidth + deltaX, 150);
                newBodyHeight = newWidth / initialRatio;
            } else {
                // Guiar por el alto
                let newHeight = Math.max(initialHeight + deltaY, 100);
                newBodyHeight = newHeight - FOOTER_HEIGHT;
                if (newBodyHeight > 0) {
                    newWidth = newBodyHeight * initialRatio;
                } else {
                    newBodyHeight = 100 - FOOTER_HEIGHT;
                    newWidth = newBodyHeight * initialRatio;
                }
            }
            newLeft = parseFloat(activeItem.style.left) || 0; // Se mantiene la posición
            newTop = parseFloat(activeItem.style.top) || 0; // Se mantiene la posición
        }
        
        // Si no se pudo calcular (p.ej., si isPinching se desactiva antes de dragEnd), salimos
        if (!newWidth || !newBodyHeight) return; 

        // --- LÓGICA DE APLICACIÓN DE TAMAÑO Y LÍMITES (Común a Handle y Pinch) ---
        let newHeight = newBodyHeight + FOOTER_HEIGHT;

        if (newWidth >= 150 && newHeight >= 100) {
            
            // 1. Aplicar límites de redimensionamiento (no salirse por la derecha/abajo)
            let maxPossibleWidth = viewportWidth - newLeft - BODY_MARGIN;
            let maxPossibleHeight = viewportHeight - newTop - BODY_MARGIN;

            // Limitamos ancho
            if (newWidth > maxPossibleWidth) {
                 newWidth = maxPossibleWidth;
                 newBodyHeight = newWidth / initialRatio;
                 newHeight = newBodyHeight + FOOTER_HEIGHT;
            }
            // Limitamos alto (ajustando de nuevo el ancho por proporción)
            if (newHeight > maxPossibleHeight) {
                 newHeight = maxPossibleHeight;
                 newBodyHeight = newHeight - FOOTER_HEIGHT;
                 newWidth = newBodyHeight * initialRatio;
            }
            
            // 2. Aplicar límites de posición (no salirse por la izquierda/arriba)
            let finalLeft = Math.min(Math.max(newLeft, MIN_LEFT), viewportWidth - newWidth - BODY_MARGIN);
            let finalTop = Math.min(Math.max(newTop, MIN_TOP), viewportHeight - newHeight - BODY_MARGIN);
            
            // Si la posición se ha ajustado debido a los límites, recalcular el ancho y alto
            // para asegurar que no se salen de los bordes.
            if (isPinching && (finalLeft !== newLeft || finalTop !== newTop)) {
                // Si la posición se mueve, el centro de redimensionamiento se arruina
                // En este caso, simplemente aplicamos la nueva posición y el tamaño actual.
            }

            activeItem.style.width = newWidth + 'px';
            activeItem.style.height = newHeight + 'px';
            activeItem.style.left = finalLeft + 'px';
            activeItem.style.top = finalTop + 'px';

            updateDimensionsText(activeItem);
        }

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

    activeItem = null;
    isResizing = false;
    isPinching = false;
    initialDistance = 0;
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
