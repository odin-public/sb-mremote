#!/bin/sh

USER=sb-mremote
DIR=/var/sb-mremote

read -p "This will wipe '$DIR' and remove '$USER' user. Are you sure? [y/n]: " -n 1 -r
echo

[ $REPLY != y ] && echo 'Aborted at user request!' && exit 0

killall -u sb-mremote
rm -rf /var/sb-mremote
userdel -fr sb-mremote

echo 'Done!'
