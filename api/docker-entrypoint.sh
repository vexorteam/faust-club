#!/bin/sh
set -e
mkdir -p "${UPLOAD_DIR:-/app/uploads}"
chown -R faust:faust "${UPLOAD_DIR:-/app/uploads}"

exec gosu faust "$@"