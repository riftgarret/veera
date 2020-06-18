"use strict";

if(chrome.runtime) {
    BackgroundPage.connect();
}

function hookForFightReady() {                
    var target = document.querySelector("div.btn-attack-start");
    var isReady = () => target.classList.contains("display-on");        
    var onReady = () => {
        console.log("Djeeta > Reporting in!");
        BackgroundPage.query("djeetaRequestAction")
            .then(DjeetaHandler.onActionReceived);
    }

    if(isReady()) {
        onReady();
    } else {
        var observer = new MutationObserver(function (muts) {
        muts.forEach(function(rec) {
            if(rec.type === 'attributes') {
                if(isReady()) {                    
                    onReady();
                    observer.disconnect();
                }
            }
        })});
        observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    }        
}