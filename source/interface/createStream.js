var Stream = require("stream"),
    joinURL = require("url-join"),
    deepmerge = require("deepmerge");

var fetch = require("../request.js").fetch,
    responseHandlers = require("../response.js");

var PassThroughStream = Stream.PassThrough;

function createReadStream(filePath, options) {
    var outStream = new PassThroughStream();
    getFileStream(filePath, options)
        .then(function __handleStream(stream) {
            stream.pipe(outStream);
        })
        .catch(function __handleReadError(err) {
            outStream.emit("error", err);
        });
    return outStream;
}

function createWriteStream(filePath, options) {
    var writeStream = new PassThroughStream(),
        headers = deepmerge({}, options.headers);
    // if (typeof options.range === "object" && typeof options.range.start === "number") {
    //     var rangeHeader = "bytes=" + options.range.start + "-";
    //     if (typeof options.range.end === "number") {
    //         rangeHeader += options.range.end;
    //     }
    //     options.headers.Range = rangeHeader;
    // }
    if (options.overwrite === false) {
        headers["If-None-Match"] = "*";
    }
    var fetchURL = joinURL(options.remoteURL, filePath),
        fetchOptions = {
            method: "PUT",
            headers: headers,
            body: writeStream
        };
    fetch(fetchURL, fetchOptions);
    return writeStream;
}

function getFileStream(filePath, options) {
    var rangeHeader;
    if (typeof options.range === "object" && typeof options.range.start === "number") {
        rangeHeader = "bytes=" + options.range.start + "-";
        if (typeof options.range.end === "number") {
            rangeHeader += options.range.end;
        }
        options.headers.Range = rangeHeader;
    }
    var fetchURL = joinURL(options.remoteURL, filePath),
        fetchOptions = {
            method: "GET",
            headers: options.headers
        };
    return fetch(fetchURL, fetchOptions)
        .then(responseHandlers.handleResponseCode)
        .then(function __mapResultToStream(res) {
            return res.body;
        });
}

module.exports = {
    createReadStream,
    createWriteStream
};