"use strict";

const setFetchMethod = require("./request.js").setFetchMethod;
const createClient = require("./factory.js").createClient;
const fetch = require("./ntlm.js").fetch;

createClient.ntlm = { fetch: fetch };
createClient.setFetchMethod = setFetchMethod;
module.exports = createClient;
