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
    }

    showProgress() {
        document.getElementById('progressArea').style.display = 'block';
        document.getElementById('resultArea').style.display = 'none';
    }

    hideProgress() {
        document.getElementById('progressArea').style.display = 'none';
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
    }

    showDownloadLink(filename) {
        const resultArea = document.getElementById('resultArea');
        const resultAlert = document.getElementById('resultAlert');
        const resultContent = document.getElementById('resultContent');
        
        resultAlert.className = 'alert alert-success';
        resultContent.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <h6 class="mb-1">
                        <i class="fas fa-check-circle"></i> ¡Playlist descargada exitosamente!
                    </h6>
                    <p class="mb-0">Tu archivo ZIP está listo para descargar</p>
                </div>
                <a href="/download_zip/${filename}" class="download-link">
                    <i class="fas fa-download"></i> Descargar ZIP
                </a>
            </div>
        `;
        
        resultArea.style.display = 'block';
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
        
        resultArea.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                resultArea.style.display = 'none';
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
    new SpotZipDownloader();
});
