
var FlamingFruits = artifacts.require("FlamingFruits");

var fs = require('fs');


function writeIntoFile(network) {

        let addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.FlamingFruits = FlamingFruits.address;
        fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(FlamingFruits);
                writeIntoFile(network);
                await FlamingFruits.at(FlamingFruits.address);
        } catch (err) {
                console.log(err);
        }
};
