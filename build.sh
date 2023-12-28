#!/bin/bash

set -e

if [ -e 'item-placeholder.zip' ]
then
  rm item-placeholder.zip
fi

rsync --recursive --delete --exclude '*.mts' src/ dist/

npx tsc

cd dist
zip -r ../item-placeholder.zip  ./*
