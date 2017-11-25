const publicIp = require('public-ip');
var Promise = require("bluebird");
var DigitalOcean = require('do-wrapper');
var os = require('os');

var Util = Util || {};

Util.pageSize = 100;

Util.api = new DigitalOcean(process.env.DO_API_KEY, Util.pageSize);

Util.getIp = function(localInterface) {
    if (localInterface) {
        return Promise.resolve(Util.getInternalIp());
    } else {
        return Util.getExternalIp();
    }
}

Util.getExternalIp = function() {
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

Util.findDomainRecord = function(domainName, type, names, myIp) {
    return Promise.resolve(Util.listDomainRecords(domainName)
        .then((domainRecords) => {
            var promisesCreate = [];
            names.forEach((n) => {
                var found = domainRecords.filter((it) => it.type == type && it.name == n).length > 0;
                if (!found) {
                    promisesCreate.push(Util.createRecord(domainName, n, myIp));
                }
            });
            return [domainRecords, Promise.all(promisesCreate)];
        }).spread((domainRecords, creates) => {
            if (creates && creates.length > 0) {
                creates.forEach((item) => {
                    domainRecords.push(item.body.domain_record);
                });
            }
            return domainRecords.filter((it) => it.type == type && names.indexOf(it.name) != -1);
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

Util.existsLocalInterface = function(interface) {
    const ifaces = os.networkInterfaces();
    var ret = false;
    Object.keys(ifaces).forEach(function(ifName) {
        if (ifName == interface)
            ret = true;
    });
    return ret;
}

Util.getInternalIp = function() {
    const ifaces = os.networkInterfaces();
    var ip = null;
    Object.keys(ifaces).forEach(function(ifName) {
        ifaces[ifName].forEach(function(iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                return;
            }
            if (ifName == process.env.LOCAL_INTERFACE)
                ip = iface.address;
        });

    });
    return ip;
}

Util.createRecord = function(domain, recordName, ip) {
    console.log('Creating DNS Record ' + recordName + '.' + domain + '');
    const type = process.env.RECORD_TYPE;
    return Util.api.domainRecordsCreate(domain, {
        type: type,
        name: recordName,
        data: ip,
        ttl: 3600
    });
}

module.exports = Util;
