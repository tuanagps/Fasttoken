
var FlamingFruits = artifacts.require("FlamingFruits");

var fs = require('fs');


function writeIntoFile(network) {

        var addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.FlamingFruits = FlamingFruits.address;
        fs.writeFile('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        return;
        try {
                await deployer.deploy(FlamingFruits);
                writeIntoFile(network);
                await FlamingFruits.at(FlamingFruits.address);
        } catch (err) {
                console.log(err);
        }
};
