
const FlamingFruits = artifacts.require("FlamingFruits");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('FlamingFruits', async (accounts) => {

        let FLAMINGFRUITS;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/FlamingFruits.json'));


        async function addLines() {

                for (var i = 0; i < SLOT.lines.length; ++i) {
                        await FLAMINGFRUITS.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (var i = 0; i < SLOT.wins.length; ++i) {
                        await FLAMINGFRUITS.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (var i = 0; i < SLOT.reels.length; ++i) {
                        await FLAMINGFRUITS.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        async function spin(bet, line, win, rand, cards, number) {

                try {
                        console.log(bet, line, win, rand, cards, number);
                        console.log("spin(" + bet.toString() + ", " + line.toString()
                                                        + ", [" + rand.join() + "]) = "
                                                        + win.toString() + ", " + (number + 1).toString());
                        assert.equal(win, (await FLAMINGFRUITS.getSpinResult(bet, line, rand))[0].toNumber());
                        //console.log('gas cost -', await FLAMINGFRUITS.getSpinResult.estimateGas(bet, line, rand));
                } catch (err) {
                        throw new Error(JSON.stringify({error: err,
                                                        number: number,
                                                        cards: cards,
                                                        spin: { bet: bet, line: line, rand: rand } }));
                }
        };

        before(async() => {

                FLAMINGFRUITS = await FlamingFruits.new({ from: OWNER });
                await addReels();
                await addWins();
                await addLines();
        });

        describe("FlamingFruits initial parameters", async function () {

                it("FlamingFruits - REELSCOUNT, WINSCOUNT, LINESCOUNT, scatSymbol", async function () {

                        assert.equal(await FLAMINGFRUITS.REELS_COUNT.call(), 5);
                        assert.equal(await FLAMINGFRUITS.WINS_COUNT.call(), 12);
                        assert.equal(await FLAMINGFRUITS.LINES_COUNT.call(), 5);
                        assert.equal(await FLAMINGFRUITS.scatSymbol.call(), 11);
                        assert.equal(await FLAMINGFRUITS.imageSize.call(), 3);
                });
        });

        describe("FlamingFruits result of 1000 spins", async function () {

                it("1000 spins", async function () {

                        let data = JSON.parse(fs.readFileSync('test/out/FlamingFruits.out'));
                        for (var i = 0; i < data.length; ++i) {
                                await spin(1, data[i].linesCount, data[i].win, data[i].reelStops, data[i].cards, i);
                        }
                });
        });
});
