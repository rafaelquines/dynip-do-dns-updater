require('dotenv').config()
const Util = require('./util');
console.log("Getting public IP...");

setInterval(run, 10000);

function run() {
    Util.getMyIp()
        .then((myIp) => {
            if (myIp) {
                console.log("IP: " + myIp);
                console.log("Finding domain \"" + process.env.DOMAIN_NAME + "\"");
                Util.findDomain(process.env.DOMAIN_NAME)
                    .then((domain) => {
                        if (domain) {
                            console.log('Domain found');
                            console.log('Finding DNS Record "' + process.env.RECORD_NAME + '.' + domain.name + '" (Type: ' + process.env.RECORD_TYPE + ')');
                            Util.findDomainRecord(domain.name, process.env.RECORD_TYPE, process.env.RECORD_NAME)
                                .then((dnsRecord) => {
                                    if (dnsRecord) {
                                        console.log('DNS Record found');
                                        if (dnsRecord.data != myIp) {
                                            console.log('Updating DNS "' + dnsRecord.name + '.' + domain.name + '" to "' + myIp + '"');
                                            Util.updateDomainRecord(domain.name, dnsRecord.id, { data: myIp })
                                                .then((res) => {
                                                    if (res)
                                                        console.log("DNS record updated");
                                                    else
                                                        console.log("Unable to update DNS record");
                                                })
                                        } else
                                            console.log("Nothing to do. Update is not necessary.");
                                    } else
                                        console.log("Unable to find DNS Record");
                                });
                        } else
                            console.log("Unable to find domain");
                    })
            } else {
                console.log("Unable to get public IP");
            }
        });
}