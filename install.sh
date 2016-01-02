#!/bin/sh

useradd -r sb-dump
cp -r _build /var/sb-mremote
chown -R root:root /var/sb-mremote && chmod -R 0755 /var/sb-mremote

echo
echo Add this to your nginx config:
cat /var/sb-mremote/nginx.conf


echo
echo Start like this:
echo su - sb-dump
echo cd /var/sb-mremote/sb-dump
echo script /dev/null
echo screen
echo node sb-dump.js
