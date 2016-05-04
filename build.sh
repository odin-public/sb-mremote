#!/bin/sh

type npm >/dev/null 2>&1 || { echo >&2 "Unable to find 'npm'. Exiting"; exit 1; }
type babel >/dev/null 2>&1 || { echo >&2 "Unable to find 'babel' (npm -g i babel-cli). Exiting"; exit 1; }
type browserify >/dev/null 2>&1 || { echo >&2 "Unable to find 'browserify' (npm -g i browserify). Exiting"; exit 1; }
type uglifyjs >/dev/null 2>&1 || { echo >&2 "Unable to find 'uglify-js' (npm -g i uglify-js). Exiting"; exit 1; }

pushd .

mkdir _build && cd _build || exit 1

npm link babel-preset-es2015
cp ../src/*.js .
babel --presets es2015 --out-dir _babel *.js
\cp -f _babel/* .
rm -rf _babel node_modules
mkdir sb-dump
cd sb-dump
npm i bluebird@3.3.5
mv ../{question.js,sb-dump.js} .
cd ..
npm i bluebird@3.3.5 xml2js@0.4.16 jszip@2.6.0
browserify -r bluebird -r xml2js -r jszip -r buffer -r crypto | uglifyjs --screw-ie8 -c -m > lib.js
rm -rf node_modules
uglifyjs main.js --screw-ie8 -c -m -o main1.js
\mv -f main{1,}.js
cp ../src/index.html .

[ "$1" = "install" ] || exit
popd

. ./install.sh
