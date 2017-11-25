require('dotenv').config()
require('./logger');

const Util = require('./util');

const multiplier = 60 * 1000;

var recordNames;
var localInterface = false;

function verifyConfigs() {
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
        process.env.INTERVAL = 60;
    }
    return errors;
}

function run() {
    console.log("Getting " + (localInterface ? "internal" : "external") + " IP...");
    Util.getIp(localInterface)
        .then((myIp) => {
            if (myIp) {
                console.log("IP: " + myIp);
                console.log("Finding domain \"" + process.env.DOMAIN_NAME + "\"");
                return [myIp, Util.findDomain(process.env.DOMAIN_NAME)];
            } else
                throw new Error("Unable to get " + (localInterface ? "internal" : "external") + " IP");
        }).spread((myIp, domain) => {
            if (domain) {
                console.log('Domain found');
                console.log('Finding DNS Record [' + recordNames.join(' | ') + '].' + domain.name + ' (Type: ' + process.env.RECORD_TYPE + ')');
                return [myIp, domain, Util.findDomainRecord(domain.name, process.env.RECORD_TYPE, recordNames, myIp)];
            } else {
                throw new Error("Unable to find domain");
            }
        }).spread((myIp, domain, dnsRecords) => {
            if (dnsRecords && dnsRecords.length > 0) {
                // recordNames.forEach(
                //     (recordName) => {
                //         var found = dnsRecords.filter((i) => i.name == recordName)[0];
                //         if (!found)
                //             console.log(recordName + '.' + domain.name + ' not found');
                //     }
                // );
                var promises = [];
                dnsRecords.forEach((dnsRecord) => {
                    if (dnsRecord.data != myIp) {
                        console.log('Updating ' + dnsRecord.name + '.' + domain.name + ' to ' + myIp);
                        promises.push(Util.updateDomainRecord(domain.name, dnsRecord.id, { data: myIp }));
                    } else {
                        console.log(dnsRecord.name + '.' + domain.name + ' doesn\'t need to be updated');
                    }
                });
                return [myIp, domain, dnsRecords, Promise.all(promises)];
            } else
                throw new Error("Unable to find DNS Record");
        }).spread((myIp, domain, dnsRecord, updateds) => {
            updateds.forEach((item) => {
                console.log('Updated ' + item.name + '.' + domain.name + ' => ' + item.data);
            });
            setTimeout(run, process.env.INTERVAL * multiplier);
        })
        .catch((e) => {
            console.error(e);
            setTimeout(run, process.env.INTERVAL * multiplier);
        });
}

var verifyConfigs = verifyConfigs();
if (verifyConfigs.length == 0) {
    recordNames = process.env.RECORD_NAME.split(',');
    console.log('Configs: ');
    console.log('\t- DO_API_KEY: ' + process.env.DO_API_KEY);
    console.log('\t- DOMAIN_NAME: ' + process.env.DOMAIN_NAME);
    console.log('\t- RECORD_NAME: ' + recordNames.join(','));
    console.log('\t- DOMAIN_TYPE: ' + process.env.RECORD_TYPE);
    console.log('\t- INTERVAL: ' + process.env.INTERVAL);
    if (process.env.LOCAL_INTERFACE) {
        console.log('\t- LOCAL_INTERFACE: ' + process.env.LOCAL_INTERFACE);
        if (Util.existsLocalInterface(process.env.LOCAL_INTERFACE))
            localInterface = true;
        else {
            console.error("Local interface " + process.env.LOCAL_INTERFACE + " not found.");
            process.exit(1);
        }
    }
    run();
} else {
    console.error("The following environment variables are missing:");
    verifyConfigs.forEach(function(element) {
        console.error("\t- " + element);
    });
    process.exit(1);
}