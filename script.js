// Allow specifying a tree name in the URL (http://foo/?tree=Firefox3.0)
var treeName = "Firefox";
var match = /[?&]tree=([^&]+)/.exec(document.location.search);
if (match)
    treeName = match[1];

var repoNames = {
    "Firefox": "mozilla-central",
    "Firefox3.1": "releases/mozilla-1.9.1",
    "TraceMonkey": "tracemonkey",
    "Thunderbird": "comm-central",
    "Thunderbird3.0": "comm-central",
    "SeaMonkey": "comm-central",
    "Sunbird": "comm-central",
}

var pushlogURL = "http://hg.mozilla.org/" + repoNames[treeName] + "/";
var timezone = "-0800";
var pickupDelay = 0; // number of ms until machine starts building a push

var oss = ["linux", "osx", "windows"];
var machineTypes = ["Build", "Leak Test", "Unit Test", "Talos", "Nightly", "Static Analysis"];
var loadStatus = { pushlog: "loading", tinderbox: "loading" };
var activeResult = "";
var boxMatrix;
var abortOutstandingSummaryLoadings = function() {};

startStatusRequest();
setInterval(startStatusRequest, 120 * 1000);
buildFooter();

function startStatusRequest() {
    loadStatus = { pushlog: "loading", tinderbox: "loading" };
    updateStatus();

    // Load tinderbox and pushlog
    document.getElementById("tinderboxiframe").contentWindow.location.href = "fetchraw.php?site=tinderbox&url=" + treeName + "/";
    document.getElementById("pushlogiframe").contentWindow.location.href = "fetchraw.php?site=pushlog&url=" + repoNames[treeName] + "/pushloghtml?startdate=14+hours+ago&enddate=now";
    
    document.getElementById("tinderboxiframe").onload = tinderboxLoaded;
    document.getElementById("pushlogiframe").onload = pushlogLoaded;
    document.getElementById("pushes").onmousedown = clickNowhere;
}


function buildFooter() {
    var innerHTML = "";
    if (treeName == "Firefox3.1")
        innerHTML += "FF3.1 | ";
    else
        innerHTML += "<a href='?tree=Firefox3.1'>FF3.1<" + "/a> | ";

    if (treeName == "Firefox")
        innerHTML += "FF3.2";
    else
        innerHTML += "<a href='./'>FF3.2<" + "/a>";

    var chooser = document.getElementById("treechooser");
    chooser.innerHTML = innerHTML;
}


function updateStatus() {
    var loading = [];
    for (i in loadStatus) {
        if (loadStatus[i] == "loading")
            loading.push({ tinderbox: "Tinderbox", pushlog: "pushlog" }[i]);
    }
    var text = loading.join(" and ");
    var statusSpan = document.getElementById("loading");
    statusSpan.className = "";
    if (loading.length) {
        text = "Loading " + text + "...";
        statusSpan.className = "loading";
    }
    if (loadStatus.tinderbox == "fail") {
        text += " Parsing Tinderbox failed. :-(";
        statusSpan.className = "fail";
    }
    statusSpan.style.visibility = text ? "visible" : "hidden";
    statusSpan.innerHTML = text;
}

function getMachineType(name) {
    return {
        os:
        /Linux/.test(name) ? "linux" :
        /OS\s?X/.test(name) ? "osx" :
        /^WIN/i.test(name) ? "windows" :
        /static-analysis/.test(name) ? "linux" : "",

        type:
        /talos/i.test(name) ? "Talos" :
        /nightly/i.test(name) ? "Nightly" :
        /unit test/i.test(name) ? "Unit Test" :
        /depend/i.test(name) ? "Build" :
        /(leak|bloat)/i.test(name) ? "Leak Test" :
        /build/i.test(name) ? "Build" :
        /bsmedberg/.test(name) ? "Static Analysis" :
        /(check|test)/.test(name) ? "Unit Test" : ""
    };
}

var machines = [];
var machineResults = {};

