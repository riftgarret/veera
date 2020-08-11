"use strict";

class PageMeta {
    page = Page.UNKNOWN;
    hash
    dataEvents = createNumberProxy()
    meta = {}

    newPage(page, hash) {
        this.page = page;
        this.hash = hash;
        this.dataEvents = createNumberProxy();
        this.meta = {};
    }
}

class UserStatus {
    ap = 0
    bp = 0
    halfElixirCount = 0
    halfElixirRecovery = 0
    berryCount = 0
}