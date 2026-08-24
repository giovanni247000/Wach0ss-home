# Launcher alternativo a main.py per l'esecuzione emulata arm64.
# Differenze da main.py:
#  1) debug=False  -> il debugger Werkzeug esposto in rete e' un vettore RCE
#  2) patch setsockopt -> qemu-user (aarch64 emulato) non implementa
#     IP_MULTICAST_IF e affini: senza questo zeroconf crasha all'import
#     di app.so (app.py riga 289). Ignorare ENOPROTOOPT fa ripiegare mDNS
#     sull'interfaccia di default invece di far morire il processo.
import errno
import socket

_orig_setsockopt = socket.socket.setsockopt


def _tolerant_setsockopt(self, level, optname, value, *args):
    try:
        return _orig_setsockopt(self, level, optname, value, *args)
    except OSError as exc:
        if exc.errno == errno.ENOPROTOOPT:
            return None
        raise


socket.socket.setsockopt = _tolerant_setsockopt

import app  # noqa: E402

if __name__ == '__main__':
    app.app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
