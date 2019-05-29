
const BillionaireToys = artifacts.require("BillionaireToys");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('BillionaireToys', async (accounts) => {

        let BILLIONAIRETOYS;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/BillionaireToys.json'));
        let STATE = [];


        async function addBonuses() {

                await BILLIONAIRETOYS.addReelBonus(SLOT.bonus[0], SLOT.bonus[1], { from: OWNER });
        }

        async function addLines() {

                for (let i = 0; i < SLOT.lines.length; ++i) {
                        await BILLIONAIRETOYS.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (let i = 0; i < SLOT.wins.length; ++i) {
                        await BILLIONAIRETOYS.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReelsFreespin() {

                for (let i = 0; i < SLOT.reelsFreespin.length; ++i) {
                        await BILLIONAIRETOYS.addFreespinReel(SLOT.reelsFreespin[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (let i = 0; i < SLOT.reels.length; ++i) {
                        await BILLIONAIRETOYS.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        async function spinBonus(rand, multiplier, freeSpin, number) {

                        console.log("spinBonus(" + rand + "), " + (number + 1).toString());
                        rand = [rand, 0];
                        STATE = (await BILLIONAIRETOYS.doStep(STATE, [1, 3, 0, 0, 1], [], []))[1]; // Spin sha1
                        STATE = (await BILLIONAIRETOYS.doStep(STATE, [2, 3, 0, 0, 0], [], []))[1]; // Spin r2
                        STATE = (await BILLIONAIRETOYS.doStep(STATE, [3, 3, 0, 0, 0], rand, [0, 0]))[1]; // Spin r1
                        console.log("bonusSpin = ", STATE[5].toNumber(), STATE[7].toNumber())
                        assert.equal(multiplier, STATE[5].toNumber());
                        assert.equal(freeSpin, STATE[7].toNumber());
        }

        async function spin(bet, line, win, rand, cards, number) {

                try {
                        rand.push(0);
                        console.log("spin(" + bet.toString() + ", " + line.toString()
                                        + ", [" + rand.join() + "]) = "
                                        + win.toString() + ", " + (number + 1).toString());
                        console.log((await BILLIONAIRETOYS.getImageLine(rand, 0)).toString());
                        console.log((await BILLIONAIRETOYS.getImageLine(rand, 1)).toString());
                        console.log((await BILLIONAIRETOYS.getImageLine(rand, 2)).toString());
                        console.log((await BILLIONAIRETOYS.getImageLine(rand, 3)).toString());
                        console.log((await BILLIONAIRETOYS.getImageLine(rand, 4)).toString());
                        STATE = (await BILLIONAIRETOYS.doStep(STATE, [1, 1, bet, line, 0], [], []))[1]; // Spin sha1
                        STATE = (await BILLIONAIRETOYS.doStep(STATE, [2, 1, 0, 0, 0], [], []))[1]; // Spin r2
                        let dr = await BILLIONAIRETOYS.doStep(STATE, [3, 1, 0, 0, 0], rand, [0, 0, 0, 0, 0, 0]); // Spin r1
                        STATE = dr[1];
                        assert.equal(win, Number(dr[0].toString()));
                } catch (err) {
                        console.log(err);
                        throw new Error(JSON.stringify({error: err,
                                                number: number,
                                                cards: cards,
                                                spin: { bet: bet, line: line, rand: rand } }));
                }
        };

        before(async() => {

                BILLIONAIRETOYS = await BillionaireToys.new({ from: OWNER });
                await addReels();
                await addReelsFreespin();
                await addWins();
                await addLines();
                await addBonuses();
        });

        describe("BillionaireToys initial parameters", async function () {

                it("BillionaireToys - REELSCOUNT, WINSCOUNT, LINESCOUNT, wildCard, scatSymbol", async function () {

                        assert.equal(await BILLIONAIRETOYS.REELS_COUNT.call(), 5);
                        assert.equal(await BILLIONAIRETOYS.WINS_COUNT.call(), 12);
                        assert.equal(await BILLIONAIRETOYS.LINES_COUNT.call(), 20);
                        assert.equal(await BILLIONAIRETOYS.wildCard.call(), 1);
                        assert.equal(await BILLIONAIRETOYS.bonusSymbol.call(), 12);
                        assert.equal(await BILLIONAIRETOYS.imageSize.call(), 3);
                });
        });

        describe("BillionaireToys result of 1000 spins", async function () {

                it("1000 spins", async function () {

                        let data = JSON.parse(fs.readFileSync('test/out/BillionaireToys.out'));
                        let line = 0;
                        for (let i = 0; i < data.length; ++i) {
                                let l = 0 === line ? data[i].linesCount : line;
                                await spin(1, l, data[i].win, data[i].reelStops, data[i].cards, i);
                                let b = data[i].bonus;
                                if (b && ! b.started) {
                                        line = data[i].linesCount;
                                        ++i;
                                        let d = data[i].bonus;
                                        await spinBonus(d.stopIndex, d.result.multiplier, d.result.freeSpin, i);
                                } else if (! b || ! b.result.freeSpin || 0 === b.result.freeSpin) {
                                        line = 0;
                                }
                        }
                });
        });
});
