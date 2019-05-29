
const DiamondRush = artifacts.require("DiamondRush");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('DiamondRush', async (accounts) => {

        let DIAMONDRUSH;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/DiamondRush.json'));


        async function addLines() {

                for (var i = 0; i < SLOT.lines.length; ++i) {
                        await DIAMONDRUSH.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (var i = 0; i < SLOT.wins.length; ++i) {
                        await DIAMONDRUSH.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (var i = 0; i < SLOT.reels.length; ++i) {
                        await DIAMONDRUSH.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        async function spin(bet, line, win, rand, cards, number) {

                try {
                        console.log("spin(" + bet.toString() + ", " + line.toString()
                                        + ", [" + rand.join() + "]) = "
                                        + win.toString() + ", " + (number + 1).toString());
                        console.log((await DIAMONDRUSH.getImageLine(rand, 0)).toString());
                        console.log((await DIAMONDRUSH.getImageLine(rand, 1)).toString());
                        console.log((await DIAMONDRUSH.getImageLine(rand, 2)).toString());
                        console.log((await DIAMONDRUSH.getImageLine(rand, 3)).toString());
                        console.log((await DIAMONDRUSH.getImageLine(rand, 4)).toString());
                        let result = await DIAMONDRUSH.getSpinResult(bet.toString(), line, rand, 0);
                        assert.equal(win, Number(result[0]));
                        //console.log('gas cost -', await DIAMONDRUSH.getSpinResult.estimateGas(bet, line, rand));
                } catch (err) {
                        console.log(err);
                        throw new Error(JSON.stringify({error: err,
                                                number: number,
                                                cards: cards,
                                                spin: { bet: bet, line: line, rand: rand } }));
                }
        };

        before(async() => {

                DIAMONDRUSH = await DiamondRush.new({ from: OWNER });
                await addReels();
                await addWins();
                await addLines();
        });

        describe("DiamondRush initial parameters", async function () {

                it("DiamondRush - REELSCOUNT, WINSCOUNT, LINESCOUNT, wildCard, scatSymbol", async function () {

                        assert.equal(await DIAMONDRUSH.REELS_COUNT.call(), 5);
                        assert.equal(await DIAMONDRUSH.WINS_COUNT.call(), 12);
                        assert.equal(await DIAMONDRUSH.LINES_COUNT.call(), 5);
                        assert.equal(await DIAMONDRUSH.wildCard.call(), 1);
                        assert.equal(await DIAMONDRUSH.scatSymbol.call(), 11);
                        assert.equal(await DIAMONDRUSH.imageSize.call(), 3);
                });
        });

        describe("DiamondRush result of 1000 spins", async function () {

                it("1000 spins", async function () {

                        let data = JSON.parse(fs.readFileSync('test/out/DiamondRush.out'));
                        for (var i = 0; i < data.length; ++i) {
                                await spin(1, data[i].linesCount, data[i].win, data[i].reelStops, data[i].cards, i);
                        }
                });
        });
});
