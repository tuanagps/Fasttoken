
var fs = require('fs');
var Web3 = require('web3');
var truffle = require('../truffle.js');
var web3 = new Web3();

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
        let name = 'HiLo';
        let dr = getContract(name, addresses[name]);
        hilo = JSON.parse(fs.readFileSync("./hilo/" + name + ".json"));
        await addWin(dr);

        await addToCasino(network, dr, name);
        console.log('---------------------------------------------------------------------------------------');
}

function getContract(name, address) {

        let abi = JSON.parse(fs.readFileSync("./build/contracts/" + name + ".json")).abi;
        return new web3.eth.Contract(abi, address);
}

async function addWin(dr) {

        console.log("Adding Wins ...");

        let l = await dr.methods.getWinArrays().call();
        l[0] = Object.values(l[0]);
        l[1] = Object.values(l[1]);
        if (0 === l[0].length) {
                let tr = await dr.methods.addWin(hilo.wins[0]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('win 0 - ', hilo.wins[0]);
                tr = await dr.methods.addWin(hilo.wins[1]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('win 1 - ', hilo.wins[1]);
        } else if (0 === l[1].length) {
                tr = await dr.methods.addWin(hilo.wins[1]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('win 1 - ', hilo.wins[1]);
        } else {
                console.log('Nothing to be added');
        }
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
