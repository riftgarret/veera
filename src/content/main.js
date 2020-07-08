"use strict";

if(chrome.runtime) {
    BackgroundPage.connect();
}

var roundReadyObserver = null;
function hookForFightReady() {                
    var target = document.querySelector("div.btn-attack-start");
    var isReady = () => target.classList.contains("display-on");        
    var onReady = () => {
        console.log("Djeeta > Reporting in!");
        BackgroundPage.query("djeetaRequestAction")
            .then((res) => DjeetaHandler.onActionReceived(res));
    }

    if(isReady()) {
        onReady();
    } else if(roundReadyObserver == null) {        
        roundReadyObserver = new MutationObserver(function (muts) {
            for(let rec of muts) {
                if(rec.type === 'attributes') {
                    if(isReady()) {                    
                        onReady();
                        roundReadyObserver.disconnect();
                        break;
                    }
                }
            }
        });
        roundReadyObserver.observe(target, { attributes: true, attributeFilter: ['class'] });
    }        
}