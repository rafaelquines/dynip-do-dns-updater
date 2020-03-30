"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const logger_1 = require("./lib/logger");
dotenv.config();
const util_1 = require("./lib/util");
const multiplier = 60 * 1000;
let recordNames;
let localInterface = false;
const verifyConfigs = () => {
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
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.logger.info("Getting " + (localInterface ? "internal" : "external") + " IP...");
        const myIp = yield util_1.Util.getIp(localInterface);
        if (myIp) {
            logger_1.logger.info("IP: " + myIp);
            logger_1.logger.info("Finding domain \"" + process.env.DOMAIN_NAME + "\"");
            const domain = yield util_1.Util.findDomain(process.env.DOMAIN_NAME);
            if (domain) {
                logger_1.logger.info("Domain found");
                logger_1.logger.info("Finding DNS Record [" + recordNames.join(" | ") + "]." + domain.name +
                    " (Type: " + process.env.RECORD_TYPE + ")");
                const dnsRecords = yield util_1.Util.findDomainRecord(domain.name, process.env.RECORD_TYPE, recordNames, myIp);
                if (dnsRecords && dnsRecords.length > 0) {
                    const promises = [];
                    dnsRecords.forEach((dnsRecord) => {
                        if (dnsRecord.data !== myIp) {
                            logger_1.logger.info("Updating " + dnsRecord.name + "." + domain.name + " to " + myIp);
                            promises.push(util_1.Util.updateDomainRecord(domain.name, dnsRecord.id, { data: myIp }));
                        }
                        else {
                            logger_1.logger.info(dnsRecord.name + "." + domain.name + " doesn\'t need to be updated");
                        }
                    });
                    const updateds = yield Promise.all(promises);
                    updateds.forEach((item) => {
                        logger_1.logger.info("Updated " + item.name + "." + domain.name + " => " + item.data);
                    });
                    // tslint:disable-next-line:radix
                    setTimeout(run, parseInt(process.env.INTERVAL) * multiplier);
                }
                else {
                    throw new Error("Unable to find DNS Record");
                }
            }
            else {
                throw new Error("Unable to find domain " + process.env.DOMAIN_NAME);
            }
        }
        else {
            throw new Error("Unable to get " + (localInterface ? "internal" : "external") + " IP");
        }
    }
    catch (e) {
        logger_1.logger.error(e);
        // tslint:disable-next-line:radix
        setTimeout(run, parseInt(process.env.INTERVAL) * multiplier);
    }
});
const configsRes = verifyConfigs();
if (configsRes.length === 0) {
    recordNames = process.env.RECORD_NAME.split(",");
    logger_1.logger.info("Configs: ");
    logger_1.logger.info("\t- DO_API_KEY: " + process.env.DO_API_KEY);
    logger_1.logger.info("\t- DOMAIN_NAME: " + process.env.DOMAIN_NAME);
    logger_1.logger.info("\t- RECORD_NAME: " + recordNames.join(","));
    logger_1.logger.info("\t- DOMAIN_TYPE: " + process.env.RECORD_TYPE);
    logger_1.logger.info("\t- INTERVAL: " + process.env.INTERVAL);
    if (process.env.LOCAL_INTERFACE) {
        logger_1.logger.info("\t- LOCAL_INTERFACE: " + process.env.LOCAL_INTERFACE);
        if (util_1.Util.existsLocalInterface(process.env.LOCAL_INTERFACE)) {
            localInterface = true;
        }
        else {
            logger_1.logger.error("Local interface " + process.env.LOCAL_INTERFACE + " not found.");
            process.exit(1);
        }
    }
    run();
}
else {
    logger_1.logger.error("The following environment variables are missing:");
    configsRes.forEach((element) => {
        logger_1.logger.error("\t- " + element);
    });
    process.exit(1);
}
