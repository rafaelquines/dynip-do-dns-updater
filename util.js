const publicIp = require('public-ip');
var Promise = require("bluebird");
var DigitalOcean = require('do-wrapper');

var Util = Util || {};

Util.api = new DigitalOcean(process.env.DO_API_KEY, Util.pageSize);

Util.pageSize = 100;

Util.getMyIp = function() {
    return Promise.resolve(publicIp.v4());
}

Util.listDomains = function() {
    return Promise.resolve(Util.api.domainsGetAll()
        .then((data) => {
            return data.body.domains;
        })
    );
}

Util.listDomainRecords = function(domainName) {
    return Promise.resolve(Util.api.domainRecordsGetAll(domainName)
        .then((data) => {
            return data.body.domain_records;
        })
    );
}

Util.findDomain = function(domainName) {
    return Promise.resolve(Util.listDomains()
        .then((domains) => {
            if (domains && domains.length > 0)
                return domains.filter((it) => it.name == domainName)[0];
            else
                return null;
        })
    );
}

Util.findDomainRecord = function(domainName, type, name) {
    return Promise.resolve(Util.listDomainRecords(domainName)
        .then((domainRecords) => {
            if (domainRecords && domainRecords.length > 0)
                return domainRecords.filter((it) => it.type == type && it.name == name)[0];
            else
                return null;
        })
    );
}

Util.updateDomainRecord = function(domainName, id, body) {
    return Promise.resolve(Util.api.domainRecordsUpdate(domainName, id, body)
        .then((res) => {
            return res.body.domain_record
        })
    );
}

module.exports = Util;