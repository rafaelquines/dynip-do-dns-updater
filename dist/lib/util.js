"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = __importStar(require("bluebird"));
const DigitalOcean = require("do-wrapper");
const os = require("os");
const publicIp = __importStar(require("public-ip"));
const logger = __importStar(require("./logger"));
class Util {
}
// IP Resources
Util.getIp = (localInterface) => {
    if (localInterface) {
        return Util.getInternalIp();
    }
    else {
        return Util.getExternalIp();
    }
};
Util.existsLocalInterface = (iface) => {
    const ifaces = os.networkInterfaces();
    let ret = false;
    Object.keys(ifaces).forEach((ifName) => {
        if (ifName === iface) {
            ret = true;
        }
    });
    return ret;
};
// DigitalOcean Resources
Util.listDomains = () => {
    const promise = new Bluebird.Promise((resolve, reject) => {
        Util.api.domainsGetAll({}, (err, response, body) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({ response, body });
            }
        });
    });
    return promise
        .then((data) => {
        return data.body.domains;
    });
};
Util.listDomainRecords = (domainName) => {
    const promise = new Bluebird.Promise((resolve, reject) => {
        Util.api.domainRecordsGetAll(domainName, {}, (err, response, body) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({ response, body });
            }
        });
    });
    return promise
        .then((data) => {
        return data.body.domain_records;
    });
};
Util.findDomain = (domainName) => {
    return Util.listDomains()
        .then((domains) => {
        if (domains && domains.length > 0) {
            return domains.filter((it) => it.name === domainName)[0];
        }
        else {
            return null;
        }
    });
};
Util.createRecord = (domainName, recordName, ip) => {
    logger.info("Creating DNS Record " + recordName + "." + domainName);
    const type = process.env.RECORD_TYPE;
    const promise = new Bluebird.Promise((resolve, reject) => {
        Util.api.domainRecordsCreate(domainName, {
            data: ip,
            name: recordName,
            ttl: 3600,
            type,
        }, (err, response, body) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({ response, body });
            }
        });
    });
    return promise;
};
Util.findDomainRecord = (domainName, type, names, myIp) => {
    return Util.listDomainRecords(domainName)
        .then((domainRecords) => {
        const promisesCreate = [];
        names.forEach((n) => {
            const found = domainRecords.filter((it) => it.type === type &&
                it.name === n).length > 0;
            if (!found) {
                promisesCreate.push(Util.createRecord(domainName, n, myIp));
            }
        });
        return [domainRecords, Bluebird.Promise.all(promisesCreate)];
    }).spread((domainRecords, creates) => {
        if (creates && creates.length > 0) {
            creates.forEach((item) => {
                domainRecords.push(item.body.domain_record);
            });
        }
        return domainRecords.filter((it) => it.type === type && names.indexOf(it.name) !== -1);
    });
};
Util.updateDomainRecord = (domainName, id, body) => {
    const promise = new Bluebird.Promise((resolve, reject) => {
        Util.api.domainRecordsUpdate(domainName, id, body, (err, response, json) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({ response, json });
            }
        });
    });
    return promise
        .then((res) => {
        return res.body.domain_record;
    });
};
Util.pageSize = 100;
Util.api = new DigitalOcean(process.env.DO_API_KEY, Util.pageSize);
Util.getExternalIp = () => {
    return Bluebird.Promise.resolve(publicIp.v4());
};
Util.getInternalIp = () => {
    const ifaces = os.networkInterfaces();
    let ip = null;
    Object.keys(ifaces).forEach((ifName) => {
        ifaces[ifName].forEach((iface) => {
            if ("IPv4" !== iface.family || iface.internal !== false) {
                return;
            }
            if (ifName === process.env.LOCAL_INTERFACE) {
                ip = iface.address;
            }
        });
    });
    if (ip) {
        return Bluebird.Promise.resolve(ip);
    }
    else {
        return Bluebird.Promise.reject("No Internal ip");
    }
};
exports.Util = Util;
