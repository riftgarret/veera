"use strict";

class PageMeta {
    page = Page.UNKNOWN;

    newPage(page, hash) {
        this.page = page;
        this.hash = hash;
        this.meta = {};
    }
}

class UserStatus {
    ap = 0
    bp = 0
    halfElixerCount = 0
    halfElixerRecovery = 0
    berryCount = 0
}