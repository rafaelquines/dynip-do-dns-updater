import * as dotenv from "dotenv";
import { logger } from "./lib/logger";
dotenv.config();
import { Util } from "./lib/util";
const multiplier = 60 * 1000;
let recordNames: string[];
let localInterface = false;

const verifyConfigs = (): string[] => {
    const errors = [];
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
        process.env.RECORD_TYPE = "A";
    }
    if (!process.env.INTERVAL) {
        process.env.INTERVAL = "60";
    }
    return errors;
};

const run = async () => {
    try {
        logger.info("Getting " + (localInterface ? "internal" : "external") + " IP...");
        const myIp = await Util.getIp(localInterface);
        if (myIp) {
            logger.info("IP: " + myIp);
            logger.info("Finding domain \"" + process.env.DOMAIN_NAME + "\"");
            const domain = await Util.findDomain(process.env.DOMAIN_NAME as string);
            if (domain) {
                logger.info("Domain found");
                logger.info("Finding DNS Record [" + recordNames.join(" | ") + "]." + domain.name +
                    " (Type: " + process.env.RECORD_TYPE + ")");
                const dnsRecords = await Util.findDomainRecord(domain.name, process.env.RECORD_TYPE as string,
                    recordNames, myIp);
                if (dnsRecords && dnsRecords.length > 0) {
                    const promises: any[] = [];
                    dnsRecords.forEach((dnsRecord) => {
                        if (dnsRecord.data !== myIp) {
                            logger.info("Updating " + dnsRecord.name + "." + domain.name + " to " + myIp);
                            promises.push(Util.updateDomainRecord(domain.name, dnsRecord.id, { data: myIp }));
                        } else {
                            logger.info(dnsRecord.name + "." + domain.name + " doesn\'t need to be updated");
                        }
                    });
                    const updateds = await Promise.all(promises);
                    updateds.forEach((item) => {
                        logger.info("Updated " + item.name + "." + domain.name + " => " + item.data);
                    });
                    // tslint:disable-next-line:radix
                    setTimeout(run, parseInt(process.env.INTERVAL as string) * multiplier);
                } else {
                    throw new Error("Unable to find DNS Record");
                }
            } else {
                throw new Error("Unable to find domain " + process.env.DOMAIN_NAME);
            }
        } else {
            throw new Error("Unable to get " + (localInterface ? "internal" : "external") + " IP");
        }
    } catch (e) {
        logger.error(e);
        // tslint:disable-next-line:radix
        setTimeout(run, parseInt(process.env.INTERVAL as string) * multiplier);
    }
};

const configsRes = verifyConfigs();
if (configsRes.length === 0) {
    recordNames = (process.env.RECORD_NAME as string).split(",");
    logger.info("Configs: ");
    logger.info("\t- DO_API_KEY: " + process.env.DO_API_KEY);
    logger.info("\t- DOMAIN_NAME: " + process.env.DOMAIN_NAME);
    logger.info("\t- RECORD_NAME: " + recordNames.join(","));
    logger.info("\t- DOMAIN_TYPE: " + process.env.RECORD_TYPE);
    logger.info("\t- INTERVAL: " + process.env.INTERVAL);
    if (process.env.LOCAL_INTERFACE) {
        logger.info("\t- LOCAL_INTERFACE: " + process.env.LOCAL_INTERFACE);
        if (Util.existsLocalInterface(process.env.LOCAL_INTERFACE as string)) {
            localInterface = true;
        } else {
            logger.error("Local interface " + process.env.LOCAL_INTERFACE + " not found.");
            process.exit(1);
        }
    }
    run();
} else {
    logger.error("The following environment variables are missing:");
    configsRes.forEach((element) => {
        logger.error("\t- " + element);
    });
    process.exit(1);
}
