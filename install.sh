#!/bin/sh

useradd -r sb-dump
cp -r _build /var/sb-mremote
chown -R root:root /var/sb-mremote && chmod -R 0755 /var/sb-mremote

cat <<MSG

Add this to your nginx config:
MSG
cat src/nginx.conf

cat <<MSG

Start like this:
su - sb-dump
cd /var/sb-mremote/sb-dump
script /dev/null
screen
node sb-dump.js
MSG
