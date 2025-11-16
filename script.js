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

// === NUEVAS CONSTANTES Y VARIABLES PARA EL REDIMENSIONAMIENTO DE BORDES ===
const RESIZE_EDGE_THRESHOLD = 15; // Distancia en píxeles para considerar que se ha "enganchado" un borde
let resizingEdges = { top: false, right: false, bottom: false, left: false };


// ======================================================================
// FUNCIÓN PARA CALCULAR LA POSICIÓN INICIAL (AJUSTADA AL CENTRO DEL ABOUT ME)
// ... (sin cambios)
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
// ... (sin cambios)
function updateDimensionsText(windowElement) {
    const currentWidth = Math.round(windowElement.offsetWidth);
    const currentBodyHeight = Math.round(windowElement.offsetHeight - FOOTER_HEIGHT);

    const dimensionsSpan = windowElement.querySelector('.dimensions-text');
    if (dimensionsSpan) {
        dimensionsSpan.textContent = `(${currentWidth}x${currentBodyHeight})`;
    }
}

// Función para establecer el tamaño inicial y la proporción
// ... (sin cambios)
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
// ... (sin cambios)
draggableElements.forEach(item => {
    const resizeHandle = item.querySelector('.resize-handle');

    initializeWindow(item);

    item.addEventListener('mousedown', startInteraction);
    item.addEventListener('touchstart', startInteraction);

    if (resizeHandle) {
        // Mantenemos el handle por separado para la compatibilidad con el código de arriba
        resizeHandle.addEventListener('mousedown', resizeStart);
        resizeHandle.addEventListener('touchstart', resizeStart);
    }
    
    // Opcional: para cambiar el cursor al pasar por un borde
    item.addEventListener('mousemove', checkBorders); 
    item.addEventListener('mouseleave', () => {
        item.style.cursor = 'pointer'; 
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

// === NUEVA FUNCIÓN: COMPROBAR BORDES PARA CAMBIAR EL CURSOR ===
function checkBorders(e) {
    if (activeItem || isResizing) return; 
    
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    
    let cursor = 'pointer';

    const onLeft = x < RESIZE_EDGE_THRESHOLD;
    const onRight = w - x < RESIZE_EDGE_THRESHOLD;
    const onTop = y < RESIZE_EDGE_THRESHOLD;
    // Ojo: Si clicas el footer no queremos redimensionar, el footer tiene 35px
    const onBottom = h - y < FOOTER_HEIGHT && h - y > RESIZE_EDGE_THRESHOLD; 

    if (onLeft && onTop || onRight && onBottom) {
        cursor = 'nwse-resize';
    } else if (onRight && onTop || onLeft && onBottom) {
        cursor = 'nesw-resize';
    } else if (onLeft || onRight) {
        cursor = 'ew-resize';
    } else if (onTop || onBottom) {
        cursor = 'ns-resize';
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
        
        // Guardar estado inicial para el arrastre
        xOffset = eventClientX - rect.left;
        yOffset = eventClientY - rect.top;
        initialX = eventClientX;
        initialY = eventClientY;
        
    }

}

/* ==================== INICIO DE REDIMENSIÓN (HANDLE - Mantenido para referencia) ==================== */

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
        
        // Si el evento de movimiento no tiene coordenadas, salimos
        if (eventClientX === null || eventClientY === null) return; 
        
        let newWidth, newHeight, newLeft, newTop;
        newLeft = initialLeft;
        newTop = initialTop;
        
        if (isPinching && isTouch && e.touches.length === 2) {
            // --- MODO REDIMENSIÓN: PELLIZCO (PINCH-TO-ZOOM) ---
            // (La lógica de pinch-to-zoom ya maneja la posición y el tamaño por sí misma)
            const currentDx = e.touches[0].clientX - e.touches[1].clientX;
            const currentDy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            const scaleFactor = currentDistance / initialDistance;

            newWidth = initialWidth * scaleFactor;
            newHeight = initialHeight * scaleFactor;

            const deltaWidth = newWidth - initialWidth;
            const deltaHeight = newHeight - initialHeight;

            newLeft = initialLeft - (deltaWidth / 2);
            newTop = initialTop - (deltaHeight / 2);

        } else if (!isPinching) {
            // --- MODO REDIMENSIÓN: BORDE/ESQUINA O HANDLE ---
            const deltaX = eventClientX - initialX;
            const deltaY = eventClientY - initialY;
            
            // 1. Calcular el nuevo tamaño y posición basado en los bordes arrastrados
            
            newWidth = initialWidth;
            newHeight = initialHeight;

            if (resizingEdges.right) {
                newWidth = initialWidth + deltaX;
            } else if (resizingEdges.left) {
                newWidth = initialWidth - deltaX;
                newLeft = initialLeft + deltaX;
            }

            // Ojo: Si el borde inferior está siendo arrastrado, el alto SÍ incluye el FOOTER
            // La altura del cuerpo (que es la que mantiene la proporción) es (newHeight - FOOTER_HEIGHT)
            if (resizingEdges.bottom) {
                newHeight = initialHeight + deltaY;
            } else if (resizingEdges.top) {
                newHeight = initialHeight - deltaY;
                newTop = initialTop + deltaY;
            }
            
            // 2. Aplicar corrección de aspecto
            // Primero nos aseguramos de que el tamaño mínimo se respete para evitar errores de división.
            const MIN_W = 150;
            const MIN_H = 100;
            
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);

            let newBodyHeight = newHeight - FOOTER_HEIGHT;
            
            // Si arrastramos una esquina (o pinch-to-zoom), usamos la mayor variación (X o Y) para calcular
            // la proporción. Si solo arrastramos un lado, recalculamos el otro.
            if ((resizingEdges.left || resizingEdges.right) && (resizingEdges.top || resizingEdges.bottom)) {
                 // Esquina: guiamos por la mayor variación (para una sensación de redimensionamiento más natural)
                 if (Math.abs(deltaX) > Math.abs(deltaY)) {
                     newBodyHeight = newWidth / initialRatio;
                     newHeight = newBodyHeight + FOOTER_HEIGHT;
                 } else {
                     // El nuevo alto debe ser consistente con la posición Y
                     newBodyHeight = newHeight - FOOTER_HEIGHT;
                     newWidth = newBodyHeight * initialRatio;
                     // Reajustar la posición si se arrastra desde arriba/izquierda
                     if (resizingEdges.top) {
                         newTop = initialTop + initialHeight - newHeight;
                     }
                     if (resizingEdges.left) {
                         newLeft = initialLeft + initialWidth - newWidth;
                     }
                 }

            } else if (resizingEdges.left || resizingEdges.right) {
                // Solo ancho (lateral): ajustamos el alto por proporción
                newBodyHeight = newWidth / initialRatio;
                newHeight = newBodyHeight + FOOTER_HEIGHT;
                // Si arrastramos desde la izquierda, la posición Y debe ajustarse para mantener la proporción
                newTop = initialTop + (initialHeight - newHeight) / 2;

            } else if (resizingEdges.top || resizingEdges.bottom) {
                // Solo alto (superior/inferior): ajustamos el ancho por proporción
                newBodyHeight = newHeight - FOOTER_HEIGHT;
                newWidth = newBodyHeight * initialRatio;
                // Si arrastramos desde arriba/abajo, la posición X debe ajustarse para mantener la proporción
                newLeft = initialLeft + (initialWidth - newWidth) / 2;
            }
            
            // Asegurarse de que no nos salimos del mínimo de nuevo
            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);
            
            
            // 3. Aplicar límites de borde (No salirse de la ventana del navegador)
            
            // Aplicar límites de posición
            let finalLeft = Math.min(Math.max(newLeft, MIN_LEFT), viewportWidth - newWidth - BODY_MARGIN);
            let finalTop = Math.min(Math.max(newTop, MIN_TOP), viewportHeight - newHeight - BODY_MARGIN);
            
            // Si la posición se ha ajustado, re-ajustamos el tamaño (especialmente si arrastramos izq/arriba)
            // Esto asegura que la ventana no se "engancha" fuera de los límites.
            if (resizingEdges.left && finalLeft > newLeft) {
                newWidth = initialWidth - (finalLeft - initialLeft);
            }
            if (resizingEdges.top && finalTop > newTop) {
                newHeight = initialHeight - (finalTop - initialTop);
            }
            
            newWidth = Math.min(newWidth, viewportWidth - finalLeft - BODY_MARGIN);
            newHeight = Math.min(newHeight, viewportHeight - finalTop - BODY_MARGIN);

            newWidth = Math.max(newWidth, MIN_W);
            newHeight = Math.max(newHeight, MIN_H);
            
            newBodyHeight = newHeight - FOOTER_HEIGHT;
            
            // Si la posición ha sido limitada, y estamos en redimensionamiento lateral/vertical
            // hay que re-aplicar la proporción para evitar deformación.
            if ((resizingEdges.left || resizingEdges.right) && !(resizingEdges.top || resizingEdges.bottom)) {
                 newWidth = newBodyHeight * initialRatio;
                 finalLeft = initialLeft + (initialWidth - newWidth) / 2;
            }
            if ((resizingEdges.top || resizingEdges.bottom) && !(resizingEdges.left || resizingEdges.right)) {
                 newHeight = newWidth / initialRatio + FOOTER_HEIGHT;
                 finalTop = initialTop + (initialHeight - newHeight) / 2;
            }
            
            activeItem.style.width = newWidth + 'px';
            activeItem.style.height = newHeight + 'px';
            activeItem.style.left = finalLeft + 'px';
            activeItem.style.top = finalTop + 'px';
            
        }
        
        updateDimensionsText(activeItem);

    } else {
        // --- Modo Arrastre (DRAG) ---
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
    resizingEdges = { top: false, right: false, bottom: false, left: false }; // Reiniciar bordes
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

// --- FUNCIONES DEL FORMULARIO DE CORREO (sin cambios) ---

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
