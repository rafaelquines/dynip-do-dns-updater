import DigitalOcean from "do-wrapper";
import os = require("os");
import * as publicIp from "public-ip";
import { IDomain, IDomainRecord } from "./../models";
import { logger } from "./logger";

export class Util {
    /// IP Resources

    public static getIp = (localInterface: any) => {
        if (localInterface) {
            return Util.getInternalIp();
        } else {
            return Util.getExternalIp();
        }
    }

    public static existsLocalInterface = (iface: string) => {
        const ifaces = os.networkInterfaces();
        let ret = false;
        Object.keys(ifaces).forEach((ifName) => {
            if (ifName === iface) {
                ret = true;
            }
        });
        return ret;
    }

    // DigitalOcean Resources

    public static listDomains = () => {
        const promise = new Promise((resolve, reject) => {
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

    public static listDomainRecords = (domainName: string) => {
        const promise = new Promise((resolve, reject) => {
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

    public static findDomain = (domainName: string) => {
        return Util.listDomains()
            .then((domains: IDomain[]) => {
                if (domains && domains.length > 0) {
                    return domains.filter((it: IDomain) => it.name === domainName)[0];
                } else {
                    return null;
                }
            });
    }

    public static createRecord = (domainName: string, recordName: string, ip: string) => {
        logger.info("Creating DNS Record " + recordName + "." + domainName);
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
                } else {
                    resolve({ response, body });
                }
            });
        });
        return promise;
    }

    public static findDomainRecord = async (domainName: string, type: string, names: string[], myIp: string) => {
        const domainRecords = await Util.listDomainRecords(domainName) as IDomainRecord[];
        const promisesCreate: any[] = [];
        names.forEach((n) => {
            const found = domainRecords.filter((it: IDomainRecord) => it.type === type &&
                it.name === n).length > 0;
            if (!found) {
                promisesCreate.push(Util.createRecord(domainName, n, myIp));
            }
        });
        const creates = await Promise.all(promisesCreate);
        if (creates && creates.length > 0) {
            creates.forEach((item) => {
                domainRecords.push(item.body.domain_record);
            });
        }
        return domainRecords.filter((it) => it.type === type && names.indexOf(it.name) !== -1);
    }

    public static updateDomainRecord = (domainName: string, id: number, body: any) => {
        const promise = new Promise((resolve, reject) => {
            Util.api.domainRecordsUpdate(domainName, id, body, (err, response, json) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ response, json });
                }
            });
        });
        return promise
            .then((res: any) => {
                return res.json.domain_record;
            });
    }

    private static pageSize: number = 100;
    private static api: DigitalOcean = new DigitalOcean(process.env.DO_API_KEY as string, Util.pageSize);

    private static getExternalIp = () => {
        return Promise.resolve(publicIp.v4());
    }

    private static getInternalIp = () => {
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
        } else {
            return Promise.reject("No Internal ip");
        }
    }
}
