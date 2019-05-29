
var BillionaireToys = artifacts.require("BillionaireToys");

var fs = require('fs');


function writeIntoFile(network) {

        let addresses = JSON.parse(fs.readFileSync('addresses/' + network + '.json', 'utf8'));
        addresses.BillionaireToys = BillionaireToys.address;
        fs.writeFileSync('addresses/' + network + '.json', JSON.stringify(addresses, null, 2) , 'utf-8');
}

module.exports = async (deployer, network) => {

        try {
                await deployer.deploy(BillionaireToys);
                writeIntoFile(network);
                await BillionaireToys.at(BillionaireToys.address);
        } catch (err) {
                console.log(err);
        }
};
