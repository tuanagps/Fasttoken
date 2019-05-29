
var Fasttoken = artifacts.require("Fasttoken");
var Distribution = artifacts.require("Distribution");
var FastChannel = artifacts.require("FastChannel");
var Casino = artifacts.require("Casino");

var fs = require('fs');


module.exports = async (deployer, network) => {

        try {
                let now = Date.now();
                let fromNow = 3600 * 1000; // Start distribution in 1 hour
                let startTime = (now + fromNow) / 1000;
                await deployer.deploy(Distribution, Math.floor(startTime));
                let token = await (await Distribution.at(Distribution.address)).ftn.call();
                let distribution = Distribution.address;
                //let token = '0xbF68D215270F012366F39f5F71C94D3eCf56216b';
                //let distribution = '0xd8e3C88CfC84e39D9AcEfeEa9d21061557387078';
                await deployer.deploy(Casino, token);

                console.log(`
  Distribution Contract address: ${ distribution }
  FASTTOKEN address: ${ token }
  FASTTOKEN SUCCESSFULLY DEPLOYED
  Casino address: ${ Casino.address }
                `);
  //Distribution starts in: ${ fromNow / 1000 / 60 } minutes
  //Local Time: ${ new Date(now + fromNow) }

                var addresses = { Distribution: distribution,
                                Fasttoken: token,
                                Casino: Casino.address };
                fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');

        } catch (err) {
                console.log(err);
        }
};
