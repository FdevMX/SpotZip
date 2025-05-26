// Función para inicializar todos los selectores personalizados en la página
function initializeCustomSelects() {
    // Obtener todos los wrappers de selectores personalizados
    const selectWrappers = document.querySelectorAll('.custom-select-wrapper');

    selectWrappers.forEach(wrapper => {
        const originalSelect = wrapper.querySelector('.original-select');
        if (!originalSelect) return;

        // Crear la estructura del selector personalizado
        const customSelectContainer = document.createElement('div');
        customSelectContainer.classList.add('custom-select-container');
        customSelectContainer.setAttribute('tabindex', '0'); // Para permitir enfocar con teclado

        const trigger = document.createElement('div');
        trigger.classList.add('custom-select-trigger');

        const selectedDisplay = document.createElement('span');
        trigger.appendChild(selectedDisplay);

        const arrow = document.createElement('div');
        arrow.classList.add('custom-arrow');
        trigger.appendChild(arrow);

        customSelectContainer.appendChild(trigger);

        const optionsList = document.createElement('div');
        optionsList.classList.add('custom-options-list');

        // Poblar las opciones personalizadas desde el select original
        Array.from(originalSelect.options).forEach((optionElement, index) => {
            const customOption = document.createElement('div');
            customOption.classList.add('custom-option');
            customOption.textContent = optionElement.textContent;
            customOption.dataset.value = optionElement.value;

            if (optionElement.selected) {
                selectedDisplay.textContent = optionElement.textContent;
                customOption.classList.add('selected');
            }

            customOption.addEventListener('click', () => {
                // Actualizar el valor seleccionado
                selectedDisplay.textContent = customOption.textContent;
                originalSelect.value = customOption.dataset.value;

                // Actualizar la clase 'selected' en las opciones personalizadas
                optionsList.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');

                // Cerrar la lista de opciones
                customSelectContainer.classList.remove('open');
                optionsList.style.display = 'none';

                // Disparar un evento de cambio en el select original si es necesario
                const event = new Event('change', { bubbles: true });
                originalSelect.dispatchEvent(event);
            });
            optionsList.appendChild(customOption);
        });

        customSelectContainer.appendChild(optionsList);
        wrapper.appendChild(customSelectContainer); // Añadir el contenedor personalizado al wrapper

        // Event listener para abrir/cerrar la lista de opciones
        trigger.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el click se propague al documento
            const isOpen = customSelectContainer.classList.toggle('open');
            optionsList.style.display = isOpen ? 'block' : 'none';
        });
        
        // También permitir abrir/cerrar con Enter o Espacio cuando el contenedor está enfocado
        customSelectContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger.click();
            }
        });

    });

    // Cerrar todos los selectores personalizados si se hace clic fuera de ellos
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select-container.open').forEach(container => {
            if (!container.contains(e.target)) {
                container.classList.remove('open');
                container.querySelector('.custom-options-list').style.display = 'none';
            }
        });
    });
}

class SpotZipDownloader {
    constructor() {
        this.init();
        this.progressInterval = null;
    }

    init() {
        this.bindEvents();
        this.validateInitialState();
    }

