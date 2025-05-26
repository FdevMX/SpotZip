from flask import Flask, render_template, request, jsonify, send_file
import threading
import os
from downloader import SpotifyDownloader

app = Flask(__name__)
downloader = SpotifyDownloader()

# Variable global para el progreso
download_progress = {"status": "", "completed": False, "error": None}


def update_progress(message):
    """Actualiza el progreso de la descarga"""
    global download_progress
    download_progress["status"] = message


@app.route("/")
def index():
    """Página principal"""
    return render_template(
        "index.html",
        formats=downloader.get_available_formats(),
        qualities=downloader.get_available_qualities(),
    )


@app.route("/validate_url", methods=["POST"])
def validate_url():
    """Valida si la URL de Spotify es correcta"""
    data = request.get_json()
    url = data.get("url", "")

    if downloader.is_valid_spotify_url(url):
        return jsonify({"valid": True, "message": "URL válida"})
    else:
        return jsonify({"valid": False, "message": "URL de Spotify no válida"})


@app.route("/download_single", methods=["POST"])
def download_single():
    """Descarga una canción individual"""
    global download_progress
    download_progress = {"status": "Iniciando...", "completed": False, "error": None}

    data = request.get_json()
    url = data.get("url")
    format_type = data.get("format", "mp3")
    quality = data.get("quality", "320k")  # Default quality

    # Para FLAC, usar una calidad por defecto o ignorar el parámetro
    if format_type == "flac":
        quality = "320k"  # spotdl usa esto internamente para FLAC

    if not downloader.is_valid_spotify_url(url):
        return jsonify({"success": False, "message": "URL no válida"})

    def download_thread():
        global download_progress
        success, message = downloader.download_single_track(
            url, format_type, quality, update_progress
        )
        download_progress["completed"] = True
        if not success:
            download_progress["error"] = message

    # Ejecutar descarga en thread separado
    thread = threading.Thread(target=download_thread)
    thread.start()

    return jsonify({"success": True, "message": "Descarga iniciada"})


@app.route("/download_playlist", methods=["POST"])
def download_playlist():
    """Descarga una playlist completa como ZIP"""
    global download_progress
    download_progress = {
        "status": "Iniciando...",
        "completed": False,
        "error": None,
        "zip_path": None,
    }

    data = request.get_json()
    url = data.get("url")
    format_type = data.get("format", "mp3")
    quality = data.get("quality", "320k")  # Default quality

    # Para FLAC, usar una calidad por defecto o ignorar el parámetro
    if format_type == "flac":
        quality = "320k"  # spotdl usa esto internamente para FLAC

    if not downloader.is_valid_spotify_url(url):
        return jsonify({"success": False, "message": "URL no válida"})

    def download_thread():
        global download_progress
        success, message, zip_path = downloader.download_playlist_as_zip(
            url, format_type, quality, update_progress
        )
        download_progress["completed"] = True
        if success:
            download_progress["zip_path"] = zip_path
            download_progress["zip_filename"] = os.path.basename(zip_path)
        else:
            download_progress["error"] = message

    # Ejecutar descarga en thread separado
    thread = threading.Thread(target=download_thread)
    thread.start()

    return jsonify({"success": True, "message": "Descarga de playlist iniciada"})


@app.route("/progress")
def progress():
    """Obtiene el progreso actual de la descarga"""
    global download_progress
    return jsonify(download_progress)


@app.route("/download_zip/<filename>")
def download_zip(filename):
    """Descarga el archivo ZIP generado"""
    zip_path = os.path.join(downloader.zips_dir, filename)
    if os.path.exists(zip_path):
        return send_file(zip_path, as_attachment=True, download_name=filename)
    else:
        return jsonify({"error": "Archivo no encontrado"}), 404


@app.route("/favicon.ico")
def favicon():
    """Ruta para el favicon"""
    return send_file("static/img/favicon.svg", mimetype="image/svg+xml")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
