"use strict";

class DjeetaScriptEngine {
    init() {
        $('#toggle-combat-script > input').change((e) => {
            let enable = $(e.target).prop('checked');
            BackgroundPage.send("djeetaCombatScriptEnabled", enable)
        });
    }

    updateCombatScriptToggle(enable) {
        $('#toggle-combat-script > input').prop('checked', enable);
    }

    loadScriptRunner(scriptSyntax, name) {
        console.log("load syntax");
        $("#script-engine-scriptname").html(name);
        this.inflateScriptRunnerHtml(scriptSyntax);
    }

    applyScriptEvaluation({name, evaluation, evaluator}) {
        console.log("load script result");
        $("#script-engine-scriptname").html(name);
        this.inflateScriptRunnerHtml(evaluator, evaluation.results);
    }

    inflateScriptRunnerHtml(scriptSyntax, scriptResults) {
        let decorators = this.generateDecorators(scriptSyntax, scriptResults);

        let parent = $("#script-runner");
        parent.empty();
        for(let i = 0; i < scriptSyntax.lines.length; i++) {
            let lineRaw = scriptSyntax.lines[i].raw;
            let decorator = decorators[i];

            let div = this.applyLineDecorator(lineRaw, decorator);

            parent.append(div);
        }
    }

    generateDecorators(scriptSyntax, scriptResults) {
        let foundActionCounter = 1; // puts the attribute that CSS recognizes for highlighting
        let decorators = {};
        for(let i = 0; i < scriptSyntax.lines.length; i++) {
            let line = scriptSyntax.lines[i];
            let lineNumber = i + 1;

            let lineDecorator = this.createLineDecorator();
            decorators[i] = lineDecorator;

            if(line.error) {
                let error = line.error;
                lineDecorator.className = "error";
                let errorDecor = lineDecorator.createInlineDecorator(error.rawClip);
                errorDecor.attr = {title: error.msg};
            }

            if(scriptResults && scriptResults[lineNumber]) {
                let lineResult = scriptResults[lineNumber];

                let isValid = true;

                if(lineResult.when) {
                    isValid = lineResult.when.isValid;
                }

                if(lineResult.find) {
                    isValid &= lineResult.find.isValid;
                }

                if(!isValid) {
                    lineDecorator.className = "invalid";
                    continue; // skip processing line and go to next.
                }

                if(lineResult.when) {
                    let whenDecor = lineDecorator.createInlineDecorator(lineResult.when.exp.rawClip);
                    whenDecor.className = "valid when-exp";
                }

                if(lineResult.find) {
                    let findDecor = lineDecorator.createInlineDecorator(lineResult.find.exp.rawClip);
                    findDecor.className = `${find.capture? "valid" : "invalid"} find-exp`;
                    if(find.capture) {
                        findDecor.attr = { "name" : find.capture };
                    }
                }

                for(let action of lineResult.actions) {
                    let actionDecor = lineDecorator.createInlineDecorator(action.action.rawClip);
                    actionDecor.className = (action.isValid? "valid" : "invalid") + " action-exp";
                    if(action.isValid) {
                        actionDecor.attr = {"counter": foundActionCounter++};
                    }
                }
            }
        }
        return decorators;
    }

    createLineDecorator() {
        let func = this.createInlineSyntaxDecorator;
        return {
            inlines: [],
            createInlineDecorator: function(clip) {
                let inline = func(clip);
                this.inlines.push(inline);
                return inline;
            }
        }
    }

    createInlineSyntaxDecorator(clip) {
        return  {
            clip,
            get pos() { return clip.pos },
            get length() { return clip.raw.length},
            get end() { return clip.pos + this.length },
        };
    }

    applyLineDecorator(rawLine, decorator) {
        let div = $("<div></div>");

        if(decorator.className) {
            div.addClass(decorator.className);
        }

        if(decorator.attr) {
            div.attr(decorator.attr);
        }

        this.applyInlineDecorators(div, rawLine, decorator.inlines);
        return div;
    }

    applyInlineDecorators(parent, rawLine, decorators) {
        if(!decorators || decorators.length == 0) {
            parent.html(rawLine);
            return;
        }

        decorators.sort((a, b) => a.pos - b.pos);

        let lastEnd = 0;
        for(let i = 0; i < decorators.length; i++) {
            let dec = decorators[i];
            if(lastEnd > dec.pos) {
                console.log(`skipping decorator ${dec} due to overlapping positions`);
                continue;
            }
            parent.append(document.createTextNode(rawLine.slice(lastEnd, dec.pos)));
            let span  = $(`<span>${rawLine.slice(dec.pos, dec.end)}</span>`);

            if(dec.className) {
                span.addClass(dec.className);
            }

            if(dec.attr) {
                span.attr(dec.attr);
            }

            parent.append(span);
            lastEnd = dec.end;
        }
        parent.append(document.createTextNode(rawLine.slice(lastEnd, rawLine.length)));

    }
}