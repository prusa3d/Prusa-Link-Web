// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

router.get("/", async (req, res, next) => {
    const printer = req.app.get("printer");
  
    const result = printer.cameras();
    
    res.json(result);
});

module.exports = router;