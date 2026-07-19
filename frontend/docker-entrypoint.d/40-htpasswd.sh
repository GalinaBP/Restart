#!/bin/sh
# Writes the basic-auth user file from the BASIC_AUTH_USERS env var (htpasswd line(s),
# e.g. the output of:  printf 'galina:%s\n' "$(openssl passwd -apr1 'password')").
# Runs via the nginx image's /docker-entrypoint.d hook; with the var unset the file stays
# empty and auth_basic stays `off` (see nginx.conf template).
set -e
if [ -n "${BASIC_AUTH_USERS:-}" ]; then
    printf '%s\n' "${BASIC_AUTH_USERS}" > /etc/nginx/.htpasswd
    echo "40-htpasswd.sh: basic-auth user file written"
fi
