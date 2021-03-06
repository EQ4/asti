'use strict';

var EventEmitter = require('events').EventEmitter;
var uuid = require('node-uuid');

var Client = function (obj) {

    var socket = obj.socket;
    var urlFetcher = obj.urlFetcher;

    var identity = null;
    var sessionid = null;

    var emitter = new EventEmitter();
    var id = uuid.v4();

    var emitToSocket = function (evt, data) { 
        console.log('emitToSocket', evt, data);       
        socket.emit(evt, data);
        urlFetcher.send(evt, JSON.stringify({q: data, identity: identity}));
    };

    var onSocketEvent = function (evt, callback) {
        socket.on(evt, callback);
    };

    var on = function (evt, callback) {
        emitter.on(evt, callback);
    };

    var emit = function (evt, data) {
        emitter.emit(evt, data);
    };

    var getId = function () {
        return id;
    };

    var extendedActions = function () {
        socket.on('agent:subscribe', function (data) {
            emit('agent:subscribe', data);
        });

        socket.on('agent:unsubscribe', function (data) {
            emit('agent:unsubscribe', data);
        });

        socket.on('queue:list', function (data) {
            emit('queue:list', data);
        });

        socket.on('queue:members', function (data) {
            emit('queue:members', data);
        });

        socket.on('call', function (data) {
            emit('call', data);
        });
    };

    var init = function () {
        socket.on('identity', function (data) {
            identity = data.identity;
            sessionid = data.sessionid;
            extendedActions();
        });
    }();

    var getIdentity = function () {
        return identity;
    };

    return {
        getIdentity: getIdentity,
        emit: emit,
        on: on,
        getId: getId,
        emitToSocket: emitToSocket,
        onSocketEvent: onSocketEvent
    };
};

module.exports = Client;