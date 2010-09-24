/* -*- Mode: JS; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=2 et tw=80 : */

function Data(treeName, noIgnore, config, pusher, rev) {
  this._treeName = treeName;
  this._noIgnore = noIgnore;
  this._config = config;
  this._pusher = pusher;
  this._rev = rev;
  this._pushes = {};
  this._machines = {};
  this._finishedResults = {};
  this._runningAndPendingResults = {};
  // These results could not be associated to any push yet. Keep track of them
  // and try again on the next refresh, the corresponding push may be there by
  // then.
  this._orphanResults = {};
};

Data.prototype = {
  load: function Data_load(timeOffset, statusCallback, successCallback) {
    var self = this;
    // we can provide progress info, once we load more sources
    var loadTotal = 2;
    var loaded = -1;
    var failed = [];
    var loadedData = {};
    var checkLoaded = function() {
      if (failed.length)
        return;
      else if (++loaded < loadTotal)
        statusCallback({loadpercent: loaded/loadTotal});
      else {
        var updatedPushes = self._combineResults(loadedData, timeOffset);
        statusCallback({loadpercent: 1});
        successCallback(Controller.valuesFromObject(self._machines),
          Controller.valuesFromObject(updatedPushes));
      }
    };
    checkLoaded();
    var failCallback = function(what) {
      failed.push(what);
      statusCallback({failed: failed});
    };
    Config.pushlogDataLoader.load(
      Config.repoNames[this._treeName],
      timeOffset,
      function hgDataLoadCallback(data) {
        loadedData.pushes = data;
        checkLoaded();
      },
      this._pusher,
      this._rev
    );
    Config.tinderboxDataLoader.load(
      this._treeName,
      timeOffset,
      this._noIgnore,
      function tinderboxDataLoadCallback(data) {
        loadedData.machineResults = data;
        checkLoaded();
      },
      failCallback
    );
  },

  machineGroup: function Data_machineGroup(machineType) {
    if (this._config.treesWithGroups.indexOf(this._treeName) == -1)
      return machineType;
    for (var groupname in this._config.groupedMachineTypes) {
      if (this._config.groupedMachineTypes[groupname].indexOf(machineType) != -1)
        return groupname;
    }
    return machineType;
  },

  getMachineResult: function Data_getMachineResult(id) {
    return this._finishedResults[id];
  },

  _getRevForResult: function Data__getRevForResult(machineResult) {
    if (machineResult.rev)
      return machineResult.rev;
  
    var machineType = machineResult.machine.type;
  
    if (machineType != "Build" && machineType != "Nightly") {
      // Talos and Unit Test boxes use the builds provided
      // by build boxes and sync their start time with them.
      // If there's a build machine with the same start time,
      // use the same revision.
      for (var j in this._finishedResults) {
        var bMachine = this._finishedResults[j].machine;
        if ((bMachine.type == "Build") &&
          this._finishedResults[j].startTime.getTime() == machineResult.startTime.getTime()) {
          return this._finishedResults[j].guessedRev;
        }
      }
    }
  
    // Try to find out the rev by comparing times.
    // this breaks when going back in time. Just return nothing when doing so.
    // XXX fix this
    //if (timeOffset)
    // return '';

    var latestPushRev = "", latestPushTime = -1;
    var machineTime = machineResult.startTime.getTime();
    for (var toprev in this._pushes) {
      var push = this._pushes[toprev];
      var pushTime = push.date.getTime();
      if (pushTime < machineTime) {
        if (latestPushTime < pushTime) {
          latestPushRev = push.toprev;
          latestPushTime = pushTime;
        }
      }
    }
    return latestPushRev;
  },
  
  _combineResults: function Data__combineResults(data, goingIntoPast) {
    var self = this;
    var currentlyRunning = {};
    var updatedPushes = {};
    for (var toprev in data.pushes) {
      if (!(data.pushes[toprev].toprev in this._pushes)) {
        this._pushes[toprev] = data.pushes[toprev];
        updatedPushes[toprev] = data.pushes[toprev];
      }
    }

    // Adds the result to either _orphanResults, currentlyRunning or
    // _finishedResults. Also takes care of keeping track of the machine and
    // makes sure new notes are correctly forwarded to already linked jobs.
    function categorizeResult(result) {
      if (!(result.machine.name in self._machines))
        self._machines[result.machine.name] = {name: result.machine.name,
          os: result.machine.os, type: result.machine.type,
          debug: result.machine.debug, latestFinishedRun: null, runs: 0,
          runtime: 0, averageCycleTime: 0};
      var machine = self._machines[result.machine.name];
      result.machine = machine;

      result.guessedRev = self._getRevForResult(result);
      if (!(result.push = self._pushes[result.guessedRev])) {
        self._orphanResults[result.runID] = result;
        return;
      }
      if (["building", "pending"].indexOf(result.state) != -1)
        currentlyRunning[result.runID] = result;
      else {
        if (result.runID in self._finishedResults) {
          var existing = self._finishedResults[result.runID];
          if (result.note != existing.note) {
            existing.note = result.note;
            updatedPushes[existing.push.toprev] = existing.push;
          }
          return;
        }
        linkPush(result);
        self._finishedResults[result.runID] = result;
        if (!machine.latestFinishedRun || result.startTime > machine.latestFinishedRun.startTime) {
          machine.latestFinishedRun = result;
        }
        if (result.state != "success")
          return;
        machine.runs++;
        machine.runtime+= (result.endTime.getTime() - result.startTime.getTime())/1000;
        machine.averageCycleTime = Math.ceil(machine.runtime/machine.runs);
      }
    }

    // Removes a run from a push. This is needed for running jobs that are
    // removed in favor of the finished counterpart. For now, the same job
    // has different runIDs depending on the status.
    function unlinkPush(result) {
      var push = result.push;
      var machine = result.machine;
      var debug = machine.debug ? "debug" : "opt";
      var group = self.machineGroup(machine.type);
      var grouparr = push.results[machine.os][debug][group]
      for (var i in grouparr) {
        if (grouparr[i].runID == result.runID) {
          grouparr.splice(i, 1);
          break;
        }
      }
      updatedPushes[push.toprev] = push;
      result.push = null;
    }

    // Add a run to the corresponding push so it is displayed in the ui.
    function linkPush(result) {
      var push = result.push;
      var machine = result.machine;
      var debug = machine.debug ? "debug" : "opt";
      var group = self.machineGroup(machine.type);
      if (!push.results)
        push.results = {};
      if (!push.results[machine.os])
        push.results[machine.os] = {};
      if (!push.results[machine.os][debug])
        push.results[machine.os][debug] = {};
      if (!push.results[machine.os][debug][group])
        push.results[machine.os][debug][group] = [];
      push.results[machine.os][debug][group].push(result);
      updatedPushes[push.toprev] = push;
    }

    if (goingIntoPast) {
      var oldorphans = this._orphanResults;
      this._orphanResults = {};
      for (var i in oldorphans) {
        categorizeResult(oldorphans[i]);
      }
    }

    for (var i in data.machineResults)
      categorizeResult(data.machineResults[i]);

    // returns elements in a that are not in b
    function objdiff(a, b) {
      var c = {};
      for (var k in a)
        if (!(k in b))
          c[k] = a[k];
      return c;
    }

    if (!goingIntoPast) {
      var notRunningAnyMore = objdiff(this._runningAndPendingResults, currentlyRunning);
      for (var i in notRunningAnyMore)
        unlinkPush(notRunningAnyMore[i]);
      var newRunning = objdiff(currentlyRunning, this._runningAndPendingResults);
      for (var i in newRunning)
        linkPush(newRunning[i]);
      this._runningAndPendingResults = currentlyRunning;
    }

    return updatedPushes;
  }
}
