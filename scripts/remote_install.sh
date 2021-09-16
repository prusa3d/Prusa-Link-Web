#!/bin/sh

# This file is part of the Prusa Connect Local
# Copyright (C) 2014-2018 Futur3d - www.futur3d.net
# Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
# SPDX-License-Identifier: GPL-3.0-or-later

# Resolve target
if [ -z ${1} ]; then
    echo "Please provide target ip as the first argument"
    exit -1
fi
if [ -z ${2} ]; then
    echo "Please provide target name as the second argument (sl1/m1)"
    exit -1
fi

ip=${1}
target=${2}
echo "Target is ${target}@${ip}"

echo "Building"
rm -fr dist-${target}/*
npm run dev:${target}

echo "Removing remote web"
ssh root@${ip} "find /srv/http/${target}/* -exec rm -fr {} \; 2>/dev/null"

echo "Installing on target"
scp -r dist-${target}/* root@${ip}:/srv/http/${target}/

echo "Done"
