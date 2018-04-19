/**
 * Copyright (c) 2018 Mathias Bojda https://github.com/MathiasBojda/
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const url = require("url");
const ntlm = require("./ntlmUtils");
const _ = require("underscore");
const nodeFetch = require("node-fetch");
const http = require("http");
const https = require("https");

const setupNtlm = function(_url, options) {
    if (!options.workstation) options.workstation = "";
    if (!options.domain) options.domain = "";

    // extract non-ntlm-options:
    var httpreqOptions = _.omit(options, "url", "username", "password", "workstation", "domain");

    // is https?
    var isHttps = false;
    var reqUrl = url.parse(_url);
    if (reqUrl.protocol == "https:") isHttps = true;

    const keepAliveAgent = isHttps ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });

    return {
        keepAliveAgent,
        httpreqOptions
    };
};

const sendType1Message = function(url, options, httpreqOptions, keepAliveAgent) {
    const type1msg = ntlm.createType1Message(options);

    var type1options = {
        headers: {
            Connection: "keep-alive",
            Authorization: type1msg
        },
        timeout: options.timeout || 0,
        agent: keepAliveAgent,
        allowRedirects: false // don't redirect in httpreq, because http could change to https which means we need to change the keepaliveAgent
    };

    // pass along other options:
    type1options = _.extend({}, _.omit(httpreqOptions, "headers", "body"), type1options);

    return nodeFetch(url, type1options);
};

const parseType1Message = function(res) {
    return new Promise(function(resolve, reject) {
        // catch redirect here:

        if (res.headers.get("location")) {
            reject("Redirecting...");
            return;
            options.url = res.headers.get("location");
            return exports[method](options, finalCallback);
        }

        if (!res.headers.get("www-authenticate")) {
            reject("www-authenticate not found on response of second request");
            return;
        }

        // parse type2 message from server:
        var type2msg = ntlm.parseType2Message(res.headers.get("www-authenticate")); //callback only happens on errors
        if (!type2msg) {
            reject("Server did not return a type 2 message");
            return;
        }

        resolve(type2msg);
    });
};

const sendType3Message = function(type2msg, url, options, req, httpreqOptions, keepAliveAgent) {
    // create type3 message:
    var type3msg = ntlm.createType3Message(type2msg, options);

    req = _.extend(req, {
        allowRedirects: false,
        agent: keepAliveAgent
    });

    req.headers = _.extend(req.headers, {
        Connection: "Close",
        Authorization: type3msg
    });

    // pass along other options:
    req.headers = _.extend(req.headers, httpreqOptions.headers);
    req = _.extend(req, _.omit(httpreqOptions, "headers"));

    return nodeFetch(url, req);
};

const fetch = function(url, opts) {
    if (!opts.headers.ntlm) {
        throw "Missing the ntlm options";
    }

    const ntlmOptions = Object.assign({}, opts.headers.ntlm);
    const _ntlm = setupNtlm(url, ntlmOptions);
    opts.headers = _.omit(opts.headers, "ntlm");

    return sendType1Message(url, ntlmOptions, _ntlm.httpreqOptions, _ntlm.keepAliveAgent)
        .then(res => {
            return parseType1Message(res);
        })
        .then(type2msg => {
            return sendType3Message(type2msg, url, ntlmOptions, opts, _ntlm.httpreqOptions, _ntlm.keepAliveAgent);
        })
        .catch(err => {
            console.log(err);
        });
};

module.exports = {
    fetch
};
