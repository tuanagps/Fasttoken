
var fs = require('fs');
var Web3 = require('web3');
var truffle = require('../truffle.js');
var web3 = new Web3();

var slot = null;
var transactionOptions = null;


exports.init = async function (network) {

        var host = truffle.networks[network].host;
        var port = truffle.networks[network].port;
        var from = truffle.networks[network].from;
        var gas = truffle.networks[network].gas;
        var gasPrice = truffle.networks[network].gasPrice;
        web3.setProvider(new web3.providers.HttpProvider('http://' + host + ':' + port.toString()));
        transactionOptions = { from: from, gas: gas, gasPrice: gasPrice };
        fs.readdir('slots/', (err, files) => {
                files.forEach(file => {
                        initSlot(network, file.split('.').slice(0, -1).join('.'));
                });
        })
}

async function initSlot(network, name) {

        slot = JSON.parse(fs.readFileSync("./slots/" + name + ".json"));

        var addresses = require('../addresses/' + network + '.json');
        var dr = getContract(name, addresses[name]);

        await addReels(dr);
        await addWins(dr);
        await addLines(dr);
        await addToCasino(network, dr, name);
}

function getContract(name, address) {

        var abi = JSON.parse(fs.readFileSync("./build/contracts/" + name + ".json")).abi;
        return new web3.eth.Contract(abi, address);
}

async function addReels(dr) {

        console.log("Adding Reels ...");
        let l = await dr.methods.getReelsLength().call();
        if (l > slot.reels.length) {
                throw new Error('Reels length is invalid in contract - ' + dr._address);
        }
        for (var i = 0; i < l; ++i) {
                let r = await dr.methods.getReelArray(i).call();
                r.forEach((e1, index) => {
                        if (+e1 !== +slot.reels[i][index]) {
                                throw new Error('Reel ' + i.toString() + ' is invalid in contract - ' + dr._address);
                        }
                });
        }
        if (i === slot.reels.length) {
                console.log('Nothing to be added');
        }
        for (; i < slot.reels.length; ++i) {
                let tr = await dr.methods.addReel(slot.reels[i]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('reel ' + i.toString() + '- ', (await dr.methods.getReelArray(i).call()).join(' '));
        }
}

async function addWins(dr) {

        console.log("Adding Wins ...");
        let l = await dr.methods.getWinsLength().call();
        if (l > slot.wins.length) {
                throw new Error('Wins length is invalid in contract - ' + dr._address);
        }
        for (var i = 0; i < l; ++i) {
                let r = await dr.methods.getWinArray(i).call();
                r.forEach((e1, index) => {
                        if (+e1 !== +slot.wins[i][index]) {
                                throw new Error('Win ' + i.toString() + ' is invalid in contract - ' + dr._address);
                        }
                });
        }
        if (i === slot.wins.length) {
                console.log('Nothing to be added');
        }

        for (; i < slot.wins.length; ++i) {
                let tr = await dr.methods.addWin(slot.wins[i]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('win ' + i.toString() + '- ', await dr.methods.getWinArray(i).call());
        }
}

async function addLines(dr) {

        console.log("Adding Lines ...");
        let l = await dr.methods.getLinesLength().call();
        if (l > slot.lines.length) {
                throw new Error('Lines length is invalid in contract - ' + dr._address);
        }
        for (var i = 0; i < l; ++i) {
                let r = await dr.methods.getLineArray(i).call();
                r.forEach((e1, index) => {
                        if (+e1 !== +slot.lines[i][index]) {
                                throw new Error('Line ' + i.toString() + ' is invalid in contract - ' + dr._address);
                        }
                });
        }
        if (i === slot.lines.length) {
                console.log('Nothing to be added');
        }

        for (; i < slot.lines.length; ++i) {
                let tr = await dr.methods.addLine(slot.lines[i]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('line ' + i.toString() + '- ', await dr.methods.getLineArray(i).call());
        }
}

async function addToCasino(network, dr, name) {

        console.log("Adding to Casino ...");
        var addresses = require('../addresses/' + network + '.json');
        var cs = getContract('Casino', addresses.Casino);
        if (0 == await cs.methods.gameAvailable(addresses[name]).call()) {
                let tr = await cs.methods.addGame(addresses[name]).send(transactionOptions);
                console.log('hash - ', tr.transactionHash);
                console.log('games - ', await cs.methods.getGames().call());
        } else {
                console.log('Already added');
                console.log('games - ', await cs.methods.getGames().call());
        }
}
