import app

if __name__ == '__main__':
    # Il primo 'app' è il modulo importato (app.so)
    # Il secondo 'app' è l'istanza di Flask al suo interno
    app.app.run(host='0.0.0.0', debug=True, port=5001)