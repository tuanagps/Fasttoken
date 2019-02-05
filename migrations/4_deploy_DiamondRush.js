
var DiamondRush = artifacts.require("DiamondRush");

var fs = require('fs');


function writeIntoFile(network) {

        var addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.DiamondRush = DiamondRush.address;
        fs.writeFile('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(DiamondRush);
                writeIntoFile(network);
                await DiamondRush.at(DiamondRush.address);
        } catch (err) {
                console.log(err);
        }
};
