
var FashionShow = artifacts.require("FashionShow");

var fs = require('fs');


function writeIntoFile(network) {

        let addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.FashionShow = FashionShow.address;
        fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(FashionShow);
                writeIntoFile(network);
                await FashionShow.at(FashionShow.address);
        } catch (err) {
                console.log(err);
        }
};