    bindEvents() {
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadSingle();
        });

        document.getElementById('downloadPlaylistBtn').addEventListener('click', () => {
            this.downloadPlaylist();
        });

        document.getElementById('spotifyUrl').addEventListener('input', (e) => {
            this.validateUrl(e.target.value);
        });
    }

    validateInitialState() {
        const downloadBtn = document.getElementById('downloadBtn');
        const playlistBtn = document.getElementById('downloadPlaylistBtn');
        downloadBtn.disabled = true;
        playlistBtn.disabled = true;
    }

    async validateUrl(url) {
        const downloadBtn = document.getElementById('downloadBtn');
        const playlistBtn = document.getElementById('downloadPlaylistBtn');
        
        if (!url.trim()) {
            downloadBtn.disabled = true;
            playlistBtn.disabled = true;
            return;
        }

        try {
            const response = await fetch('/validate_url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            const result = await response.json();
            
            if (result.valid) {
                downloadBtn.disabled = false;
                playlistBtn.disabled = false;
                this.showMessage('success', result.message);
            } else {
                downloadBtn.disabled = true;
                playlistBtn.disabled = true;
                this.showMessage('danger', result.message);
            }
        } catch (error) {
            console.error('Error validating URL:', error);
            downloadBtn.disabled = true;
            playlistBtn.disabled = true;
        }
    }

    async downloadSingle() {
        const url = document.getElementById('spotifyUrl').value;
        const format = document.getElementById('format').value;
        const quality = document.getElementById('quality').value;

        if (!url.trim()) {
            this.showMessage('danger', 'Por favor ingresa una URL válida');
            return;
        }

        this.showProgress();
        this.disableButtons();

        try {
            const response = await fetch('/download_single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    format: format,
                    quality: quality
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.startProgressMonitoring();
            } else {
                this.hideProgress();
                this.enableButtons();
                this.showMessage('danger', result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            this.hideProgress();
            this.enableButtons();
            this.showMessage('danger', 'Error de conexión');
        }
    }

    async downloadPlaylist() {
        const url = document.getElementById('spotifyUrl').value;
        const format = document.getElementById('format').value;
        const quality = document.getElementById('quality').value;

        if (!url.trim()) {
            this.showMessage('danger', 'Por favor ingresa una URL válida');
            return;
        }

        this.showProgress();
        this.disableButtons();

        try {
            const response = await fetch('/download_playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    format: format,
                    quality: quality
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.startProgressMonitoring();
            } else {
                this.hideProgress();
                this.enableButtons();
                this.showMessage('danger', result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            this.hideProgress();
            this.enableButtons();
            this.showMessage('danger', 'Error de conexión');
        }
    }

    startProgressMonitoring() {
        this.progressInterval = setInterval(async () => {
            try {
                const response = await fetch('/progress');
                const progress = await response.json();
                
                this.updateProgress(progress.status);
                
                if (progress.completed) {
                    clearInterval(this.progressInterval);
                    this.hideProgress();
                    this.enableButtons();
                    
                    if (progress.error) {
                        this.showMessage('danger', progress.error);
                    } else if (progress.zip_filename) {
                        // Es una playlist descargada como ZIP
                        this.showDownloadLink(progress.zip_filename);
                    } else {
                        // Es una canción individual
                        this.showMessage('success', '¡Descarga completada! Revisa la carpeta downloads/single_tracks');
                    }
                }
            } catch (error) {
                console.error('Error checking progress:', error);
                clearInterval(this.progressInterval);
                this.hideProgress();
                this.enableButtons();
                this.showMessage('danger', 'Error monitoreando el progreso');
            }
        }, 1000);
    }    showProgress() {
        document.getElementById('progressArea').classList.remove('hidden');
        document.getElementById('resultArea').classList.add('hidden');
    }

    hideProgress() {
        document.getElementById('progressArea').classList.add('hidden');
    }

    updateProgress(status) {
        document.getElementById('statusText').textContent = status;
        
        // Animación de la barra de progreso
        const progressBar = document.querySelector('.progress-bar');
        if (status.includes('Iniciando')) {
            progressBar.style.width = '20%';
        } else if (status.includes('Descargando')) {
            progressBar.style.width = '60%';
        } else if (status.includes('ZIP') || status.includes('completada')) {
            progressBar.style.width = '90%';
        } else if (status.includes('exitosamente')) {
            progressBar.style.width = '100%';
        }
    }    showDownloadLink(filename) {
        const resultArea = document.getElementById('resultArea');
        const resultAlert = document.getElementById('resultAlert');
        const resultContent = document.getElementById('resultContent');
        
        resultAlert.className = 'alert alert-success';
        resultContent.innerHTML = `
            <div class="alert-content">
                <div class="alert-info">
                    <div class="alert-title">
                        <i class="fas fa-check-circle"></i> ¡Playlist descargada exitosamente!
                    </div>
                    <p class="alert-text">Tu archivo ZIP está listo para descargar</p>
                </div>
                <a href="/download_zip/${filename}" class="download-link">
                    <i class="fas fa-download"></i> Descargar ZIP
                </a>
            </div>
        `;
        
        resultArea.classList.remove('hidden');
    }

    showMessage(type, message) {
        const resultArea = document.getElementById('resultArea');
        const resultAlert = document.getElementById('resultAlert');
        const resultContent = document.getElementById('resultContent');
        
        resultAlert.className = `alert alert-${type}`;
        resultContent.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        resultArea.classList.remove('hidden');
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                resultArea.classList.add('hidden');
            }, 5000);
        }
    }

    disableButtons() {
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('downloadPlaylistBtn').disabled = true;
    }

    enableButtons() {
        const url = document.getElementById('spotifyUrl').value;
        if (url.trim()) {
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('downloadPlaylistBtn').disabled = false;
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeCustomSelects(); // Inicializar los selectores personalizados
    new SpotZipDownloader();
});
