
var fs = require('fs');
var Web3 = require('web3');
var truffle = require('../truffle.js');
var web3 = new Web3();

var slot = null;
var transactionOptions = null;


exports.init = async function (network) {

        let host = truffle.networks[network].host;
        let port = truffle.networks[network].port;
        let from = truffle.networks[network].from;
        let gas = truffle.networks[network].gas;
        let gasPrice = truffle.networks[network].gasPrice;
        web3.setProvider(new web3.providers.HttpProvider('http://' + host + ':' + port.toString()));
        transactionOptions = { from: from, gas: gas, gasPrice: gasPrice };

        let addresses = require('../addresses/' + network + '.json');
        let dr = getContract(name, addresses[name]);

        await addToCasino(network, dr, name);
        console.log('---------------------------------------------------------------------------------------');
}

function getContract(name, address) {

        let abi = JSON.parse(fs.readFileSync("./build/contracts/" + name + ".json")).abi;
        return new web3.eth.Contract(abi, address);
}

async function addToCasino(network, dr, name) {

        console.log("Adding to Casino ...");
        let addresses = require('../addresses/' + network + '.json');
        let cs = getContract('Casino', addresses.Casino);
        if (0 == await cs.methods.gameAvailable(addresses[name]).call()) {
                let tr = await cs.methods.addGame(addresses[name]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('games - ', await cs.methods.getGames().call());
        } else {
                console.log('Already added');
                console.log('games - ', await cs.methods.getGames().call());
        }
}
