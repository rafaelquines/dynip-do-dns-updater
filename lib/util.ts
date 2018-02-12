import { DomainRecord } from './../models/DomainRecord';
import { Domain } from './../models/Domain';
import DigitalOcean = require('do-wrapper');
import os = require('os');
import * as publicIp from 'public-ip';
import * as Bluebird from 'bluebird';
import * as logger from './logger';

export class Util {
    static pageSize: number = 100;
    static api: DigitalOcean = new DigitalOcean(<string>process.env.DO_API_KEY, Util.pageSize);

    // IP Resources

    static getIp = (localInterface: any) => {
        if (localInterface) {
            return Util.getInternalIp();
        } else {
            return Util.getExternalIp();
        }
    }

    static existsLocalInterface = (iface: string) => {
        const ifaces = os.networkInterfaces();
        var ret = false;
        Object.keys(ifaces).forEach(function (ifName) {
            if (ifName == iface)
                ret = true;
        });
        return ret;
    }

    static getExternalIp = () => {
        return Bluebird.Promise.resolve(publicIp.v4());
    }

    static getInternalIp = () => {
        const ifaces = os.networkInterfaces();
        var ip = null;
        Object.keys(ifaces).forEach(function (ifName) {
            ifaces[ifName].forEach(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    return;
                }
                if (ifName == process.env.LOCAL_INTERFACE)
                    ip = iface.address;
            });

        });
        if (ip) {
            return Bluebird.Promise.resolve(ip);
        } else {
            return Bluebird.Promise.reject('No Internal ip');
        }
    }

    //DigitalOcean Resources

    static listDomains = () => {
        let promise = new Bluebird.Promise((resolve, reject) => {
            Util.api.domainsGetAll({}, (err, response, body) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ response, body });
                }
            });
        });
        return promise
            .then((data: any) => {
                return data.body.domains;
            });
    }

    static listDomainRecords = (domainName: string) => {
        let promise = new Bluebird.Promise((resolve, reject) => {
            Util.api.domainRecordsGetAll(domainName, {}, (err, response, body) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ response, body });
                }
            });
        });
        return promise
            .then((data: any) => {
                return data.body.domain_records;
            });
    }

    static findDomain = (domainName: string) => {
        return Util.listDomains()
            .then((domains: Array<Domain>) => {
                if (domains && domains.length > 0)
                    return domains.filter((it: Domain) => it.name == domainName)[0];
                else
                    return null;
            });
    }

    static createRecord = function (domainName: string, recordName: string, ip: string) {
        logger.info('Creating DNS Record ' + recordName + '.' + domainName);
        const type = process.env.RECORD_TYPE;
        let promise = new Bluebird.Promise((resolve, reject) => {
            Util.api.domainRecordsCreate(domainName, {
                type: type,
                name: recordName,
                data: ip,
                ttl: 3600
            }, (err, response, body) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ response, body });
                }
            });
        });
        return promise;
    }

    static findDomainRecord = (domainName: string, type: string, names: Array<string>, myIp: string) => {
        return Util.listDomainRecords(domainName)
            .then((domainRecords: Array<DomainRecord>) => {
                let promisesCreate: Array<any> = [];
                names.forEach((n) => {
                    var found = domainRecords.filter((it: DomainRecord) => it.type == type && it.name == n).length > 0;
                    if (!found) {
                        promisesCreate.push(Util.createRecord(domainName, n, myIp));
                    }
                });
                return [domainRecords, Bluebird.Promise.all(promisesCreate)];
            }).spread((domainRecords, creates: Array<any>) => {
                if (creates && creates.length > 0) {
                    creates.forEach((item) => {
                        domainRecords.push(item.body.domain_record);
                    });
                }
                return domainRecords.filter((it) => it.type == type && names.indexOf(it.name) != -1);
            });
    }

    static updateDomainRecord = (domainName: string, id: number, body: any) => {
        let promise = new Bluebird.Promise((resolve, reject) => {
            Util.api.domainRecordsUpdate(domainName, id, body, (err, response, body) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ response, body });
                }
            });
        });
        return promise
            .then((res: any) => {
                return res.body.domain_record;
            });
    }
}