#!/bin/sh

shopt -s extglob

NODE_ENV=development
BABEL_PRESETS=--presets=node7

type npm >/dev/null 2>&1 || { echo >&2 "Unable to find 'npm'. Exiting"; exit 1; }

rm -rf _build && mkdir _build && cd _build

PATH=$(readlink -f ./node_modules)/.bin:$PATH

cp -r ../{daemon,ui,scripts,package.json,LICENSE,README.md} . && npm i

babel $BABEL_PRESETS ./daemon/ --out-dir ./daemon/
babel $BABEL_PRESETS ./ui/ --out-dir ./ui/

rm -f ./scripts/build.sh

cd ui

mv ./nginx.conf ..
browserify -e main.js -o main.js
rm -rf !(index.html|main.js)

if [ "$1" != "nominify" ]; then
  babel --minified . --out-dir . # could not find a better minifier
fi

cd .. && npm prune --production=true

echo "Success! Use 'npm run install' to install..."
