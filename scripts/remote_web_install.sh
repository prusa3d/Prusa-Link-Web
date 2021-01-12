#!/bin/sh

# This file is part of the SL1 firmware
# Copyright (C) 2014-2018 Futur3d - www.futur3d.net
# Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
# SPDX-License-Identifier: GPL-3.0-or-later

# Resolve target
if [ "$#" -ne 1 ]; then
    echo "Please provide target ip as the only argument"
    exit -1
fi
target=${1}
echo "Target is ${target}"

echo "Building"
rm -fr dist/*
npm run ui:dev

echo "Removing remote web"
ssh root@${target} "find /srv/http/intranet/* \( ! -name error_401.txt \) -exec rm -fr {} \; 2>/dev/null"

echo "Installing on target"
scp -r dist/* root@${target}:/srv/http/intranet/

echo "Done"
