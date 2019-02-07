
var Fasttoken = artifacts.require("Fasttoken");
var Distribution = artifacts.require("Distribution");
var FastChannel = artifacts.require("FastChannel");
var Casino = artifacts.require("Casino");

var fs = require('fs');


module.exports = async (deployer, network) => {

        return;
        try {
                let now = Date.now();
                let fromNow = 3600 * 1000; // Start distribution in 1 hour
                let startTime = (now + fromNow) / 1000;
                await deployer.deploy(Distribution, Math.floor(startTime));
                let token = await (await Distribution.at(Distribution.address)).fst.call();
                await deployer.deploy(Casino, token);

                console.log(`
  FASTTOKEN SUCCESSFULLY DEPLOYED
  Distribution Contract address: ${ Distribution.address }
  FASTTOKEN address: ${ token }
  Casino address: ${ Casino.address }
  Distribution starts in: ${ fromNow / 1000 / 60 } minutes
  Local Time: ${ new Date(now + fromNow) }
                `);

                var addresses = { Distribution: Distribution.address,
                                Fasttoken: token,
                                Casino: Casino.address };
                fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');

        } catch (err) {
                console.log(err);
        }
};
