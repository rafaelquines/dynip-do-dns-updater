"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Util = void 0;
const do_wrapper_1 = __importDefault(require("do-wrapper"));
const os = require("os");
const publicIp = __importStar(require("public-ip"));
const logger_1 = require("./logger");
class Util {
}
exports.Util = Util;
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
    const promise = new Promise((resolve, reject) => {
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
    const promise = new Promise((resolve, reject) => {
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
    logger_1.logger.info("Creating DNS Record " + recordName + "." + domainName);
    const type = process.env.RECORD_TYPE;
    const promise = new Promise((resolve, reject) => {
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
Util.findDomainRecord = (domainName, type, names, myIp) => __awaiter(void 0, void 0, void 0, function* () {
    const domainRecords = yield Util.listDomainRecords(domainName);
    const promisesCreate = [];
    names.forEach((n) => {
        const found = domainRecords.filter((it) => it.type === type &&
            it.name === n).length > 0;
        if (!found) {
            promisesCreate.push(Util.createRecord(domainName, n, myIp));
        }
    });
    const creates = yield Promise.all(promisesCreate);
    if (creates && creates.length > 0) {
        creates.forEach((item) => {
            domainRecords.push(item.body.domain_record);
        });
    }
    return domainRecords.filter((it) => it.type === type && names.indexOf(it.name) !== -1);
});
Util.updateDomainRecord = (domainName, id, body) => {
    const promise = new Promise((resolve, reject) => {
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
        return res.json.domain_record;
    });
};
Util.pageSize = 100;
Util.api = new do_wrapper_1.default(process.env.DO_API_KEY, Util.pageSize);
Util.getExternalIp = () => {
    return Promise.resolve(publicIp.v4());
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
        return Promise.resolve(ip);
    }
    else {
        return Promise.reject("No Internal ip");
    }
};
