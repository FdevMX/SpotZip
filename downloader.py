import os
import subprocess
import threading
import zipfile
from datetime import datetime
import re


class SpotifyDownloader:
    def __init__(self, downloads_dir="downloads", zips_dir="zips"):
        self.downloads_dir = downloads_dir
        self.zips_dir = zips_dir
        self.ensure_directories()

    def ensure_directories(self):
        """Asegura que los directorios necesarios existan"""
        os.makedirs(self.downloads_dir, exist_ok=True)
        os.makedirs(self.zips_dir, exist_ok=True)

    def is_valid_spotify_url(self, url):
        """Valida si la URL es de Spotify"""
        spotify_patterns = [
            r"https://open\.spotify\.com/track/[a-zA-Z0-9]+",
            r"https://open\.spotify\.com/playlist/[a-zA-Z0-9]+",
            r"https://open\.spotify\.com/album/[a-zA-Z0-9]+",
            r"spotify:track:[a-zA-Z0-9]+",
            r"spotify:playlist:[a-zA-Z0-9]+",
            r"spotify:album:[a-zA-Z0-9]+",
        ]
        return any(re.match(pattern, url) for pattern in spotify_patterns)

    def get_playlist_name(self, url):
        """Obtiene el nombre de la playlist desde spotdl"""
        try:
            result = subprocess.run(
                ["spotdl", "meta", url], capture_output=True, text=True, check=True
            )

            # Buscar el nombre en la salida
            lines = result.stdout.split("\n")
            for line in lines:
                if "Name:" in line:
                    name = line.split("Name:", 1)[1].strip()
                    # Limpiar caracteres no válidos para nombres de archivo
                    return re.sub(r'[<>:"/\\|?*]', "_", name)
            return f"playlist_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        except:
            return f"playlist_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def download_single_track(
        self, url, format_type="mp3", quality="320k", progress_callback=None
    ):
        """Descarga una canción individual"""
        try:
            output_dir = os.path.join(self.downloads_dir, "single_tracks")
            os.makedirs(output_dir, exist_ok=True)

            cmd = [
                "spotdl",
                "--format",
                format_type,
                "--bitrate",
                quality,
                "--output",
                output_dir,
                url,
            ]

            if progress_callback:
                progress_callback("Iniciando descarga...")

            process = subprocess.run(cmd, capture_output=True, text=True)

            if process.returncode == 0:
                if progress_callback:
                    progress_callback("¡Descarga completada!")
                return True, "Canción descargada exitosamente"
            else:
                return False, f"Error en la descarga: {process.stderr}"

        except Exception as e:
            return False, f"Error: {str(e)}"

    def download_playlist_as_zip(
        self, url, format_type="mp3", quality="320k", progress_callback=None
    ):
        """Descarga una playlist completa y la comprime en ZIP"""
        try:
            playlist_name = self.get_playlist_name(url)
            temp_dir = os.path.join(self.downloads_dir, f"temp_{playlist_name}")
            os.makedirs(temp_dir, exist_ok=True)

            if progress_callback:
                progress_callback("Obteniendo información de la playlist...")

            # Comando spotdl para descargar la playlist
            cmd = [
                "spotdl",
                "--format",
                format_type,
                "--bitrate",
                quality,
                "--output",
                temp_dir,
                url,
            ]

            if progress_callback:
                progress_callback("Descargando canciones...")

            process = subprocess.run(cmd, capture_output=True, text=True)

            if process.returncode != 0:
                return False, f"Error en la descarga: {process.stderr}", None

            if progress_callback:
                progress_callback("Creando archivo ZIP...")

            # Crear ZIP
            zip_filename = f"{playlist_name}.zip"
            zip_path = os.path.join(self.zips_dir, zip_filename)

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        if file.endswith((".mp3", ".m4a", ".flac", ".ogg", ".opus")):
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, temp_dir)
                            zipf.write(file_path, arcname)

            # Limpiar directorio temporal
            import shutil

            shutil.rmtree(temp_dir)

            if progress_callback:
                progress_callback("¡ZIP creado exitosamente!")

            return True, f"Playlist descargada como {zip_filename}", zip_path

        except Exception as e:
            return False, f"Error: {str(e)}", None

    def get_available_formats(self):
        """Retorna los formatos disponibles"""
        return ["mp3", "m4a", "flac"]

    def get_available_qualities(self):
        """Retorna las calidades disponibles"""
        return [
            {"value": "128k", "label": "128 kbps - Estándar"},
            {"value": "192k", "label": "192 kbps - Buena"},
            {"value": "256k", "label": "256 kbps - Excelente"},
            {"value": "320k", "label": "320 kbps - Máxima"}
        ]
