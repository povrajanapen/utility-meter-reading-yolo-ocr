from flask import Flask, send_from_directory

app = Flask(__name__, template_folder="../frontend")

# Serve index.html
@app.route("/")
def home():
    return send_from_directory(app.template_folder, "index.html")

# Serve CSS
@app.route("/<path:filename>.css")
def send_css(filename):
    return send_from_directory("../frontend", f"{filename}.css")

# Serve JS files
@app.route("/js/<path:filename>")
def send_js(filename):
    return send_from_directory("../frontend/js", filename)

# Serve any assets if you have a folder
@app.route("/assets/<path:filename>")
def send_assets(filename):
    return send_from_directory("../frontend/assets", filename)


if __name__ == "__main__":
    app.run(debug=True)