function nodeIsBR(e) {
    return e && (e.nodeType == Node.ELEMENT_NODE) && e.tagName.toLowerCase() == "br";
}
function getLogURL(id, full, note) {
    return "http://tinderbox.mozilla.org/" + (note ? "addnote" : "showlog") + ".cgi?log=" + treeName + "/" + id + (full ? "&fulltext=1" : "");
}
function getTextWithMarker(e) {
    if (e.nodeType == Node.TEXT_NODE)
        return e.data;
    return '<em class="testfail">' + e.textContent + '</em>';
}
function stripTags(text) {
    var div = document.createElement("div");
    div.innerHTML = text;
    return div.textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function saneLineBreakNote(note) {
    // There are too many line breaks in notes; only use those that make sense.
    return note.replace(/\\n/g, "\n")
               .replace(/\\("|'|\\)/g, "$1")
               .replace(/<\/?pre>/g, "")
               .replace(/\n\n/g, "<br>")
               .replace(/\]\n/g, "]<br>")
               .replace(/\n\*\*\*/g, "<br>***")
               .replace(/\n\+\+/g, "<br>++")
               .replace(/\nWARNING/g, "<br>WARNING")
               .replace(/\n(REF)?TEST/g, "<br>$1TEST");
}
function linkBugs(text) {
    return text.replace(/(bug\s*|b=)([1-9][0-9]*)\b/ig, '<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=$2">$1$2</a>')
               .replace(/(changeset\s*)?([0-9a-f]{12})\b/ig, '<a href="'+revURL('')+'$2">$1$2</a>');
}

function tinderboxLoaded() {
    try {
        parseTinderbox(this.contentDocument);
        loadStatus.tinderbox = "complete";
        updateBoxMatrix();
        maybeCombineResults();
    } catch (e) {
        loadStatus.tinderbox = "fail";
    }
    updateStatus();
}

function getUnitTestResults(reva) {
    var e = reva.nextSibling;
    if (e) e = e.nextSibling;
    while (e && e.nodeType != Node.TEXT_NODE)
        e = e.nextSibling;

    if (!e || e.data != " TUnit")
        return [];

    var testResults = [];
    while (e) { 
        var testname = e.textContent.trim(), testresult = "";
        e = e.nextSibling;
        while (e && nodeIsBR(e)) {
            e = e.nextSibling;
        }
        while (e && !nodeIsBR(e)) {
            testresult += " " + getTextWithMarker(e).trim();
            e = e.nextSibling;
        }
        while (e && nodeIsBR(e)) {
            e = e.nextSibling;
        }
        testResults.push({
            name: testname.trim(),
            result: testresult.trim()
        });
    }
    return testResults;
}

function getTalosResults(tt) {
    var seriesURLs = {};
    $("p a", tt.parentNode).each(function() {
        seriesURLs[this.textContent] = this.getAttribute("href");
    });
    return $('a[href^="http://graphs"]', tt.parentNode).get().map(function(ra) {
        var resultURL = ra.getAttribute("href");
        var match = ra.textContent.match(/(.*)\:(.*)/);
        if (!match)
            return null;
        var testname = match[1].trim();
        return {
            name: testname,
            result: match[2].trim(),
            seriesURL: seriesURLs[testname],
            "resultURL": resultURL
        };
    }).filter(function(a) { return a; });
}

function parseTinderbox(doc) {
    if (!$("#build_waterfall tr > td:first-child > a", doc).length)
        throw "I can't parse that";

    machines = [];
    boxMatrix = {};
    $("#build_waterfall th ~ td > font", doc).get().forEach(function(cell) {
        var name = cell.textContent.replace(/%/, "").trim();
        var machinetype = getMachineType(name);
        if (!machinetype.os || !machinetype.type) {
            return;
        }
        machines.push({ "name": name, "os": machinetype.os, "type": machinetype.type, latestFinishedRun: { id: "", startTime: -1 } });
    });
    
    var todayDate = $("#build_waterfall tr > td:first-child > a", doc).get(0).childNodes[1].data.match(/[0-9\/]+/)[0];
    function parseTime(str) {
        if (str.indexOf("/") < 0)
            str = todayDate + " " + str;
        return new Date(str + " " + timezone);
    }
    
    var notes = [];
    var script = $(".script", doc).get(0).textContent;
    var match = script.match(/notes\[([0-9]+)\] = "(.*)";/g);
    if (match) {
        match.forEach(function(m) {
            var match = m.match(/notes\[([0-9]+)\] = "(.*)";/);
            notes[match[1]*1] = linkBugs(saneLineBreakNote(match[2]));
        });
    }
    
    machineResults = {};
    var seenMachines = [];
    $("#build_waterfall td > tt", doc).get().forEach(function(tt) {
        var td = tt.parentNode;
        var a = $('a[title]', td).get(0); // should be 'a[onclick^="return log"]', but jQuery doesn't like that
        if (!a) {
            console.log(td);
        }
        var state = a.title; /* building, success, testfailed, busted */
        var machineIndex = 0, startTime = 0, endTime = 0, rev = "", machineRunID = "", testResults = [];
        if (state == "building") {
            var match = a.getAttribute("onclick").match(/log\(event,([0-9]+),.*,'(.*)','Started ([^,]*),/);
            machineRunID = match[2];
            machineIndex = match[1] * 1;
            if (!machines[machineIndex])
                return;
            startTime = parseTime(match[3]);
        } else {
            var match = a.getAttribute("onclick").match(/log\(event,([0-9]+),.*,'(.*)','Started ([^,]*), finished ([^']*)'/);
            machineRunID = match[2];
            machineIndex = match[1] * 1;
            if (!machines[machineIndex])
                return;
            startTime = parseTime(match[3]);
            endTime = parseTime(match[4]);
            var reva = $('a[href^="http://hg.mozilla.org"]', td).get(0);
            if (reva) {
                rev = reva.textContent.substr(4, 12);

                // Get individual test results or Talos times.
                if (machines[machineIndex].type == "Unit Test") {
                    testResults = getUnitTestResults(reva);
                } else if (machines[machineIndex].type == "Talos") {
                    testResults = getTalosResults(tt);
                }
            }
        }

        if (machineResults[machineRunID])
            return;

        var stars = [];
        $('a', td).get().forEach(function(s) {
            var onclick = s.getAttribute("onclick");
            if (!onclick)
                return;
            var match = onclick.match(/note\(event,([0-9]+),/);
            if (!match)
                return;
            stars.push(notes[match[1]*1]);
        });

        machineResults[machineRunID] = {
            "machine": machines[machineIndex],
            "runID": machineRunID,
            "fullLogURL": getLogURL(machineRunID, true, false),
            "briefLogURL": getLogURL(machineRunID, false, false),
            "addNoteURL": getLogURL(machineRunID, false, true),
            "state": state,
            "startTime": startTime,
            "endTime": endTime,
            "rev": rev,
            "guessedRev": rev,
            "testResults": testResults,
            "stars": stars
        };
        if (state != "building") {
            if (startTime.getTime() > machines[machineIndex].latestFinishedRun.startTime) {
                machines[machineIndex].latestFinishedRun = {
                    id: machineRunID,
                    "startTime": startTime.getTime()
                };
            }
        }
    });
    buildBoxMatrix();
}

function buildBoxMatrix() {
    machines.forEach(function(machine) {
        if (!machine.latestFinishedRun.id) {
            // Ignore machines without run information.
            return;
        }
        if (!boxMatrix[machine.type])
            boxMatrix[machine.type] = {};
        if (!boxMatrix[machine.type][machine.os])
            boxMatrix[machine.type][machine.os] = [];
        boxMatrix[machine.type][machine.os].push(machineResults[machine.latestFinishedRun.id]);
    });
}

function updateBoxMatrix() {
    var colspans = { "linux": 1, "osx": 1, "windows": 1 };
    for (mt in boxMatrix) {
        for (os in colspans) {
            colspans[os] *= boxMatrix[mt][os] ? boxMatrix[mt][os].length : 1;
        }
    }
    oss.forEach(function(os) {
        document.getElementById(os + "th").setAttribute("colspan", colspans[os]);
    });

    var table = document.getElementsByTagName("table")[0];
    table.removeChild(document.getElementsByTagName("tbody")[0]);
    var tbody = document.createElement("tbody");
    table.appendChild(tbody);
    ["Build", "Leak Test", "Unit Test", "Talos", "Nightly"].forEach(function(t) {
        if (!boxMatrix[t])
            return;
        var row = document.createElement("tr");
        tbody.appendChild(row);
        row.innerHTML = '<th>' + t + '</th>';
        oss.forEach(function(os) {
            if (!boxMatrix[t][os]) {
                row.innerHTML += '<td class="empty" colspan=' + colspans[os] + '></td>';
                return;
            }
            var boxColspan = colspans[os] / boxMatrix[t][os].length;
            boxMatrix[t][os].forEach(function(machineResult) {
                var status = machineResult.state;
                row.innerHTML += '<td colspan="' + boxColspan + '"><a href="' +
                                 machineResult.briefLogURL + '" class="' + status +
                                 '" resultID="' + machineResult.runID + '">' +
                                 resultTitle(t, status) + '</a></td>';
            });
        });
    });
    table.style.visibility = "visible";
    $("a", table).get().forEach(function(cell) {
        cell.addEventListener("click", resultLinkClick, false);
    });
}

var pushes = [];

function pushlogLoaded() {
    var doc = this.contentDocument;
    if (!doc.getElementsByTagName("table").length)
        return;

    pushes = [];
    var table = doc.getElementsByTagName("table")[0];
    $("td[rowspan]:first-child", table).each(function() {
        var numPatches = this.getAttribute("rowspan") * 1;
        var patches = [];
        for (var i = 0, row = this.parentNode; i < numPatches && row; i++, row = row.nextSibling) {
            var rev = $("td.age", row).get(0).firstChild.firstChild.data;
            var strong = row.lastChild.firstChild.innerHTML;
            var dashpos = strong.indexOf(String.fromCharCode(8212));
            var author = strong.substring(0, dashpos - 1);
            var desc = strong.substring(dashpos + 2);
            patches.push({
               "rev": rev,
               "author": author,
               "desc": linkBugs(stripTags(desc))
            });
        }
        var pusher = this.firstChild.firstChild.data;
        var date = new Date($(".date", this).get(0).innerHTML);
        pushes.push({
            "pusher": pusher,
            "date": date,
            "toprev": patches[0].rev,
            "patches": patches
        });
    });
    loadStatus.pushlog = "complete";
    updateStatus();
    maybeCombineResults();
}

function maybeCombineResults() {
    if (loadStatus.pushlog == "complete" && loadStatus.tinderbox == "complete")
        combineResults();
}

function getPushIndexForRev(rev) {
    for (var k = 0; k < pushes.length; k++) {
        if (rev == pushes[k].toprev)
            return k;
    }
    return -1;
}

function getRevForResult(machineResult) {
    if (machineResult.rev)
        return machineResult.rev;

    var machineType = machineResult.machine.type;

    if (machineType == "Talos" || machineType == "Unit Test") {
        // Talos and Unit Test boxes use the builds provided
        // by build boxes and sync their start time with them.
        // If there's a build machine with the same start time,
        // use the same revision.
        for (var j in machineResults) {
            var bMachine = machineResults[j].machine;
            if ((bMachine.type == "Build" || bMachine.type == "Leak Test") &&
                machineResults[j].startTime.getTime() == machineResult.startTime.getTime()) {
                return machineResults[j].guessedRev;
            }
        }
    }

    // Try to find out the rev by comparing times.
    var latestPushRev = "", latestPushTime = -1;
    var machineTime = machineResult.startTime.getTime();
    pushes.forEach(function(push) {
        var pushTime = push.date.getTime();
        if (pushTime + pickupDelay < machineTime) {
            if (latestPushTime < pushTime) {
                latestPushRev = push.toprev;
                latestPushTime = pushTime;
            }
        }
    });
    return latestPushRev;
}

function combineResults() {
    machineTypes.forEach(function(machineType) {
        for (var i in machineResults) {
            var machineResult = machineResults[i];
            if (machineResult.machine.type != machineType)
                continue;

            machineResult.guessedRev = getRevForResult(machineResult);
            var pushIndex = getPushIndexForRev(machineResult.guessedRev);
            if (pushIndex < 0) {
                // This test run started before any of the pushes in the pushlog.
                // Ignore.
                continue;
            }
            if (!pushes[pushIndex].results)
                pushes[pushIndex].results = {};
            if (!pushes[pushIndex].results[machineResult.machine.os])
                pushes[pushIndex].results[machineResult.machine.os] = {};
            if (!pushes[pushIndex].results[machineResult.machine.os][machineResult.machine.type])
                pushes[pushIndex].results[machineResult.machine.os][machineResult.machine.type] = [];
            pushes[pushIndex].results[machineResult.machine.os][machineResult.machine.type].push(machineResult);
            pushes[pushIndex].results[machineResult.machine.os][machineResult.machine.type].sort(function(a, b) {
                var aTime = a.startTime.getTime(), bTime = b.startTime.getTime();
                return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
            });
        }
    });

    buildPushesList();
}

function getPSTDate(date) {
    var d = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + timezone/100 * 60 * 60 * 1000);
    return d.toLocaleString() + ' ' + timezone;
}

function revURL(rev) {
    return pushlogURL + "rev/" + rev;
}

function resultTitle(type, status) {
    return {
        "building": type + ' is still running',
        "success": type + ' was successful',
        "testfailed": 'Tests failed on ' + type,
        "busted": type + ' is burning'
    }[status];
}

function buildPushesList() {
    var ul = document.getElementById("pushes");
    ul.innerHTML = pushes.map(function(push, pushIndex) {
        return '<li>\n'
        + '<h2><span class="pusher">' + push.pusher + '</span> &ndash; '
        + '<span class="date">' + getPSTDate(push.date) + '</span></h2>\n'
        + '<ul class="results">\n'
        + oss.map(function(os) {
            if (!push.results || !push.results[os])
                return '';
            var results = push.results[os];
            return '<li><span class="os ' + os + '">'
            + { "linux": "Linux", "osx": "Mac OS X", "windows": "Windows" }[os]
            + '</span><span class="osresults">'
            + machineTypes.map(function(machineType) {
                if (!results[machineType])
                    return '';
                return results[machineType].map(function(machineResult) {
                    return '<a href="' + machineResult.briefLogURL
                    + '" resultID="' + machineResult.runID
                    + '" class="machineResult ' + machineResult.state
                    + '" title="' + resultTitle(machineType, machineResult.state)
                    + '">' + machineType.charAt(0)
                    + (machineResult.stars.length ? '*' : '')
                    + '</a>';
                }).join(" ");
            }).join("\n")
            + '</span></li>';
        }).join("\n")
        + '</ul>'
        + '<ul class="patches">\n'
        + push.patches.map(function(patch, patchIndex) {
            return '<li>\n'
            + '<a class="revlink" href="' + revURL(patch.rev) + '">' + patch.rev
            + '</a>\n<span class="author">' + patch.author + '</span> &ndash; '
            + '<span class="desc">' + patch.desc.split("\n")[0] + '</span>\n'
            + '</li>';
        }).join("\n")
        + '</ul>\n'
        + '</li>';
    }).join("\n");
    $("a.machineResult").each(function() {
        this.addEventListener("click", resultLinkClick, false);
    });
    setActiveResult(activeResult, false);
}

function clickNowhere(e) {
    if (e.originalTarget.tagName.toLowerCase() != "a")
        setActiveResult("");
}

function resultLinkClick(e) {
    var resultID = this.getAttribute("resultID");
    setActiveResult(resultID, true);
    e.preventDefault();
}

function setActiveResult(resultID, scroll) {
    abortOutstandingSummaryLoadings();
    abortOutstandingSummaryLoadings = function() {};
    if (activeResult) {
        var activeA = $('.results a[resultID="' + activeResult + '"]').get(0);
        if (activeA)
            activeA.removeAttribute("active");
    }
    activeResult = resultID;
    if (activeResult) {
        var activeA = $('.results a[resultID="' + activeResult + '"]').get(0);
        if (activeA) {
            activeA.setAttribute("active", "true");
            if (scroll)
                scrollElemIntoView(activeA, document.getElementById("pushes"), 20);
        }
    }
    displayResult();
}

function scrollElemIntoView(elem, box, margin) {
    var boxBox = box.getBoundingClientRect();
    var elemBox = elem.getBoundingClientRect();
    if (elemBox.top < boxBox.top) {
        // over the scrollport
        animateScroll(box, box.scrollTop - (boxBox.top - elemBox.top) - margin, 150);
    } else if (elemBox.bottom > boxBox.bottom) {
        // under the scrollport
        animateScroll(box, box.scrollTop + (elemBox.bottom - boxBox.bottom) + margin, 150);
    }
}
function animateScroll(scrollBox, end, duration) {
    var startTime = Date.now();
    var start = scrollBox.scrollTop;
    var timer = setInterval(function() {
        var now = Date.now();
        var newpos = 0;
        if (now >= startTime + duration) {
            clearInterval(timer);
            newpos = end;
        } else {
            var t = (now - startTime) / duration;
            t = (1 - Math.cos(t * Math.PI)) / 2; // smooth
            newpos = (1 - t) * start + t * end;
        }
        scrollBox.scrollTop = newpos;
    }, 16);
}

function getPSTTime(date) {
    if (!date.getTime)
        return '';
    var d = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + timezone/100 * 60 * 60 * 1000);
    return d.toLocaleFormat('%H:%M');
}

function displayResult() {
    var result = machineResults[activeResult];
    var box = document.getElementById("results");
    if (!box)
        return;
    if (!result) {
        box.removeAttribute("state");
        box.className = "";
        box.innerHTML = "";
        return;
    }
    box.setAttribute("state", result.state);
    box.className = result.stars.length ? "hasStar" : "";
    box.innerHTML = (function() {
        return '<h3><span class="machineName">' + result.machine.name
        + '</span> [<span class="state">' + result.state + '</span>] '
        + '<span class="duration">Started ' + getPSTTime(result.startTime)
        + ', ' + (result.state == "building" ? 'still running...' :
        'finished ') + getPSTTime(result.endTime) + '</span></h3>\n'
        + '<a class="briefLog" href="' + result.briefLogURL
        + '">View Brief Log</a> <a class="fullLog" href="'
        + result.fullLogURL + '">View Full Log</a> <a class="addNote" href="'
        + result.addNoteURL + '">Add a Comment</a> <span id="summaryLoader"></span>'
        + (function() {
            if (!result.testResults.length)
                return '';
            if (result.machine.type == "Unit Test") {
                return '<ul class="unitTestResults">\n'
                + result.testResults.map(function(r) {
                    return '<li>' + r.name + ': ' + r.result + '</li>';
                }).join("")
                + '</ul>';
            }
            if (result.machine.type == "Talos") {
                return '<ul class="talosResults">\n'
                + result.testResults.map(function(r) {
                    return '<li>' + r.name + ': <a href="' + r.resultURL.replace(/"/g, "&quot;")
                    + '">' + r.result + '</a>'
                    + (r.seriesURL ? ' (<a href="' + r.seriesURL.replace(/"/g, "&quot;")
                    + '">details</a>)' : '') + '</li>';
                }).join("")
                + '</ul>';
            }
        })()
        + (function() {
            return '<div class="stars">'
            + result.stars.map(function (s) { return '<div class="note">'+s+'</div>'; }).join("") + '<div class="summary"></div></div>';
        })();
    })();
    var addNoteLink = $("a.addNote").get(0);
    addNoteLink.addEventListener("click", logLinkClick, false);
    setupSummaryLoader(result, box);

function setupSummaryLoader(result, box) {
    if (result.state == "building" || result.state == "success")
        return;

    var summaryLoader = $("#summaryLoader").get(0);
    summaryLoader.innerHTML = "Retrieving summary..."
    summaryLoader.className = "loading";
    fetchSummary(activeResult, function(summary) {
        summaryLoader.innerHTML = summary ? "" : "Summary is empty.";
        summaryLoader.className = "";
        if (summary)
            box.className += " hasSummary"
        $(".stars .summary").get(0).innerHTML = summary.replace(/ALSA.*device\n/g, "").replace(/\n/g, "<br>\n");
    }, function(errorCause) {
        summaryLoader.innerHTML = { "onerror": "Fetching summary failed.", "exception": "Fetching summary failed.", "timeout": "Fetching summary timed out."}[errorCause];
        summaryLoader.className = "";
    });
}
}

function logLinkClick(e) {
    var div = document.getElementById("addNotePopup");

    // Recreate iframe to keep it transparent while loading.
    var iframe = div.getElementsByTagName("iframe")[0];
    if (iframe)
        div.removeChild(iframe);
    var iframe = document.createElement("iframe");
    iframe.setAttribute("src", this.getAttribute("href"));
    div.appendChild(iframe);

    div.getElementsByTagName("a")[0].onclick = function(e2) {
        div.className = '';
        e2.preventDefault();
    };
    div.className = "open";
    e.preventDefault();
}

String.prototype.trim = function() {
  var x=this;
  x=x.replace(/^\s*(.*?)/, "$1");
  x=x.replace(/(.*?)\s*$/, "$1");
  return x;
}

/* f gets called with the result, e on error */
function fetchSummary(runID, f, e) {
    var url = "summaries/get.php?tree=" + treeName + "&id=" + runID;
    var errorTimer;
    var req = new XMLHttpRequest();
    req.onerror = function() { e("onerror"); };
    req.onload = function() { clearInterval(errorTimer); f(req.responseText); };
    try {
        req.open("GET", url, true); 
        req.send();
    } catch (e) {
        e("exception");
        return;
    }
    // If we don't get a response in 30 seconds, give up.
    errorTimer = setTimeout(function() {
        req.abort();
        e("timeout");
    }, 30 * 1000);
    var oldAbort = abortOutstandingSummaryLoadings;
    abortOutstandingSummaryLoadings = function() {
        req.abort();
        oldAbort();
    }
}
