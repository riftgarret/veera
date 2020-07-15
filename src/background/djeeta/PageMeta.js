"use strict";

class PageMeta {
    page = Page.UNKNOWN;

    newPage(page, hash) {
        this.page = page;
        this.hash = hash;
        this.meta = {};
    }    
}