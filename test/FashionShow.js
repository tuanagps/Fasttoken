
const FashionShow = artifacts.require("FashionShow");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('FashionShow', async (accounts) => {

        let FASIONSHOW;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/FashionShow.json'));
        let NUMBER_OF_FREESPINS = 0;
        let BET = 0;
        let LINE = 0;


        async function addLines() {

                for (var i = 0; i < SLOT.lines.length; ++i) {
                        await FASIONSHOW.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (var i = 0; i < SLOT.wins.length; ++i) {
                        await FASIONSHOW.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (var i = 0; i < SLOT.reels.length; ++i) {
                        await FASIONSHOW.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        async function addReelsFreespin() {

                for (var i = 0; i < SLOT.reelsFreespin.length; ++i) {
                        await FASIONSHOW.addFreespinReel(SLOT.reelsFreespin[i], { from: OWNER });
                }
        }

        async function spin(bet, line, win, freespin, rand, cards, number) {

                try {
                        let result;
                        if (0 === NUMBER_OF_FREESPINS) {
                                console.log((number + 1).toString()
                                                + " spin(" + bet.toString() + ", "
                                                + line.toString() + ", ["
                                                + rand.join() + "]) = "
                                                + win.toString() + ", "
                                                + freespin.toString());
                                console.log(Web3.utils.toWei(bet.toString(), 'ether'), line, rand, NUMBER_OF_FREESPINS);
                                result = await FASIONSHOW.getSpinResult(
                                                Web3.utils.toWei(bet.toString(), 'ether'), line, rand, NUMBER_OF_FREESPINS);
                                BET = bet;
                                LINE = line;
                        } else {
                                console.log((number + 1).toString()
                                                + " spin(" + BET.toString() + ", "
                                                + LINE.toString() + ", ["
                                                + rand.join() + "]) = "
                                                + win.toString() + ", "
                                                + freespin.toString());
                                console.log(Web3.utils.toWei(BET.toString(), 'ether'), LINE, rand, NUMBER_OF_FREESPINS, '--------');
                                result = await FASIONSHOW.getSpinResult(
                                                Web3.utils.toWei(BET.toString(), 'ether'), LINE, rand, NUMBER_OF_FREESPINS);
                        }
                        if (0 < NUMBER_OF_FREESPINS) {
                                console.log((await FASIONSHOW.getFreespinImageLine(rand, 0)).toString());
                                console.log((await FASIONSHOW.getFreespinImageLine(rand, 1)).toString());
                                console.log((await FASIONSHOW.getFreespinImageLine(rand, 2)).toString());
                                console.log((await FASIONSHOW.getFreespinImageLine(rand, 3)).toString());
                                console.log((await FASIONSHOW.getFreespinImageLine(rand, 4)).toString());
                        } else {
                                console.log((await FASIONSHOW.getImageLine(rand, 0)).toString());
                                console.log((await FASIONSHOW.getImageLine(rand, 1)).toString());
                                console.log((await FASIONSHOW.getImageLine(rand, 2)).toString());
                                console.log((await FASIONSHOW.getImageLine(rand, 3)).toString());
                                console.log((await FASIONSHOW.getImageLine(rand, 4)).toString());
                        }
                        assert.equal(win, Number(Web3.utils.fromWei(result[0])));
                        assert.equal(freespin, Number(result[1]));
                        NUMBER_OF_FREESPINS = Number(result[1]);
                        //console.log(
                        //'gas cost -', await FASIONSHOW.getSpinResult.estimateGas(bet, line, rand, NUMBER_OF_FREESPINS));
                } catch (err) {
                        throw new Error(JSON.stringify({error: err,
                                                number: number,
                                                cards: cards,
                                                spin: { bet: bet, line: line, rand: rand } }));
                }
        };

        before(async() => {

                FASIONSHOW = await FashionShow.new({ from: OWNER });
                await addReels();
                await addReelsFreespin();
                await addWins();
                await addLines();
        });

        describe("FashionShow initial parameters", async function () {

                it("FashionShow - REELSCOUNT, REELS_FREESPIN, WINSCOUNT, LINESCOUNT, wildCard, bonusSymbol", async function () {

                        assert.equal((await FASIONSHOW.REELS_FS_COUNT.call()).toNumber(), 5);
                        assert.equal((await FASIONSHOW.REELS_COUNT.call()).toNumber(), 5);
                        assert.equal((await FASIONSHOW.WINS_COUNT.call()).toNumber(), 12);
                        assert.equal((await FASIONSHOW.LINES_COUNT.call()).toNumber(), 50);
                        assert.equal((await FASIONSHOW.wildCard.call()).toNumber(), 1);
                        assert.equal((await FASIONSHOW.bonusSymbol.call()).toNumber(), 12);
                        assert.equal((await FASIONSHOW.imageSize.call()).toNumber(), 3);
                });
        });

        describe("FashionShow result of 1000 spins", async function () {

                it("1000 spins", async function () {

                        let data = JSON.parse(fs.readFileSync('test/out/FashionShow.out'));
                        for (var i = 0; i < data.length; ++i) {
                                await spin(1, data[i].linesCount,
                                                data[i].win,
                                                data[i].freespin,
                                                data[i].reelStops,
                                                data[i].cards,
                                                i);
                        }
                });
        });
});
