/* -*- Mode: JS; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=2 et tw=80 : */

"use strict";

var SummaryLoader = {

  _abortOutstandingSummaryLoadings: function empty() {},
  _cachedSummaries: {},

  init: function SummaryLoader_init() {
    $(".stars .starSuggestion").live("click", function() {
      var bugid = $(this).parent().attr("data-bugid");
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
        AddCommentUI.removeFromBug(bugid);
      } else {
        $(this).addClass("active");
        AddCommentUI.addToBug(bugid);
      }
      AddCommentUI.updateAutoStarState();
    });
  },

  setupSummaryLoader: function SummaryLoader_setupSummaryLoader(result, box) {
    if (["building", "success", "pending", "running"].indexOf(result.state) != -1)
      return;
  
    var summaryLoader = $("#summaryLoader").get(0);
    summaryLoader.innerHTML = "Retrieving summary..."
    summaryLoader.className = "loading";
    var url = (result.notes && result.notes.length) ? result.summaryURL : result.annotatedSummaryURL;
    this._fetchSummary(result.runID, url, function fetchSummaryLoadCallback(summary) {
      function inTag(str, index, start, end) {
        var prePart = str.substr(0, index);
        return prePart.split(start).length > prePart.split(end).length;
      }

      var summaryPlaceholder = $(".stars .summary").get(0);
      summaryPlaceholder.innerHTML = summary ? summary.replace(/\n/g, "<br>\n") : "Summary is empty.";
      result.suggestions = [];
      var log = $(summaryPlaceholder)
                .contents().filter(function () { return this.nodeType == this.TEXT_NODE; })
                .map(function() { return this.textContent.trim() || null; })
                .get().join("\n");
      var suggestions = $(".stars .summary [data-bugid]");
      for (var i = 0; i < suggestions.length; ++i) {
        var item = $(suggestions[i]);
        var suggestion = {
          id: item.attr("data-bugid"),
          summary: item.attr("data-summary"),
          log: log,
          signature: item.attr("data-signature"),
          status: item.attr("data-status")
        };
        result.suggestions.push(suggestion);
        var highlightTokens = item.attr("data-logline").split(/[^a-zA-Z0-9_-]+/);
        highlightTokens.sort(function(a, b) {
          return b.length - a.length;
        });
        var bugSummaryHTML = item.attr("data-summary").escapeContent();
        highlightTokens.forEach(function(token) {
          if (token.length > 0)
            bugSummaryHTML = bugSummaryHTML.replace(new RegExp(token, "gi"), function (token, index, str) {
              if (inTag(str, index, "<", ">") ||
                  inTag(str, index, "&", ";")) // don't replace stuff in already injected tags or entities
                return token;
              else
                return "<span class=\"highlight\">" + token + "</span>";
            });
        });
        var className = '';
        if (AddCommentUI.shouldAutoStarBug(item.attr("data-bugid"))) {
          className = ' active';
          AddCommentUI.updateAutoStarState();
        }
        item.html('<div class="starSuggestion' + className + '"></div>' + 
          '<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=' +
          item.attr("data-bugid") + '" target="_blank">Bug ' +
          item.attr("data-bugid") + ' - ' + bugSummaryHTML + '</a>');
        item.attr("title", item.attr("data-status"));
      }
      AddCommentUI.updateUI();
    }, function fetchSummaryFailCallback() {
      summaryLoader.innerHTML = "Fetching summary failed.";
      summaryLoader.className = "";
    }, function fetchSummaryTimeoutCallback() {
      summaryLoader.innerHTML = "Fetching summary timed out.";
      summaryLoader.className = "";
    });
  },

  _fetchSummary: function SummaryLoader__fetchSummary(runID, summaryURL, loadCallback, failCallback, timeoutCallback) {
    var self = this;
    if (this._cachedSummaries[runID]) {
      loadCallback(this._cachedSummaries[runID]);
      return;
    }
    var onLoad = function onSummaryLoad(summary) {
      self._cachedSummaries[runID] = summary;
      loadCallback(summary);
    };
    var req = NetUtils.loadText(summaryURL, onLoad, failCallback, timeoutCallback);
    var oldAbort = this._abortOutstandingSummaryLoadings;
    this._abortOutstandingSummaryLoadings = function abortThisLoadWhenAborting() {
      if (req)
        req.abort();
      oldAbort();
    }
  },

}
