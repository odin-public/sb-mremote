#!/bin/sh

USER=sb-mremote
DIR=/var/sb-mremote

if [ -f './scripts/build.sh' ]; then # running from already-built tree
  [ ! -d './_build' ] && . ./scripts/build.sh
  cd ./_build
fi

[ -d $DIR ] && echo "'$DIR' already exists! Exiting!" && exit 1

if [ ! -d './node_modules' ]; then # running via 'npm i'
  LOC=$(pwd)
  cd ../.. && mv $LOC/* . && rm -rf $LOC
fi

useradd -r $USER
cp -r . $DIR && cd $DIR

chown -R root:root .
chmod -R 0755 .

cat <<- MSG

Add this to your nginx config (inside a 'server' section):

include $(readlink -f ./nginx.conf);

Start via 'npm':

su - $USER
cd $DIR
screen npm start

MSG
