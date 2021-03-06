
var FashionClub = artifacts.require("FashionClub");

var fs = require('fs');


function writeIntoFile(network) {

        let addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.FashionClub = FashionClub.address;
        fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(FashionClub);
                writeIntoFile(network);
                await FashionClub.at(FashionClub.address);
        } catch (err) {
                console.log(err);
        }
};
