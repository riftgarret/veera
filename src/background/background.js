const EVENTS = {// jshint ignore:line
    set: false,
    connected: "connected",
    disconnected: "disconnected",
    pageChanged: "pageChanged",
    pageRefresh: "pageRefresh",
    suppliesUpdated: "suppliesUpdated",
    dailyReset: "dailyReset",
    weeklyReset: "weeklyReset",
    monthlyReset: "monthlyReset",
    gotLoot: "gotLoot",
    shopPurchase: "shopPurchase",
    newBattle: "newBattle",
    playerDeath: "playerDeath",
    battleOver: "battleOver",
    questOver: "questOver",
    evMissionDone: "evMissionDone",
    tabFound: "tabFound"
};
const GAME_URL = {// jshint ignore:line
    baseGame: "http://game.granbluefantasy.jp/",
    assets: "assets_en/img/sp/assets/",
    assets_light: "assets_en/img_light/sp/assets/",
    size: {
        small: "s/",
        medium: "m/",
        questMedium: "qm/"
    },
    questStart: "#quest/supporter/"
};

window.addEventListener(EVENTS.connected, MainInit);

DevTools.wait(); // Listen for devtools conn

function MainInit() {
    DevTools.query("tabId")
        .then(id => {
            State.game.linkToTab(id)
                .then(() => {
                    chrome.tabs.onUpdated.addListener(State.game.evhTabUpdated);
                    console.group("Loading data");                    
                });
        })
        .then(State.load)
        .then(Supplies.load)
        .then(Raids.load)
        .then(Profile.load)
        .then(Tools.sparkProgress.load)
        .then(() => {
            console.groupEnd();
            console.group("Setting up");
            console.log("Initializing UI.");
            updateUI("syncSettings", State.settings);
            updateUI("init", {
                theme: State.theme.current,
                planner: Planner.listSeries(),
                raids: Raids.getList()
            });
            updateUI("updSupplies", Supplies.getAll());
            // updateUI("updStatus", Profile.status);
            updateUI("updCurrencies", Profile.currencies);
            updateUI("updPendants", Profile.pendants);
            updateUI("updArca", Profile.arcarum);

            console.log("Setting up listeners.");
            if (!EVENTS.set) {
                window.addEventListener(EVENTS.dailyReset, evhDailyReset);
                window.addEventListener(EVENTS.weeklyReset, Profile.reset);
                window.addEventListener(EVENTS.monthlyReset, Profile.reset);
                window.addEventListener(EVENTS.suppliesUpdated, Raids.evhCheckRaidSupplyData);
                window.addEventListener(EVENTS.suppliesUpdated, Planner.evhCheckItemGoalCompletion);
                window.addEventListener(EVENTS.evMissionDone, evhMissionComplete);
                window.addEventListener(EVENTS.pageChanged, evhPageChange);
                window.addEventListener(EVENTS.disconnected, evhDisconnect);
                EVENTS.set = true;
            }

            Time.sync();
            Time.checkReset();

            if (State.store.guild) {
                updateUI("updGuild", `#guild/detail/${State.store.guild}`);
            }

            console.groupEnd();
        })
        .then(() => {
            if (State.settings.checkUpdates) {
                State.checkUpdate(); // Errors caught internally, chain restored.
            }
        })
        .catch(e => {
            DevTools.connection.disconnect();
            printError(e);
        });
}

function evhMissionComplete(ev) {
    showNotif(`Mission ${ev.detail.partial ? "partially " : ""}complete!`, {text: ev.detail.reward.map(x => `${x.count}x ${x.name}`).join("\n")});
}
function evhPageChange(ev) {
    devlog(`Page changed to ${ev.detail}`);
    Raids.evhPageChanged(ev.detail);
}
function evhDailyReset(ev) {
    Raids.reset();
    Profile.reset(ev);
}
function evhDisconnect() {
    if (!State.settings.keepTimersActive) { Time.stop() }
    chrome.tabs.onUpdated.removeListener(State.game.evhTabUpdated);
    // unloadListeners();
}

