import { DomainRecord } from './models/DomainRecord';
import * as logger from './lib/logger';
import { Promise } from 'bluebird';
import * as dotenv from 'dotenv';
dotenv.config();
import { Domain } from './models';
import { Util } from './lib/util';
const multiplier = 60 * 1000;
var recordNames: Array<string>;
var localInterface = false;

const verifyConfigs = (): Array<string> => {
    var errors = [];
    if (!process.env.DO_API_KEY) {
        errors.push("DO_API_KEY");
    }
    if (!process.env.DOMAIN_NAME) {
        errors.push("DOMAIN_NAME");
    }
    if (!process.env.RECORD_NAME) {
        errors.push("RECORD_NAME");
    }
    if (!process.env.RECORD_TYPE) {
        process.env.RECORD_TYPE = 'A';
    }
    if (!process.env.INTERVAL) {
        process.env.INTERVAL = '60';
    }
    return errors;
}

const run = () => {
    logger.info("Getting " + (localInterface ? "internal" : "external") + " IP...");
    Util.getIp(localInterface)
        .then((myIp) => {
            if (myIp) {
                logger.info("IP: " + myIp);
                logger.info("Finding domain \"" + process.env.DOMAIN_NAME + "\"");
                return [myIp, Util.findDomain(<string>process.env.DOMAIN_NAME)];
            } else
                throw new Error("Unable to get " + (localInterface ? "internal" : "external") + " IP");
        }).spread((myIp: string, domain: Domain) => {
            if (domain) {
                logger.info('Domain found');
                logger.info('Finding DNS Record [' + recordNames.join(' | ') + '].' + domain.name + ' (Type: ' + process.env.RECORD_TYPE + ')');
                return [myIp, domain, Util.findDomainRecord(domain.name, <string>process.env.RECORD_TYPE, recordNames, myIp)];
            } else {
                throw new Error("Unable to find domain");
            }
        }).spread((myIp: string, domain: Domain, dnsRecords: Array<DomainRecord>) => {
            if (dnsRecords && dnsRecords.length > 0) {
                const promises: Array<any> = [];
                dnsRecords.forEach((dnsRecord) => {
                    if (dnsRecord.data != myIp) {
                        logger.info('Updating ' + dnsRecord.name + '.' + domain.name + ' to ' + myIp);
                        promises.push(Util.updateDomainRecord(domain.name, dnsRecord.id, { data: myIp }));
                    } else {
                        logger.info(dnsRecord.name + '.' + domain.name + ' doesn\'t need to be updated');
                    }
                });
                return [myIp, domain, dnsRecords, Promise.all(promises)];
            } else
                throw new Error("Unable to find DNS Record");
        }).spread((myIp: string, domain: Domain, dnsRecord: Array<DomainRecord>, updateds: Array<DomainRecord>) => {
            updateds.forEach((item) => {
                logger.info('Updated ' + item.name + '.' + domain.name + ' => ' + item.data);
            });
            setTimeout(run, parseInt(<string>process.env.INTERVAL) * multiplier);
        })
        .catch((e) => {
            logger.error(e);
            setTimeout(run, parseInt(<string>process.env.INTERVAL) * multiplier);
        });
};

const configsRes = verifyConfigs();
if (configsRes.length == 0) {
    recordNames = (<string>process.env.RECORD_NAME).split(',');
    logger.info('Configs: ');
    logger.info('\t- DO_API_KEY: ' + process.env.DO_API_KEY);
    logger.info('\t- DOMAIN_NAME: ' + process.env.DOMAIN_NAME);
    logger.info('\t- RECORD_NAME: ' + recordNames.join(','));
    logger.info('\t- DOMAIN_TYPE: ' + process.env.RECORD_TYPE);
    logger.info('\t- INTERVAL: ' + process.env.INTERVAL);
    if (process.env.LOCAL_INTERFACE) {
        logger.info('\t- LOCAL_INTERFACE: ' + process.env.LOCAL_INTERFACE);
        if (Util.existsLocalInterface(<string>process.env.LOCAL_INTERFACE))
            localInterface = true;
        else {
            logger.error("Local interface " + process.env.LOCAL_INTERFACE + " not found.");
            process.exit(1);
        }
    }
    run();
} else {
    logger.error("The following environment variables are missing:");
    configsRes.forEach(function(element) {
        logger.error("\t- " + element);
    });
    process.exit(1);
}