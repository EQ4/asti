'use strict';

var uuid = require('node-uuid');
var Q = require('q');

var Queue = function (amiConnection, config) {

    var CommandQueueStatus = function (ami) {
        var defer = Q.defer();
        
        setTimeout(function() {
            defer.reject(new Error('timeout for get queue status'))
        }, 3000);

        var events = {
            params: [],
            members: [],
            entries: []
        };

        var actionid = uuid.v4();

        var catcher = function (evt) {
            
            if (evt.actionid == actionid) {
                if (evt['event'] == 'QueueParams') events.params.push(evt);
                if (evt['event'] == 'QueueMember') events.members.push(evt);
                if (evt['event'] == 'QueueEntry') events.entries.push(evt);
                if (evt['event'] == 'QueueStatusComplete') { 
                    ami.removeListener('managerevent', catcher);                    
                    defer.resolve(events);
                }
            };
        };

        ami.on('managerevent', catcher);
        ami.action({
          'action': 'queuestatus',
          'actionid': actionid
        }, function (err, res) {
            if (err) defer.reject(err);
            //console.log('action', err, res);
        });
        return defer.promise;
    };

    var cacheData;
    var isCacheDataActual = false;
    var cacheTimeout = config.cacheTimeout || 3000;

    var CachedCommandQueueStatus = function () {

        if (isCacheDataActual) {
            console.log('get cached data')
            return Q.resolve(cacheData);
        } else {
            return CommandQueueStatus(amiConnection)
                .then(function (data) {
                    cacheData = data;
                    isCacheDataActual = true;
                    setTimeout(function () { 
                        isCacheDataActual = false; 
                    }, cacheTimeout);
                    return Q.resolve(data);
                });
        }
    };

    var queueMembers = function (object) {
        var memberEvents;
        return CachedCommandQueueStatus(amiConnection)
            .then(function (data) {
                console.log('object', object);

                if (object && object.queue) {
                    var queue = object.queue;
                    memberEvents = data.members.filter(function (item) {
                        return (item.queue == queue);
                    });
                } else {
                    memberEvents = data.members;
                }
                console.log('memberEvents', memberEvents);
                return Q.resolve(memberEvents);
            });
    };

    var queueList = function () {
        return CachedCommandQueueStatus(amiConnection)
            .then(function (data) {
                return Q.resolve(data.params);
            });
    };

    return {
        queueList: queueList,
        queueMembers: queueMembers
    };

};

module.exports = Queue;