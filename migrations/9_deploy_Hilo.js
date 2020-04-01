
var HiLo = artifacts.require("HiLo");

var fs = require('fs');


function writeIntoFile(network) {

        let addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.HiLo = HiLo.address;
        fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(HiLo);
                writeIntoFile(network);
                await HiLo.at(HiLo.address);
        } catch (err) {
                console.log(err);
        }
};