/* function unloadListeners() {
    if (!State.settings.keepTimersActive) {
        window.removeEventListener(EVENTS.dailyReset, evhDailyReset);
        window.removeEventListener(EVENTS.weeklyReset, Profile.reset);
        window.removeEventListener(EVENTS.monthlyReset, Profile.reset);
    }
    window.removeEventListener(EVENTS.suppliesUpdated, Raids.evhCheckRaidSupplyData);
    window.removeEventListener(EVENTS.suppliesUpdated, Planner.evhCheckItemGoalCompletion);
    window.removeEventListener(EVENTS.evMissionDone, evhMissionComplete);
    window.removeEventListener(EVENTS.pageChanged, evhPageChange);
    window.removeEventListener(EVENTS.disconnected, evhDisconnect);
    EVENTS.set = false;
} */

// Old function, kept for now due to ease of reading intended use.
function updateUI(type, value) {
    DevTools.send(type, value);
}

function fireEvent(name, data) {
    if (data) {
        window.dispatchEvent(new CustomEvent(name, {detail: data}));
    }
    else {
        window.dispatchEvent(new Event(name));
    }
}

function showNotif(title, {text: body, img: icon, onclick} = {}) {
    if (Notification.permission == "granted") {
        let n = new Notification(title, {body, icon});
        // This simple function causes problems with multiple simultaneous notifs so let's just disable it. (the more advanced ones have ??? behavior)
        // Closing and otherwise managing notifs seems p broken.
        // setTimeout(() => n.close(), 8000);// TODO: add to State.settings

        if (onclick && typeof onclick == "function") {
            let clickHandler = function() {
                onclick();
                n.close();
                n.removeEventListener("click", clickHandler);
            };
            n.addEventListener("click", clickHandler);
        }
        return n;
    }
    else if (Notification.permission != "denied") {
        Notification.requestPermission().then(p => {
            if (p == "granted") { showNotif(title, {body, icon, onclick}) }
        });
    }
}

// Very simple, mostly here in case I need to change the way it works easily.
function openTab(url) {
    // This seems to just open a tab so I guess it's fine?
    // If problems, replace with chrome.tabs I guess.
    window.open(url);
}

// Utils
/* function Enum(...names) { //eh it's neat but can't auto-complete and not JSON
    let idx = 1;
    Object.defineProperty(this, "dict", {
        enumerable: false,
        value: {}
    });

    for (let name of names) {
        this.dict[idx] = name;
        this[name] = idx;
        idx++;
    }
    Object.freeze(this.dict);
    Object.freeze(this);
}
Enum.prototype.getName = function (value) {
    return this.dict[value];
};*/

function getEnumNamedValue(list, val) { // for the simple plain obj enum actually used
    return Object.entries(list).find(x => x[1] == val)[0];
}

const DOM_PARSER = new DOMParser();
function parseDom(data, {decode = true, mime = "text/html"} = {}) {
    if (decode) { data = decodeURIComponent(data) }
    return DOM_PARSER.parseFromString(data, mime);
}

// Add a simple fast boolean return match macro just cause it's nicer and clearer.
String.prototype.ismatch = function(s) { return this.indexOf(s) != -1 };

// Adding a last item in array macro
Object.defineProperty(Array.prototype, "last", {
    get: function() {
        return this.length == 0 ? 0 : this[this.length - 1];
    }
});

/*
This creates a new, "flattened" or "jsonified" object, including prototype chain properties.
Used mostly to send data to the UI with getters or otherwise stripped enumerable props triggered/set.
So that we can actually use prototype chaining... a main feature of the language...
*/
Object.defineProperty(Object.prototype, "pack", {
    enumerable: false,
    value: function() {
        let o = {};
        for (let prop in this) {
            let val = this[prop];
            if (Array.isArray(val)) {
                let a = [];
                for (let entry of val) {
                    a.push(entry.pack());
                }
                o[prop] = a;
            }
            else {
                let type = typeof val;
                if (type == "object") {
                    o[prop] = val.pack();
                }
                else if (type != "function") {
                    o[prop] = val;
                }
            }
        }
        return o;
    }
});

// An alternative version of above, to be assigned to .toJSON of custom-flattening objects for use with the native function.
// Make sure toJSON is not enumerable
function prepJson() {
    var o = {};
    for(var key in this) {
        o[key] = this[key];
    }
    return o;
}

function safeDivide(a, b) {
    return a / (b || 1);
}