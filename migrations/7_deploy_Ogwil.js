
var Ogwil = artifacts.require("Ogwil");

var fs = require('fs');


function writeIntoFile(network) {

        var addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.Ogwil = Ogwil.address;
        fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(Ogwil);
                writeIntoFile(network);
                await Ogwil.at(Ogwil.address);
        } catch (err) {
                console.log(err);
        }
};
